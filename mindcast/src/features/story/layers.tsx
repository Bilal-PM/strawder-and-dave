/**
 * Layered living drawings: the piece that turns a rough.js sketch into an illustration that moves.
 *
 * How it works
 *  - Every scene draws its parts ONCE with the app's Painter (rough.js → plain SVG path data) through `useArt`.
 *    The result is memoised per scene, theme and size, and cached across mounts. Nothing rough is ever
 *    regenerated per frame.
 *  - Each part is rendered as its own `<Layer>`: an animated `<G>` whose transform (translate, rotate about a
 *    real pivot, scale) and opacity come from a pose worklet, `pose(t)`, fed by the scene's clocks.
 *  - `<DrawOn>` draws a part's strokes on with strokeDasharray/strokeDashoffset, one path after another.
 *  - `<MorphPath>` interpolates a hand-wobbled outline between two shapes (same number of points), for morphs.
 *
 * Platforms (verified on web; iOS by reading react-native-svg's Fabric props, see the hand-off notes)
 *  - iOS / Android: reanimated sends animated props straight to the native SVG views on the UI thread. The
 *    native `RNSVGGroup` takes its transform as `matrix` (6 numbers), not as `transform`, because the
 *    transform → matrix conversion normally happens in react-native-svg's JS render, which animated props
 *    skip. So on native the worklet returns `{ matrix, opacity }`.
 *  - Web: reanimated calls react-native-svg's `WebShape.setNativeProps`, which accepts `transform` as a
 *    6-number array and writes `transform="matrix(...)"`. So on web the worklet returns `{ transform, opacity }`.
 *  - Dash and opacity props have the same names on both.
 *
 * One clock per scene (`useSceneClocks`): a loop clock for idle life and a one-shot clock for the scene's
 * action, plus `x`, a shared value for whatever the learner drags. Pose worklets receive all three as plain
 * numbers, so the mapper subscribes to exactly those shared values.
 */
import React, { createContext, useContext, useMemo } from "react";
import { Platform } from "react-native";
import Animated, { useAnimatedProps, useSharedValue, type SharedValue } from "react-native-reanimated";
import Svg, { G, Path } from "react-native-svg";
import { Painter, renderNodes, type Node, type Pal } from "@/ui/sketch";
import { useTheme } from "@/ui/theme";
import type { Palette } from "@/ui/tokens";
import { seg, useLoopClock, useOneShotClock } from "./living";

const IS_WEB = Platform.OS === "web";

export const AG = Animated.createAnimatedComponent(G);
export const APath = Animated.createAnimatedComponent(Path);

/** The drawing's own coordinate system. Every scene draws in 360 × 420 units. */
export const VB = { w: 360, h: 420 } as const;

/* ---------- clocks ---------- */

export type Clocks = { loop: SharedValue<number>; shot: SharedValue<number>; x: SharedValue<number> };
/** What a pose worklet sees: loop time (ms), one-shot time (ms) and the interaction value. */
export type Tick = { loop: number; shot: number; x: number };

/**
 * The scene's clocks. The loop runs only while the scene is on screen and motion is allowed; the one-shot
 * plays once when the scene becomes active (or, with `play`, when the scene says so, e.g. after a guess)
 * and, with reduced motion, sits at its last frame.
 */
export function useSceneClocks(loopPeriod: number, shotDuration: number, active: boolean, reduced: boolean, x?: SharedValue<number>, play = true): Clocks {
  const loop = useLoopClock(loopPeriod, active && !reduced);
  // With reduced motion the one-shot sits at its last frame, but only once it is allowed to play.
  const shot = useOneShotClock(shotDuration, active && play, reduced && play);
  const own = useSharedValue(0);
  return useMemo(() => ({ loop, shot, x: x ?? own }), [loop, shot, x, own]);
}

/* ---------- poses ---------- */

/** A part's pose. x/y translate, r rotates (degrees) and s/sx/sy scale, all about the layer's pivot. o is opacity. */
export type Pose = { x?: number; y?: number; r?: number; s?: number; sx?: number; sy?: number; o?: number };
export type PoseFn = (t: Tick) => Pose;

