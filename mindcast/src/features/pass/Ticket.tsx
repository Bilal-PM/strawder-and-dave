/**
 * A paid option drawn as a railway ticket: a mono stub with the ticket type and the price, a dashed perforation with
 * semicircle notches cut from both sides, and a rough.js outline. Only for paid options: the free tier stays a plain
 * card so the two read differently. No barcodes or made-up numbers: the stub only says what the app already says.
 */
import React, { useState } from "react";
import { Text, View } from "react-native";
import Svg, { G, Line } from "react-native-svg";
import { usePal } from "@/ui/kit";
import { Painter, renderNodes } from "@/ui/sketch";
import { useTheme } from "@/ui/theme";
import { F, ON_FILL, space } from "@/ui/tokens";

const STUB = 70, NOTCH = 10, R = 12;

/** The ticket outline, clockwise, with a notch cut into each side at the stub line. */
function outline(w: number, h: number) {
  const s = STUB, n = NOTCH;
  return `M${R} 0 H${w - R} Q${w} 0 ${w} ${R} V${s - n} A${n} ${n} 0 0 0 ${w} ${s + n} V${h - R} Q${w} ${h} ${w - R} ${h} H${R} Q0 ${h} 0 ${h - R} V${s + n} A${n} ${n} 0 0 0 0 ${s - n} V${R} Q0 0 ${R} 0 Z`;
}
/** Just the stub, for its fill. */
function stub(w: number) {
  const s = STUB, n = NOTCH;
  return `M${R} 0 H${w - R} Q${w} 0 ${w} ${R} V${s - n} A${n} ${n} 0 0 0 ${w - n} ${s} H${n} A${n} ${n} 0 0 0 0 ${s - n} V${R} Q0 0 ${R} 0 Z`;
}

export type TicketProps = {
  /** e.g. "Adult · Season". Printed in mono capitals on the stub. */
  kind: string;
  name: string;
  /** The price as the app already states it, e.g. "£5". */
  price: string;
  /** e.g. "per season". */
  per?: string;
  items: readonly string[];
  /** The Season Pass: its stub is hi-vis yellow. */
  hero?: boolean;
};

export function Ticket({ kind, name, price, per, items, hero }: TicketProps) {
  const { c } = useTheme();
  const pal = usePal();
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);
  const stubInk = hero ? ON_FILL : c.ink;
  const stubSoft = hero ? ON_FILL : c.soft;

  let nodes: ReturnType<Painter["nodes"]> = [];
  if (size) {
    const p = new Painter(pal, name.length * 13 + 5);
    p.raw(outline(size.w - 2, size.h - 2), c.surface);
    if (hero) p.raw(stub(size.w - 2), c.pass);
    p.path(outline(size.w - 2, size.h - 2), null, { stroke: c.ink, strokeWidth: 1.6, roughness: 0.7, bowing: 0.6 });
    nodes = p.nodes();
  }

  return (
    <View accessible accessibilityLabel={`${name}, ${price}${per ? ` ${per}` : ""}. ${items.join(". ")}.`} onLayout={(e) => setSize({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}>
      {size && (
        <Svg width={size.w} height={size.h} style={{ position: "absolute", left: 0, top: 0 }} pointerEvents="none">
          {/* inset by 1pt so the rough stroke is not clipped */}
          <G transform="translate(1 1)">
            {renderNodes(nodes)}
            <Line x1={NOTCH + 6} y1={STUB} x2={size.w - 2 - NOTCH - 6} y2={STUB} stroke={hero ? c.ink : c.soft} strokeWidth={1.4} strokeDasharray="4 5" strokeLinecap="round" />
          </G>
        </Svg>
      )}
      <View style={{ height: STUB, flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: space.l + 4, gap: space.m }}>
        <View style={{ gap: 2, flexShrink: 1 }}>
          <Text style={{ fontFamily: F.mono, fontSize: 12, lineHeight: 16, letterSpacing: 1.4, textTransform: "uppercase", color: stubInk }}>{kind}</Text>
          <Text style={{ fontFamily: F.mono, fontSize: 10, lineHeight: 14, letterSpacing: 1.2, textTransform: "uppercase", color: stubSoft, opacity: hero ? 0.75 : 1 }}>Groundwork</Text>
        </View>
        <View style={{ alignItems: "flex-end", flexShrink: 0 }}>
          <Text style={{ fontFamily: F.display, fontSize: price.length > 3 ? 18 : 26, lineHeight: price.length > 3 ? 22 : 28, color: stubInk, fontVariant: ["tabular-nums"] }}>{price}</Text>
          {per ? <Text style={{ fontFamily: F.mono, fontSize: 10, lineHeight: 14, letterSpacing: 1.2, textTransform: "uppercase", color: stubSoft, opacity: hero ? 0.75 : 1 }}>{per}</Text> : null}
        </View>
      </View>
      <View style={{ paddingHorizontal: space.l + 4, paddingTop: space.m + 2, paddingBottom: space.l + 2, gap: space.s }}>
        <Text style={{ fontFamily: F.displaySemi, fontSize: 19, lineHeight: 24, color: c.ink }}>{name}</Text>
        {items.map((it) => <Text key={it} style={{ fontFamily: F.body, fontSize: 14, lineHeight: 20, color: c.soft }}>• {it}</Text>)}
      </View>
    </View>
  );
}
