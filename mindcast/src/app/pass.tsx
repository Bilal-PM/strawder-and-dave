import { router } from "expo-router";
import { useState } from "react";
import { View } from "react-native";
import Animated from "react-native-reanimated";
import { useStore } from "@/state/store";
import { Body, BodyB, Button, Card, Chip, Enter, Eyebrow, H1, H3, Input, Row, Screen, Small } from "@/ui/kit";
import { useMotion } from "@/ui/motion";
import { useTheme } from "@/ui/theme";

const TIERS = [
  { name: "Free, always", price: "£0", tone: "good", items: ["Every lesson, Mindcast and field note", "Free rewards on every season line", "Basic crew kit and the station cat", "Departure board, weather and one Loop"] },
  { name: "Single ticket", price: "£1 per item", tone: "accent", items: ["One piece of kit, one companion or one ticket design", "Yours to keep, no subscription"] },
  { name: "Season Pass", price: "£5 per season", tone: "pass", items: ["A Season Pass reward at every stop", "Unlimited loops with full history", "Ticket designs and your season certificate", "Finish the line to earn credit for next season"] },
  { name: "Crew Pass", price: "For teams", tone: "accent", items: ["The Season Pass for a whole team", "A team board for onboarding new joiners", "Progress for managers"] },
  { name: "Sponsor a learner", price: "For companies", tone: "ppe", items: ["Gift passes to apprentices and schools", "A reach report for social value bids"] },
] as const;

export default function Pass() {
  const { c } = useTheme();
  const m = useMotion();
  const pass = useStore((s) => s.pass);
  const [email, setEmail] = useState("");
  const [joined, setJoined] = useState(pass.founding);
  const preview = () => { useStore.getState().set((s) => ({ pass: { ...s.pass, preview: !s.pass.preview } })); };
  return (
    <Screen>
      <Row style={{ justifyContent: "space-between" }}><Eyebrow>Season Pass</Eyebrow><Button label="Close" kind="ghost" small onPress={() => router.back()} /></Row>
      <H1>The knowledge is free. The extras are yours.</H1>
      <Body color={c.soft}>Lessons, Mindcasts and safety content are never behind a paywall. Paid options are for kit, companions, tools and tickets that help you act on what you learn.</Body>
      {TIERS.map((t, i) => (
        <Enter key={t.name} i={i}>
          <Card tone={t.tone === "pass" ? "pass" : undefined}>
            <Row style={{ justifyContent: "space-between" }}><H3>{t.name}</H3><BodyB>{t.price}</BodyB></Row>
            {t.items.map((it) => <Small key={it} color={c.soft}>• {it}</Small>)}
          </Card>
        </Enter>
      ))}
      <Card tone="sunk">
        <Chip label="Founding list" color={c.ppe} />
        <BodyB>Payments open later. Join the founding list for the first 100 Season Passes at a founding price.</BodyB>
        {joined ? <Animated.View entering={m.fade()}><Small color={c.good}>{"✓ You're on the list. We'll only email you about the Season Pass."}</Small></Animated.View> : (
          <View style={{ gap: 8 }}>
            <Input accessibilityLabel="Email address" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" autoComplete="email" placeholder="you@example.com" />
            <Button label="Join the founding list" kind="pass" haptic="success" disabled={!/^\S+@\S+\.\S+$/.test(email)} onPress={() => { setJoined(true); useStore.getState().set((s) => ({ pass: { ...s.pass, founding: true, taps: s.pass.taps + 1 } })); }} />
            <Small color={c.soft}>Prototype: your email is kept on this phone only until the list goes live.</Small>
          </View>
        )}
      </Card>
      <View style={{ gap: 6 }}>
        <Button label={pass.preview ? "Stop previewing the Season Pass" : "Preview the app with a Season Pass"} onPress={preview} />
        <Small color={c.soft} center>{pass.preview ? "Previewing: Season Pass extras are shown on this phone. Nothing is charged." : "See the extras in the app for free. Nothing is charged."}</Small>
      </View>
    </Screen>
  );
}