/** The affine matrix [a b c d e f] for a pose about pivot (px, py). */
export function poseMatrix(p: Pose, px: number, py: number): number[] {
  "worklet";
  const rad = ((p.r ?? 0) * Math.PI) / 180;
  const s = p.s ?? 1;
  const sx = (p.sx ?? 1) * s;
  const sy = (p.sy ?? 1) * s;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const a = cos * sx;
  const b = sin * sx;
  const c = -sin * sy;
  const d = cos * sy;
  return [a, b, c, d, (p.x ?? 0) + px - (a * px + c * py), (p.y ?? 0) + py - (b * px + d * py)];
}

/** Clamp to 0..1 (worklet). */
export function clamp01(v: number) {
  "worklet";
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

type LayerProps = { c: Clocks; pose: PoseFn; pivot?: readonly [number, number]; nodes?: Node[]; children?: React.ReactNode };

/** One living part: a group moved by its pose worklet. Children can be further layers (follow-through). */
export function Layer({ c, pose, pivot, nodes, children }: LayerProps) {
  const px = pivot ? pivot[0] : 0;
  const py = pivot ? pivot[1] : 0;
  const { loop, shot, x } = c;
  const props = useAnimatedProps((): Record<string, unknown> => {
    const p = pose({ loop: loop.value, shot: shot.value, x: x.value });
    const m = poseMatrix(p, px, py);
    const o = p.o ?? 1;
    return IS_WEB ? { transform: m, opacity: o } : { matrix: m, opacity: o };
  });
  return (
    <AG animatedProps={props as never}>
      {nodes ? renderNodes(nodes) : null}
      {children}
    </AG>
  );
}

/* ---------- draw-on ---------- */

/**
 * An upper bound for the length of an absolute SVG path (M, L, C, Q, H, V, Z), from its control polygon.
 * Bézier curves are never longer than their control polygon, so the dash always covers the whole stroke.
 */
export function pathLength(d: string): number {
  const tok = d.match(/[MLCQHVZmlcqhvz]|-?\d*\.?\d+(?:e-?\d+)?/g) ?? [];
  let i = 0, cmd = "M", x = 0, y = 0, sx = 0, sy = 0, len = 0;
  const num = () => parseFloat(tok[i++]);
  while (i < tok.length) {
    if (/[A-Za-z]/.test(tok[i])) cmd = tok[i++].toUpperCase();
    if (cmd === "Z") { len += Math.hypot(sx - x, sy - y); x = sx; y = sy; continue; }
    if (i >= tok.length) break;
    if (cmd === "M") { x = num(); y = num(); sx = x; sy = y; cmd = "L"; continue; }
    if (cmd === "L") { const nx = num(), ny = num(); len += Math.hypot(nx - x, ny - y); x = nx; y = ny; continue; }
    if (cmd === "H") { const nx = num(); len += Math.abs(nx - x); x = nx; continue; }
    if (cmd === "V") { const ny = num(); len += Math.abs(ny - y); y = ny; continue; }
    if (cmd === "C") { const a = [num(), num(), num(), num(), num(), num()]; len += Math.hypot(a[0] - x, a[1] - y) + Math.hypot(a[2] - a[0], a[3] - a[1]) + Math.hypot(a[4] - a[2], a[5] - a[3]); x = a[4]; y = a[5]; continue; }
    if (cmd === "Q") { const a = [num(), num(), num(), num()]; len += Math.hypot(a[0] - x, a[1] - y) + Math.hypot(a[2] - a[0], a[3] - a[1]); x = a[2]; y = a[3]; continue; }
    i++; // unknown command: skip a token
  }
  return len;
}

type Piece =
  | { k: "line"; d: string; len: number; stroke: string; sw: number; idx: number }
  | { k: "fill"; d: string; fill: string; idx: number }
  | { k: "text"; node: Node };

/** Split a part into drawable pieces: each stroke subpath gets its own dash; fills fade in with their stroke. */
function piecesOf(nodes: Node[]): { pieces: Piece[]; n: number } {
  const pieces: Piece[] = [];
  let idx = 0;
  for (const nd of nodes) {
    if (nd.k === "p") {
      const strokeOn = nd.stroke && nd.stroke !== "none" && nd.sw > 0;
      if (!strokeOn) { pieces.push({ k: "fill", d: nd.d, fill: nd.fill, idx }); continue; }
      for (const sub of nd.d.split(/(?=M)/)) { if (sub.trim()) pieces.push({ k: "line", d: sub, len: pathLength(sub) + nd.sw + 2, stroke: nd.stroke, sw: nd.sw, idx }); }
      idx++;
    } else pieces.push({ k: "text", node: nd });
  }
  return { pieces, n: Math.max(1, idx) };
}

function DrawLine({ c, d, len, stroke, sw, a, b }: { c: Clocks; d: string; len: number; stroke: string; sw: number; a: number; b: number }) {
  const { shot } = c;
  const props = useAnimatedProps(() => {
    const p = seg(shot.value, a, b, "inOut");
    return { strokeDashoffset: len * (1 - p), opacity: p > 0.001 ? 1 : 0 };
  });
  return <APath d={d} stroke={stroke} strokeWidth={sw} fill="none" strokeLinecap="round" strokeLinejoin="round" strokeDasharray={[len, len]} animatedProps={props} />;
}

function FadeFill({ c, d, fill, a, b }: { c: Clocks; d: string; fill: string; a: number; b: number }) {
  const { shot } = c;
  const props = useAnimatedProps(() => ({ opacity: seg(shot.value, a, b) }));
  return <APath d={d} fill={fill} animatedProps={props} />;
}

function FadeText({ c, node, a, b }: { c: Clocks; node: Node; a: number; b: number }) {
  return <Layer c={c} nodes={[node]} pose={useMemo(() => (t: Tick) => { "worklet"; return { o: seg(t.shot, a, b) }; }, [a, b])} />;
}

/**
 * Draws a part on with the one-shot clock between `from` and `to` (ms). Shapes draw one after another, each
 * taking `share` of the window; the two strokes of a rough line draw together, like a pen going over twice.
 */
export function DrawOn({ c, nodes, from, to, share = 0.45 }: { c: Clocks; nodes: Node[]; from: number; to: number; share?: number }) {
  const { pieces, n } = useMemo(() => piecesOf(nodes), [nodes]);
  const span = to - from;
  const dur = n === 1 ? span : Math.max(span * share, span / n);
  const win = (i: number): [number, number] => {
    const a = from + (n === 1 ? 0 : ((span - dur) * i) / (n - 1));
    return [a, a + dur];
  };
  return (
    <G>
      {pieces.map((p, i) => {
        if (p.k === "line") { const [a, b] = win(p.idx); return <DrawLine key={i} c={c} d={p.d} len={p.len} stroke={p.stroke} sw={p.sw} a={a} b={b} />; }
        if (p.k === "fill") { const [a, b] = win(Math.min(p.idx, n - 1)); return <FadeFill key={i} c={c} d={p.d} fill={p.fill} a={a + (b - a) * 0.4} b={b} />; }
        return <FadeText key={i} c={c} node={p.node} a={to - 260} b={to} />;
      })}
    </G>
  );
}

/* ---------- morph ---------- */

export type Pt = readonly [number, number];

/** Points around a rectangle's outline (n per long side, m per short side), with a seeded hand wobble. */
export function rectOutline(x: number, y: number, w: number, h: number, n = 7, m = 2, wobble = 0.8, seed = 1): Pt[] {
  const pts: Pt[] = [];
  const j = (i: number) => (Math.sin(i * 12.9898 + seed * 78.233) * 43758.5453) % 1 * wobble;
  let k = 0;
  for (let i = 0; i < n; i++) pts.push([x + (w * i) / n, y + j(k++)]);
  for (let i = 0; i < m; i++) pts.push([x + w + j(k++), y + (h * i) / m]);
  for (let i = 0; i < n; i++) pts.push([x + w - (w * i) / n, y + h + j(k++)]);
  for (let i = 0; i < m; i++) pts.push([x + j(k++), y + h - (h * i) / m]);
  return pts;
}

/** A closed outline that morphs from `a` to `b` (same point count) over the one-shot window [from, to]. */
export function MorphPath({ c, a, b, from, to, stroke, sw, fill = "none", lift = 0 }: { c: Clocks; a: Pt[]; b: Pt[]; from: number; to: number; stroke: string; sw: number; fill?: string; lift?: number }) {
  const { shot } = c;
  const ax = useMemo(() => a.map((p) => p[0]), [a]);
  const ay = useMemo(() => a.map((p) => p[1]), [a]);
  const bx = useMemo(() => b.map((p) => p[0]), [b]);
  const by = useMemo(() => b.map((p) => p[1]), [b]);
  const props = useAnimatedProps(() => {
    const p = seg(shot.value, from, to, "inOut");
    // A gentle arc on the way: the shape lifts a little in the middle of its travel (never a straight slide).
    const arc = -lift * Math.sin(Math.PI * p);
    let d = "";
    for (let i = 0; i < ax.length; i++) {
      const px = ax[i] + (bx[i] - ax[i]) * p;
      const py = ay[i] + (by[i] - ay[i]) * p + arc;
      d += (i === 0 ? "M" : "L") + px.toFixed(2) + " " + py.toFixed(2);
    }
    return { d: d + "Z" };
  });
  return <APath stroke={stroke} strokeWidth={sw} fill={fill} strokeLinejoin="round" strokeLinecap="round" animatedProps={props} />;
}

/* ---------- art ---------- */

const artCache = new Map<string, unknown>();

/** Make a fresh Painter for one part (its own seed run, so parts don't shift when another part changes). */
export type MakePart = (paint: (p: Painter) => void) => Node[];

/**
 * Generate a scene's parts once. `build` gets `part(paint)` and returns a record of parts.
 * Cached by key and theme, so moving back to a scene costs nothing.
 */
export function useArt<T extends Record<string, Node[] | Node[][]>>(key: string, build: (part: MakePart, c: Palette, dark: boolean) => T): T {
  const { c, dark } = useTheme();
  const pal: Pal = useMemo(() => ({ ink: c.ink, paper: c.surface, glass: dark ? "#3E5566" : "#BFD9EA", soft: c.soft }), [c, dark]);
  const k = `${key}|${dark ? "d" : "l"}`;
  return useMemo(() => {
    const hit = artCache.get(k) as T | undefined;
    if (hit) return hit;
    let seed = 11;
    const part: MakePart = (paint) => { const p = new Painter(pal, (seed += 97)); paint(p); return p.nodes(); };
    const out = build(part, c, dark);
    artCache.set(k, out);
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [k]);
}

/** Static (non-moving) part. */
export function Still({ nodes }: { nodes: Node[] }) {
  return <G>{renderNodes(nodes)}</G>;
}

/* ---------- stage ---------- */

/** Where the drawing sits in the stage, in points: scale and offset of the 360 × 420 viewBox ("meet"). */
export type StageBox = { w: number; h: number; s: number; ox: number; oy: number };
export const StageCtx = createContext<StageBox>({ w: VB.w, h: VB.h, s: 1, ox: 0, oy: 0 });
export const useStage = () => useContext(StageCtx);
export function stageBox(w: number, h: number): StageBox {
  const s = Math.max(0.01, Math.min(w / VB.w, h / VB.h));
  return { w, h, s, ox: (w - VB.w * s) / 2, oy: (h - VB.h * s) / 2 };
}
/** A rectangle in drawing units → absolute style in stage points (for touch targets laid over the drawing). */
export function unitRect(b: StageBox, x: number, y: number, w: number, h: number, minPt = 44) {
  const W = Math.max(minPt, w * b.s), H = Math.max(minPt, h * b.s);
  const cx = b.ox + (x + w / 2) * b.s, cy = b.oy + (y + h / 2) * b.s;
  return { position: "absolute" as const, left: cx - W / 2, top: cy - H / 2, width: W, height: H };
}

/** The scene's SVG canvas: fills the stage, keeps the drawing's aspect, describes the drawing for screen readers. */
export function StageSvg({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <Svg viewBox={`0 0 ${VB.w} ${VB.h}`} width="100%" height="100%" preserveAspectRatio="xMidYMid meet" style={{ position: "absolute", left: 0, top: 0, right: 0, bottom: 0 }}
      accessible accessibilityRole="image" accessibilityLabel={label} {...(IS_WEB ? { role: "img", "aria-label": label } : {})}>
      {children}
    </Svg>
  );
}
