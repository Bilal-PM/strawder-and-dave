/** Postcard maker: choose a train, paint it, name it, pick a scene, write a message, then share. */
import * as ImagePicker from "expo-image-picker";
import { useLocalSearchParams } from "expo-router";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Platform, Pressable, ScrollView, Text, View } from "react-native";
import Animated from "react-native-reanimated";
import { pack, trainById } from "@/domain";
import type { TrainClass } from "@/domain/types";
import { useStore, type Postcard } from "@/state/store";
import { Body, Button, Card, Enter, Eyebrow, Field as Labelled, H1, H3, Input, Row, Screen, Segmented, Small, tap } from "@/ui/kit";
import { useMotion } from "@/ui/motion";
import { Sketch } from "@/ui/sketch";
import { useTheme } from "@/ui/theme";
import { F, radius, space } from "@/ui/tokens";
import { canCopyText, copyCaption, savePostcard, sharePostcard } from "./capture";
import { isTram, toDraw, type Livery } from "./model";
import { paintPostcard, POSTCARD_H, POSTCARD_PAL, POSTCARD_W, SCENES, type Scene } from "./postcardArt";
import { BackLink } from "./TrainDetail";

const BODY_SW: [string, string][] = [["#2F5D3A", "Green"], ["#2B59C3", "Blue"], ["#B23A3A", "Red"], ["#5B3F8C", "Purple"], ["#E8611A", "Orange"], ["#F2B705", "Yellow"], ["#1F2933", "Charcoal"], ["#F4F2EC", "Cream"]];
const STRIPE_SW: [string, string][] = [["#E8C66A", "Gold"], ["#F2B705", "Yellow"], ["#FFFFFF", "White"], ["#1B1F24", "Black"], ["#E8611A", "Orange"], ["#3A86FF", "Sky blue"]];
const LOGOS: { value: string; label: string }[] = [
  { value: "none", label: "None" }, { value: "initials", label: "Initials" }, { value: "star", label: "Star" }, { value: "wheel", label: "Wheel" },
  { value: "leaf", label: "Leaf" }, { value: "chevron", label: "Chevron" }, { value: "shield", label: "Shield" }, { value: "image", label: "My image" },
];

/** The chosen logo image stays on this device for this session only (not saved to the store). */
let sessionImage: string | null = null;

const update = (patch: Partial<Postcard>) => useStore.getState().set((s) => ({ postcard: { ...s.postcard, ...patch } }));

function useDebounced<T>(v: T, ms: number) {
  const [d, setD] = useState(v);
  useEffect(() => { const h = setTimeout(() => setD(v), ms); return () => clearTimeout(h); }, [v, ms]);
  return d;
}

function Field({ label, value, onChange, max, multiline, hint }: { label: string; value: string; onChange: (s: string) => void; max: number; multiline?: boolean; hint?: string }) {
  return (
    <Labelled label={label}>
      <Input value={value} onChangeText={(s) => onChange(s.slice(0, max))} accessibilityLabel={label} accessibilityHint={hint} lines={multiline ? 3 : 1} maxLength={max} />
    </Labelled>
  );
}

