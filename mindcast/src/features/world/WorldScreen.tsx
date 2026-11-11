/**
 * The Open Line: drive a train around a small illustrated railway and learn its rules by doing.
 */
import { router, useIsFocused } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import { ActivityIndicator, AppState, PanResponder, ScrollView, StyleSheet, Text, View } from "react-native";
import { useReducedMotion } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useStore } from "@/state/store";
import { Body, BodyB, Button, Card, Eyebrow, H1, H2, Row, Segmented, Small, Stat, tap } from "@/ui/kit";
import { useTheme } from "@/ui/theme";
import { F, space } from "@/ui/tokens";
import { GLCanvas } from "./canvas";
import { buildWorldData } from "./data";
import { BrakeBar, Lever, Panel, RoundButton, SignalPanel, SpeedPanel, StopPanel } from "./Hud";
import { glossaryText, momentFor, type Moment } from "./moments";
import { Scene, type CamCtl, type CamMode, type WorldData } from "./Scene";
import { ackAws, createSim, LINE_SPEED, MPH, snapshot, type Cond, type Sim, type Snapshot, type Tod, type Tone } from "./sim";

type Phase = "loading" | "intro" | "running" | "paused" | "ended";
type Toast = { id: number; text: string; tone: Tone; points?: number };

const POWER_LABELS = ["Off", "1", "2", "3", "4"];
const BRAKE_LABELS = ["Off", "1", "2", "Full", "Emerg"];
const COND_NOTE: Record<Cond, string> = {
  dry: "Dry rails, good grip.",
  leaves: "Autumn leaf fall. Grip is poor where trees line the track, so braking takes much longer.",
  hot: "A hot day. A 20 mph limit protects a stretch of track watched for buckling.",
};
const CAM_LABEL: Record<CamMode, string> = { chase: "Chase", cab: "Cab", drone: "Drone" };

