import { router } from "expo-router";
import { useState } from "react";
import { Pressable, TextInput, View } from "react-native";
import Animated, { FadeInDown, FadeOut } from "react-native-reanimated";
import { pack, type Audience } from "@/domain";
import { CompanionSpeaker } from "@/features/companions/Companion";
import { useStore } from "@/state/store";
import { Body, BodyB, Button, Eyebrow, H1, Hand, Hero, Screen, Small, tap, usePal } from "@/ui/kit";
import { Sketch } from "@/ui/sketch";
import { useTheme } from "@/ui/theme";
import { F, radius } from "@/ui/tokens";

const WHO: { v: Audience; t: string; d: string }[] = [
  { v: "explorer", t: "Explorer", d: "Curious about trains. Stories, games and drawings. Great with a grown-up." },
  { v: "starter", t: "Starter", d: "Student, career changer or new to rail. How it works and how to get in." },
  { v: "leader", t: "Leader", d: "Working in or around the railway. What it teaches about delivering at scale." },
];

export default function Onboarding() {
  const { c } = useTheme(); const pal = usePal();
  const [step, setStep] = useState(0);
  const [who, setWho] = useState<Audience>("starter");
  const [name, setName] = useState("");
  const finish = () => {
    tap("success");
    useStore.getState().set((s) => ({ onboarded: true, profile: { ...s.profile, name: name.trim(), audience: who } }));
    router.replace("/");
  };
  return (
    <Screen>
      {step === 0 && (
        <Animated.View entering={FadeInDown.duration(500)} exiting={FadeOut} style={{ gap: 18 }}>
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
        <Animated.View entering={FadeInDown.duration(400)} style={{ gap: 14 }}>
          <Eyebrow>Step 1 of 3</Eyebrow>
          <H1>Who's learning?</H1>
          <Small color={c.soft}>Every lesson comes at three depths. You can switch any time.</Small>
          {WHO.map((w) => {
            const on = who === w.v;
            return (
              <Pressable key={w.v} accessibilityRole="radio" accessibilityState={{ selected: on }} onPress={() => { tap(); setWho(w.v); }} style={{ backgroundColor: c.surface, borderWidth: on ? 2.5 : 1, borderColor: on ? c.ink : c.line, borderRadius: radius.l, padding: 16, gap: 4 }}>
                <BodyB style={{ fontSize: 19 }}>{w.t}</BodyB>
                <Small color={c.soft}>{w.d}</Small>
              </Pressable>
            );
          })}
          <Button label="Next" kind="primary" onPress={() => setStep(2)} />
        </Animated.View>
      )}
      {step === 2 && (
        <Animated.View entering={FadeInDown.duration(400)} style={{ gap: 14 }}>
          <Eyebrow>Step 2 of 3</Eyebrow>
          <H1>What should we call you?</H1>
          <Small color={c.soft}>Optional. It stays on this phone.</Small>
          <TextInput accessibilityLabel="Your first name" value={name} onChangeText={setName} placeholder="First name" placeholderTextColor={c.soft} autoCapitalize="words" maxLength={30}
            style={{ fontFamily: F.body, fontSize: 18, color: c.ink, backgroundColor: c.surface, borderWidth: 1.5, borderColor: c.line, borderRadius: radius.m, padding: 14 }} />
          <Button label="Next" kind="primary" onPress={() => setStep(3)} />
          <Button label="Back" kind="ghost" onPress={() => setStep(1)} />
        </Animated.View>
      )}
      {step === 3 && (
        <Animated.View entering={FadeInDown.duration(400)} style={{ gap: 14 }}>
          <Eyebrow>Step 3 of 3</Eyebrow>
          <H1>Meet your companion</H1>
          <Small color={c.soft}>Tap them. They know a thing or two, and they'll keep you company on the line.</Small>
          <CompanionSpeaker id="sleeper" size={110} first={pack.companions.find((x) => x.id === "sleeper")?.hello} />
          <View style={{ height: 8 }} />
          <Button label={name ? `Let's go, ${name}` : "Let's go"} kind="primary" onPress={finish} />
        </Animated.View>
      )}
    </Screen>
  );
}
