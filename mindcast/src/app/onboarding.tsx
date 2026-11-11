import { router } from "expo-router";
import { useState } from "react";
import { Pressable, View } from "react-native";
import Animated from "react-native-reanimated";
import { pack, type Audience } from "@/domain";
import { CompanionSpeaker } from "@/features/companions/Companion";
import { useStore } from "@/state/store";
import { Body, BodyB, Button, Eyebrow, H1, Hand, Hero, Input, Screen, Small, tap, usePal } from "@/ui/kit";
import { useMotion } from "@/ui/motion";
import { Sketch } from "@/ui/sketch";
import { useTheme } from "@/ui/theme";
import { radius, space } from "@/ui/tokens";

const WHO: { v: Audience; t: string; d: string }[] = [
  { v: "explorer", t: "Explorer", d: "For children. Short, simple lessons with drawings and games. Great with a grown-up." },
  { v: "starter", t: "Starter", d: "Student, career changer or new to rail. How it works, in plain English." },
  { v: "leader", t: "Leader", d: "Working in or around the railway. A refresher, and what it teaches about delivering at scale." },
];

/** Three short bars showing where you are in setup. */
function Progress({ step }: { step: number }) {
  const { c } = useTheme();
  return (
    <View style={{ flexDirection: "row", gap: 6 }} accessible accessibilityLabel={`Step ${step} of 3`}>
      {[1, 2, 3].map((k) => <View key={k} style={{ flex: 1, height: 4, borderRadius: 2, backgroundColor: k <= step ? c.ink : c.line }} />)}
    </View>
  );
}

export default function Onboarding() {
  const { c } = useTheme(); const pal = usePal();
  const m = useMotion();
  const [step, setStep] = useState(0);
  const [who, setWho] = useState<Audience>("starter");
  const [name, setName] = useState("");
  const finish = () => {
    useStore.getState().set((s) => ({ onboarded: true, profile: { ...s.profile, name: name.trim(), audience: who } }));
    router.replace("/");
  };
  return (
    <Screen>
      {step === 0 && (
        <Animated.View key="s0" entering={m.rise()} style={{ gap: 18 }}>
          <Sketch w={360} h={220} pal={pal} deps={[c.ppe, c.accent]} accessibilityLabel="A train crossing a viaduct at sunrise" paint={(p) => {
            p.circle(290, 60, 70, c.pass, { strokeWidth: 1.5 });
            p.poly([[0, 170], [80, 110], [160, 170]], null, { stroke: c.soft, fillStyle: "hachure", fill: c.line, hachureGap: 8 });
            p.line(0, 150, 360, 150, { strokeWidth: 3 });
            for (let x = 10; x < 360; x += 50) p.path(`M${x} 220 L${x} 180 Q${x + 25} 156 ${x + 50} 180 L${x + 50} 220`, c.ppe, { fillStyle: "hachure", hachureGap: 6, strokeWidth: 1.6 });
            p.rect(0, 150, 360, 10, c.ppe, { strokeWidth: 1.4 });
            p.path("M120 148 L120 118 Q120 108 130 108 L210 108 Q232 110 240 148 Z", c.accent, { strokeWidth: 2 });
            p.rect(126, 116, 18, 12, c.surface, { strokeWidth: 1.2 }); p.rect(152, 116, 18, 12, c.surface, { strokeWidth: 1.2 }); p.rect(178, 116, 18, 12, c.surface, { strokeWidth: 1.2 });
            p.rect(120, 134, 118, 5, c.pass, { strokeWidth: 0.8 });
          }} />
          <Eyebrow>{pack.brand.name}</Eyebrow>
          <Hero>What the railway teaches, from the ground up.</Hero>
          <Body color={c.soft}>Learn how the railway really works, in plain words and drawings. Then carry what it teaches into how you work and lead. Free, for everyone.</Body>
          <Hand style={{ color: c.accent }}>{pack.brand.mission}</Hand>
          <Button label="Get started" kind="primary" onPress={() => setStep(1)} />
        </Animated.View>
      )}
      {step === 1 && (
        <Animated.View key="s1" entering={m.next()} style={{ gap: 14 }}>
          <Progress step={1} />
          <Eyebrow>Step 1 of 3</Eyebrow>
          <H1>Who's learning?</H1>
          <Small color={c.soft}>Every lesson comes at three depths. This sets where lessons start, and you can switch inside any lesson or on the You tab.</Small>
          {WHO.map((w) => {
            const on = who === w.v;
            return (
              <Pressable key={w.v} accessibilityRole="radio" accessibilityLabel={`${w.t}. ${w.d}`} accessibilityState={{ selected: on }} onPress={() => { tap(); setWho(w.v); }} style={({ pressed }) => ({ backgroundColor: pressed ? c.sunk : c.surface, borderWidth: on ? 2.5 : 1, borderColor: on ? c.ink : c.line, borderRadius: radius.l, padding: space.l, margin: on ? 0 : 1.5, gap: 4 })}>
                <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                  <BodyB style={{ fontSize: 19 }}>{w.t}</BodyB>
                  <View style={{ width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: on ? c.ink : c.line, alignItems: "center", justifyContent: "center" }}>{on && <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: c.ink }} />}</View>
                </View>
                <Small color={c.soft}>{w.d}</Small>
              </Pressable>
            );
          })}
          <Button label="Next" kind="primary" onPress={() => setStep(2)} />
          <Button label="Back" kind="ghost" onPress={() => setStep(0)} />
        </Animated.View>
      )}
      {step === 2 && (
        <Animated.View key="s2" entering={m.next()} style={{ gap: 14 }}>
          <Progress step={2} />
          <Eyebrow>Step 2 of 3</Eyebrow>
          <H1>What should we call you?</H1>
          <Small color={c.soft}>{who === "explorer" ? "Optional. A first name or a nickname is fine. It stays on this phone." : "Optional. It stays on this phone."}</Small>
          <Input accessibilityLabel="Your first name" value={name} onChangeText={setName} placeholder={who === "explorer" ? "First name or nickname" : "First name"} autoCapitalize="words" maxLength={30} returnKeyType="next" onSubmitEditing={() => setStep(3)} />
          <Button label="Next" kind="primary" onPress={() => setStep(3)} />
          <Button label="Back" kind="ghost" onPress={() => setStep(1)} />
        </Animated.View>
      )}
      {step === 3 && (
        <Animated.View key="s3" entering={m.next()} style={{ gap: 14 }}>
          <Progress step={3} />
          <Eyebrow>Step 3 of 3</Eyebrow>
          <H1>Meet your companion</H1>
          <Small color={c.soft}>Tap them. They know a thing or two, and they'll keep you company on the line.</Small>
          <CompanionSpeaker id="sleeper" size={110} first={pack.companions.find((x) => x.id === "sleeper")?.hello} />
          <View style={{ height: 8 }} />
          <Button label={name.trim() ? `Let's go, ${name.trim()}` : "Let's go"} kind="primary" haptic="success" onPress={finish} />
          <Button label="Back" kind="ghost" onPress={() => setStep(2)} />
        </Animated.View>
      )}
    </Screen>
  );
}