export default function WorldScreen() {
  const { c } = useTheme();
  const ins = useSafeAreaInsets();
  const focused = useIsFocused();
  const sysReduce = useReducedMotion();
  const [reducePref, setReducePref] = useState<boolean | null>(null);
  const reduceMotion = reducePref ?? sysReduce;

  const [data, setData] = useState<WorldData | null>(null);
  const [phase, setPhase] = useState<Phase>("loading");
  const [tod, setTod] = useState<Tod>("day");
  const [cond, setCond] = useState<Cond>("dry");
  const [camMode, setCamMode] = useState<CamMode>("chase");
  const [hud, setHud] = useState<Snapshot | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [moments, setMoments] = useState<Moment[]>([]);
  const [appActive, setAppActive] = useState(true);
  const [power, setPower] = useState(0);
  const [brake, setBrake] = useState(2);

  const simRef = useRef<Sim | null>(null);
  const cam = useRef<CamCtl>({ mode: "drone", yaw: 0.8, pitch: 0.42, dist: 95 });
  const toastId = useRef(0);

  // Build the world after the first paint, so the screen appears at once.
  useEffect(() => {
    const id = setTimeout(() => {
      const d = buildWorldData();
      simRef.current = createSim(d.world, "dry");
      setData(d);
      setPhase("intro");
    }, 30);
    return () => clearTimeout(id);
  }, []);

  useEffect(() => {
    const sub = AppState.addEventListener("change", (s) => setAppActive(s === "active"));
    return () => sub.remove();
  }, []);

  // Leaving the screen pauses the run.
  useEffect(() => {
    if (!focused && phase === "running") setPhase("paused");
  }, [focused, phase]);
  useEffect(() => {
    if (!appActive && phase === "running") setPhase("paused");
  }, [appActive, phase]);

  useEffect(() => {
    cam.current.mode = phase === "intro" ? "drone" : camMode;
  }, [camMode, phase]);

  // Poll the sim for the HUD ten times a second, and drain its events.
  useEffect(() => {
    if (phase !== "running") return;
    const id = setInterval(() => {
      const sim = simRef.current;
      if (!sim) return;
      setHud(snapshot(sim));
      if (sim.events.length) {
        const evs = sim.events.splice(0);
        const newToasts: Toast[] = [];
        const newMoments: Moment[] = [];
        for (const e of evs) {
          if (e.kind === "toast") newToasts.push({ id: ++toastId.current, text: e.text, tone: e.tone, points: e.points });
          else if (e.kind === "moment") newMoments.push(momentFor(e.key));
          else tap(e.type);
        }
        if (newToasts.length) setToasts((t) => [...t, ...newToasts].slice(-3));
        if (newMoments.length) setMoments((m) => [...m, ...newMoments]);
      }
      if (sim.status !== "running") setPhase("ended");
    }, 100);
    return () => clearInterval(id);
  }, [phase]);

  // Toasts fade after a few seconds; learn cards after ten.
  useEffect(() => {
    if (!toasts.length) return;
    const id = setTimeout(() => setToasts((t) => t.slice(1)), 3600);
    return () => clearTimeout(id);
  }, [toasts]);
  const moment = moments[0];
  useEffect(() => {
    if (!moment || phase !== "running") return;
    const id = setTimeout(() => setMoments((m) => m.slice(1)), 10000);
    return () => clearTimeout(id);
  }, [moment, phase]);

  const setLever = (kind: "power" | "brake", v: number) => {
    const sim = simRef.current;
    if (!sim) return;
    if (kind === "power") { sim.player.power = v; setPower(v); }
    else { sim.player.brake = v; setBrake(v); }
  };

  const start = () => {
    if (!data) return;
    const sim = createSim(data.world, cond);
    sim.player.brake = 0;
    simRef.current = sim;
    setPower(0); setBrake(0);
    setToasts([]); setMoments([]);
    setHud(snapshot(sim));
    cam.current.mode = camMode;
    setPhase("running");
  };

  const banked = useRef(false);
  const bankMiles = () => {
    const sim = simRef.current;
    if (!sim || banked.current) return;
    banked.current = true;
    const miles = Math.floor(sim.player.odo / 1609.34);
    if (miles > 0) useStore.getState().set((s) => ({ progress: { ...s.progress, miles: s.progress.miles + miles } }));
  };
  const leave = () => {
    bankMiles();
    if (router.canGoBack()) router.back();
    else router.replace("/");
  };
  const openLesson = (id: string) => {
    if (phase === "running") setPhase("paused");
    router.push({ pathname: "/lesson/[id]", params: { id } });
  };

  // Drag to orbit in drone view; pinch to zoom.
  const pinch = useRef(0);
  const orbitPan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => cam.current.mode === "drone",
      onMoveShouldSetPanResponder: () => cam.current.mode === "drone",
      onPanResponderGrant: () => { pinch.current = 0; },
      onPanResponderMove: (e, g) => {
        const t = e.nativeEvent.touches;
        if (t && t.length >= 2) {
          const d = Math.hypot(t[0].pageX - t[1].pageX, t[0].pageY - t[1].pageY);
          if (pinch.current) cam.current.dist = Math.max(25, Math.min(420, cam.current.dist * (pinch.current / d)));
          pinch.current = d;
          return;
        }
        cam.current.yaw -= g.vx * 0.06;
        cam.current.pitch = Math.max(0.08, Math.min(1.35, cam.current.pitch + g.vy * 0.04));
      },
    })
  ).current;

  const frameloop = data && focused && appActive && (phase === "running" || phase === "intro") ? "always" : "never";
  const sim = simRef.current;

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      {data && (
        <GLCanvas frameloop={frameloop}>
          <Scene data={data} simRef={simRef} running={phase === "running"} tod={tod} cond={cond} cam={cam} reduceMotion={reduceMotion} orbit={phase === "intro"} />
        </GLCanvas>
      )}
      <View style={StyleSheet.absoluteFill} {...orbitPan.panHandlers} accessible={false} />

      {phase === "loading" && (
        <View style={[StyleSheet.absoluteFill, { alignItems: "center", justifyContent: "center", gap: 12 }]}>
          <ActivityIndicator color={c.ink} />
          <Small color={c.soft}>Building the line</Small>
        </View>
      )}

      {(phase === "running" || phase === "paused" || phase === "ended") && hud && (
        <View pointerEvents="box-none" style={[StyleSheet.absoluteFill, { paddingTop: ins.top + 6, paddingBottom: ins.bottom + 8, paddingHorizontal: space.m, justifyContent: "space-between" }]}>
          <View pointerEvents="box-none" style={{ gap: 8 }}>
            <Row>
              <RoundButton label="Leave The Open Line" onPress={leave}><Text style={{ fontSize: 20, color: c.ink }}>×</Text></RoundButton>
              <View style={{ flex: 1, alignItems: "center" }}>
                <View accessible accessibilityLabel={`Score ${hud.score}`} style={{ backgroundColor: c.ink, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 6 }}>
                  <Text style={{ fontFamily: F.display, fontSize: 18, color: c.bg, fontVariant: ["tabular-nums"] }}>{hud.score}</Text>
                </View>
              </View>
              <RoundButton label={`Camera: ${CAM_LABEL[camMode]}. Tap to change.`} onPress={() => setCamMode((m) => (m === "chase" ? "cab" : m === "cab" ? "drone" : "chase"))}>
                <Text style={{ fontFamily: F.bodySemi, fontSize: 14, color: c.ink }}>{CAM_LABEL[camMode]}</Text>
              </RoundButton>
              <RoundButton label="Pause" onPress={() => setPhase("paused")}>
                <Text style={{ fontFamily: F.display, fontSize: 16, color: c.ink }}>II</Text>
              </RoundButton>
            </Row>
            <Row gap={6} style={{ alignItems: "stretch" }}>
              <SpeedPanel s={hud} />
              <StopPanel s={hud} />
              <SignalPanel s={hud} />
            </Row>
            <View pointerEvents="none" accessibilityLiveRegion="polite" style={{ alignItems: "center", gap: 4 }}>
              {toasts.map((t) => (
                <View key={t.id} style={{ backgroundColor: t.tone === "warn" ? c.warn : t.tone === "good" ? c.good : c.ink, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6, maxWidth: "100%" }}>
                  <Text style={{ fontFamily: F.bodySemi, fontSize: 13, color: "#FFFFFF" }}>{t.text}{t.points ? `  ${t.points > 0 ? "+" : ""}${t.points}` : ""}</Text>
                </View>
              ))}
            </View>
            {moment && phase === "running" && (
              <Card style={{ borderWidth: 1.5, borderColor: c.ink }}>
                <View accessibilityLiveRegion="polite" style={{ gap: 6 }}>
                  <Eyebrow color={c.accent}>{moment.title}</Eyebrow>
                  <Body>{moment.text}</Body>
                  <Row gap={8}>
                    {moment.lessonId && <Button small kind="primary" label="Go to the lesson" onPress={() => openLesson(moment.lessonId!)} />}
                    <Button small kind="ghost" label="Got it" onPress={() => setMoments((m) => m.slice(1))} />
                  </Row>
                </View>
              </Card>
            )}
          </View>

          <View pointerEvents="box-none" style={{ gap: 8 }}>
            <BrakeBar s={hud} />
            <Row style={{ justifyContent: "space-between", alignItems: "flex-end" }}>
              <Lever label="Brake" value={brake} labels={BRAKE_LABELS} tone="#E8611A" onChange={(v) => setLever("brake", v)} height={150} />
              <View pointerEvents="box-none" style={{ flex: 1, alignItems: "center", gap: 6, paddingBottom: 8 }}>
                {hud.aws.active && (
                  <Button kind="pass" label="Acknowledge warning" accessibilityLabel="Acknowledge the caution warning" onPress={() => { if (simRef.current) ackAws(simRef.current); }} />
                )}
                {hud.awsBrake && <StatusChip text="Brakes applied" color={c.warn} />}
                {hud.slip && <StatusChip text="Wheelslip" color={c.ppe} />}
                {hud.slide && <StatusChip text="Wheels sliding" color={c.ppe} />}
                {hud.lowGrip && <StatusChip text="Low grip" color={c.ppe} />}
                {power > 0 && brake > 0 && <StatusChip text="Power cut while braking" color={c.soft} />}
              </View>
              <Lever label="Power" value={power} labels={POWER_LABELS} tone="#2B59C3" onChange={(v) => setLever("power", v)} height={150} />
            </Row>
          </View>
        </View>
      )}

      {phase === "intro" && (
        <IntroOverlay miles={data ? data.world.L / 1609.34 : 3} tod={tod} setTod={setTod} cond={cond} setCond={(v) => { setCond(v); if (simRef.current) simRef.current.cond = v; }} onStart={start} onBack={leave} />
      )}

      {phase === "paused" && sim && (
        <Overlay>
          <Eyebrow>The Open Line</Eyebrow>
          <H2>Paused</H2>
          <Row gap={8}>
            <Stat value={Math.round(sim.score)} label="Score" />
            <Stat value={sim.stats.stops} label="Stops" />
            <Stat value={sim.stats.reds} label="Reds held" />
          </Row>
          <Segmented label="Camera" value={camMode} onChange={setCamMode} options={[{ value: "chase", label: "Chase" }, { value: "cab", label: "Cab" }, { value: "drone", label: "Drone" }]} />
          <Segmented label="Reduce motion" value={reduceMotion ? "on" : "off"} onChange={(v) => setReducePref(v === "on")} options={[{ value: "off", label: "Motion on" }, { value: "on", label: "Reduce motion" }]} />
          <Small color={c.soft}>Reduce motion stops the cab view swaying and the intro camera turning.</Small>
          <Button kind="primary" label="Resume" onPress={() => setPhase("running")} />
          <Row gap={8}>
            <Button label="Start again" style={{ flex: 1 }} onPress={() => setPhase("intro")} />
            <Button label="Leave" style={{ flex: 1 }} onPress={leave} />
          </Row>
        </Overlay>
      )}

      {phase === "ended" && sim && (
        <Overlay>
          <Eyebrow color={c.warn}>Run ended</Eyebrow>
          <H2>{sim.spad ? `Signal ${sim.spad.label} passed at red` : "Run ended"}</H2>
          {sim.spad && (
            <>
              <Body>{momentFor("spad").text}</Body>
              {glossaryText("TPWS") && <Small color={c.soft}>{glossaryText("TPWS")}</Small>}
              <Body>You were doing {sim.spad.speedMph} mph. Next time, start braking at the first yellow and keep the yellow marker short of the signal.</Body>
            </>
          )}
          <Row gap={8}>
            <Stat value={Math.round(sim.score)} label="Score" />
            <Stat value={sim.stats.stops} label="Stops" />
            <Stat value={(sim.player.odo / 1609.34).toFixed(1)} label="Miles" />
          </Row>
          <Button kind="primary" label="Drive again" onPress={() => setPhase("intro")} />
          <Button label="Leave" onPress={leave} />
        </Overlay>
      )}
    </View>
  );
}