function Swatches({ label, list, value, onChange }: { label: string; list: [string, string][]; value: string; onChange: (v: string) => void }) {
  const { c } = useTheme();
  return (
    <View style={{ gap: 6 }}>
      <Eyebrow>{label}</Eyebrow>
      <View accessibilityRole="radiogroup" accessibilityLabel={label} style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        {list.map(([hex, name]) => {
          const on = hex.toLowerCase() === value.toLowerCase();
          return (
            <Pressable key={hex} accessibilityRole="radio" accessibilityLabel={`${label}: ${name}`} accessibilityState={{ selected: on }} onPress={() => { tap(); onChange(hex); }}
              style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: hex, borderWidth: on ? 3 : 1.5, borderColor: on ? c.ink : c.line, alignItems: "center", justifyContent: "center" }}>
              {on ? <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: c.surface, borderWidth: 1, borderColor: c.ink }} /> : null}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function TrainPicker({ value, onChange }: { value: string; onChange: (id: string) => void }) {
  const { c } = useTheme();
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} accessibilityRole="radiogroup" accessibilityLabel="Choose a train" contentContainerStyle={{ gap: 8, paddingRight: 8 }}>
      {pack.trains.map((t) => {
        const on = t.id === value;
        return (
          <Pressable key={t.id} accessibilityRole="radio" accessibilityState={{ selected: on }} accessibilityLabel={`${t.name}, ${t.type}`} onPress={() => { tap(); onChange(t.id); }}
            style={{ minHeight: 44, paddingHorizontal: 12, justifyContent: "center", borderRadius: radius.m, borderWidth: 1.5, borderColor: on ? c.ink : c.line, backgroundColor: on ? c.ink : c.surface }}>
            <Text style={{ fontFamily: F.bodySemi, fontSize: 14, color: on ? c.bg : c.ink }}>{t.name}</Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

export function captionFor(t: TrainClass, name: string) {
  return `I made this railway postcard: ${name ? `"${name}", ` : ""}a ${t.name} (${t.type.toLowerCase()}). ${t.fact}`;
}

export default function PostcardScreen() {
  const { c } = useTheme();
  const params = useLocalSearchParams<{ train?: string }>();
  const pc = useStore((s) => s.postcard);
  const [img, setImg] = useState<string | null>(sessionImage);
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const shot = useRef<React.ComponentRef<typeof View>>(null);
  const m = useMotion();

  // a train passed in the link wins over the saved choice
  useEffect(() => {
    const id = Array.isArray(params.train) ? params.train[0] : params.train;
    if (id && trainById(id) && id !== useStore.getState().postcard.trainId) update({ trainId: id, body: undefined, stripe: undefined });
  }, [params.train]);

  const train = trainById(pc.trainId) ?? pack.trains[0];

  // redraw shortly after typing stops, not on every key
  const text = useDebounced({ name: pc.name, number: pc.number, initials: pc.initials, message: pc.message, from: pc.from }, 250);
  const scene = (SCENES.some((s) => s.value === pc.scene) ? pc.scene : "viaduct") as Scene;
  const logo = pc.logo === "image" && !img ? "initials" : pc.logo;
  const livery: Livery | null = useMemo(() => (train ? { body: pc.body || train.body, stripe: pc.stripe || train.stripe, name: text.name.trim(), number: text.number.trim(), logo, initials: text.initials, img } : null), [train, pc.body, pc.stripe, text.name, text.number, text.initials, logo, img]);
  const date = useMemo(() => new Date(), []);

  if (!train || !livery) {
    return (
      <Screen>
        <BackLink />
        <H1>Make a postcard</H1>
        <Body>The train library is loading.</Body>
      </Screen>
    );
  }

  const pickImage = async () => {
    try {
      const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], allowsEditing: true, aspect: [1, 1], quality: 0.4, base64: true });
      if (res.canceled || !res.assets?.length) return;
      const a = res.assets[0];
      const href = a.base64 ? `data:${a.mimeType || "image/jpeg"};base64,${a.base64}` : a.uri;
      sessionImage = href; setImg(href); update({ logo: "image" });
      setStatus("Logo added. It stays on this device.");
    } catch {
      setStatus("That image couldn't be opened. Try another one.");
    }
  };

  const caption = captionFor(train, pc.name.trim());
  const run = async (fn: () => Promise<string>) => {
    if (busy) return;
    setBusy(true); setStatus("");
    try { setStatus(await fn()); } catch { setStatus("Something went wrong making the image. Please try again."); }
    finally { setBusy(false); }
  };
  const web = Platform.OS === "web";

  return (
    <Screen>
      <BackLink />
      <Enter style={{ gap: 4 }}>
        <Eyebrow>Postcard</Eyebrow>
        <H1 accessibilityRole="header">Make a postcard</H1>
        <Small color={c.soft}>Pick a train, paint it, give it a name, then share it.</Small>
      </Enter>

      <View ref={shot} collapsable={false} style={{ borderRadius: 6, overflow: "hidden", backgroundColor: POSTCARD_PAL.paper, borderWidth: 1, borderColor: c.line }}>
        {/* A new train or scene fades in; typing redraws in place. */}
        <Animated.View key={`${train.id}-${scene}`} entering={m.fade()}>
        <Sketch
          w={POSTCARD_W}
          h={POSTCARD_H}
          pal={POSTCARD_PAL}
          deps={[train.id, livery.body, livery.stripe, livery.name, livery.number, livery.logo, livery.initials, img ? img.length : 0, scene, text.message, text.from]}
          paint={(p) => paintPostcard(p, { spec: toDraw(train), className: train.name, fact: train.fact, livery, scene, message: text.message, from: text.from, tram: isTram(train), date })}
          accessibilityLabel={`Postcard preview: a ${train.name} in the ${scene} scene. Message: ${text.message || "none"}`}
        />
        </Animated.View>
      </View>

      <Card>
        <H3 accessibilityRole="header">Share it</H3>
        <Row wrap gap={8}>
          <Button kind="primary" disabled={busy} label={web ? "Download PNG" : "Share"} accessibilityLabel={web ? "Download the postcard as a PNG image" : "Share the postcard"} onPress={() => run(async () => (await sharePostcard(shot.current)) === "unavailable" ? "Sharing isn't available on this device. Try Save to Photos." : web ? "Postcard downloaded." : "")} />
          {!web && <Button disabled={busy} label="Save to Photos" accessibilityLabel="Save the postcard to Photos" onPress={() => run(async () => (await savePostcard(shot.current)) === "denied" ? "Groundwork needs permission to add photos. You can allow it in Settings." : "Saved to Photos.")} />}
          <Button label={canCopyText ? "Copy caption" : "Share caption"} accessibilityLabel={canCopyText ? "Copy a caption for your post" : "Share a caption for your post"} onPress={() => run(async () => (await copyCaption(caption)) === "copied" ? "Caption copied." : "")} />
        </Row>
        <Text selectable style={{ fontFamily: F.body, fontSize: 14, lineHeight: 20, color: c.soft }}>{caption}</Text>
        {status ? <Animated.View key={status} entering={m.fade()}><Small accessibilityLiveRegion="polite" color={c.ink}>{status}</Small></Animated.View> : null}
      </Card>

      <Card>
        <H3 accessibilityRole="header">Train</H3>
        <TrainPicker value={train.id} onChange={(id) => update({ trainId: id, body: undefined, stripe: undefined })} />
        <Swatches label="Body colour" list={BODY_SW} value={livery.body} onChange={(v) => update({ body: v })} />
        <Swatches label="Stripe colour" list={STRIPE_SW} value={livery.stripe} onChange={(v) => update({ stripe: v })} />
        {(pc.body || pc.stripe) ? <Button small kind="ghost" label="Use the class colours" accessibilityLabel={`Use the ${train.name} colours`} onPress={() => update({ body: undefined, stripe: undefined })} style={{ alignSelf: "flex-start" }} /> : null}
      </Card>

      <Card>
        <H3 accessibilityRole="header">Name and badge</H3>
        <Field label="Nameplate" value={pc.name} max={28} onChange={(v) => update({ name: v })} hint="The name painted on the side" />
        <Field label="Number" value={pc.number} max={10} onChange={(v) => update({ number: v })} />
        <Segmented label="Logo" showLabel value={pc.logo} options={LOGOS} onChange={(v) => { if (v === "image" && !img) pickImage(); else update({ logo: v }); }} />
        {pc.logo === "initials" && <Field label="Initials" value={pc.initials} max={3} onChange={(v) => update({ initials: v })} />}
        {pc.logo === "image" && <Button small label={img ? "Choose another image" : "Choose an image"} accessibilityLabel="Choose an image for your logo" onPress={pickImage} style={{ alignSelf: "flex-start" }} />}
      </Card>

      <Card>
        <H3 accessibilityRole="header">Scene and message</H3>
        <Segmented label="Scene" showLabel value={scene} options={SCENES} onChange={(v) => update({ scene: v })} />
        <Field label="Message" value={pc.message} max={160} multiline onChange={(v) => update({ message: v })} />
        <Field label="From" value={pc.from} max={24} onChange={(v) => update({ from: v })} />
      </Card>
      <View style={{ height: space.l }} />
    </Screen>
  );
}