function StatusChip({ text, color }: { text: string; color: string }) {
  return (
    <View style={{ backgroundColor: color, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 }}>
      <Text style={{ fontFamily: F.bodySemi, fontSize: 12, color: "#FFFFFF" }}>{text}</Text>
    </View>
  );
}

function Overlay({ children }: { children: React.ReactNode }) {
  const { c, dark } = useTheme();
  const ins = useSafeAreaInsets();
  return (
    <View style={[StyleSheet.absoluteFill, { backgroundColor: dark ? "rgba(18,21,25,0.72)" : "rgba(246,245,241,0.72)" }]}>
      <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: "center", padding: space.l, paddingTop: ins.top + space.l, paddingBottom: ins.bottom + space.l }}>
        <Card style={{ gap: space.m, borderWidth: 1.5, borderColor: c.ink, maxWidth: 520, width: "100%", alignSelf: "center" }}>{children}</Card>
      </ScrollView>
    </View>
  );
}

function IntroOverlay({ miles, tod, setTod, cond, setCond, onStart, onBack }: { miles: number; tod: Tod; setTod: (t: Tod) => void; cond: Cond; setCond: (c: Cond) => void; onStart: () => void; onBack: () => void }) {
  const { c } = useTheme();
  const rows = [
    ["Power and brake", "Right thumb for power, left thumb for the brake. Applying the brake cuts the power."],
    ["Signals", "Green: clear. Double yellow: be ready. Single yellow: brake now. Red: stop before it."],
    ["The yellow marker", "It shows where you would stop if you braked now. Keep it short of reds and stop markers."],
    ["Stations", "Stop with the front of the train at each stop marker. The closer, the better."],
  ];
  return (
    <Overlay>
      <Eyebrow color={c.accent}>The Open Line</Eyebrow>
      <H1>Drive the loop</H1>
      <Body color={c.soft}>Take a three-car train round the line, call at every station and obey the signals. A train runs ahead of you, so expect yellows and reds.</Body>
      <View style={{ gap: 10 }}>
        {rows.map(([h, t]) => (
          <View key={h} style={{ gap: 2 }}>
            <BodyB>{h}</BodyB>
            <Small color={c.soft}>{t}</Small>
          </View>
        ))}
      </View>
      <Panel style={{ gap: 8, borderWidth: 1, borderColor: c.line }}>
        <Text style={{ fontFamily: F.mono, fontSize: 11, letterSpacing: 1, color: c.soft }}>TIME OF DAY</Text>
        <Segmented label="Time of day" value={tod} onChange={setTod} options={[{ value: "morning", label: "Morning" }, { value: "day", label: "Day" }, { value: "dusk", label: "Dusk" }]} />
        <Text style={{ fontFamily: F.mono, fontSize: 11, letterSpacing: 1, color: c.soft, marginTop: 4 }}>CONDITIONS</Text>
        <Segmented label="Conditions" value={cond} onChange={setCond} options={[{ value: "dry", label: "Dry" }, { value: "leaves", label: "Wet leaves" }, { value: "hot", label: "Hot" }]} />
        <Small color={c.soft}>{COND_NOTE[cond]}</Small>
      </Panel>
      <Button kind="primary" label="Start driving" onPress={onStart} />
      <Button kind="ghost" label="Back" onPress={onBack} />
      <Small color={c.soft} center>{`Line speed ${Math.round(LINE_SPEED / MPH)} mph. About ${miles.toFixed(1)} miles round.`}</Small>
    </Overlay>
  );
}
