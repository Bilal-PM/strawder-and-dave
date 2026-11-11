/**
 * <SpotIt itemId /> : "I spotted it", one recall question, then the stamp lands.
 *
 * Works for every entry key: drawn items ("fishplate"), trains ("train.c66") and places ("place.glenfinnan-viaduct").
 * Places first check you are there (within 1.5 km, if location is allowed) or take an honest "I've been here".
 * Wrong answers still stamp and show the right answer gently. Once per item per day.
 * Story lessons can drop this at the end of a stop.
 */
import * as ImagePicker from "expo-image-picker";
import React, { useEffect, useMemo, useState } from "react";
import { AccessibilityInfo, Image, Platform, Pressable, Text, View } from "react-native";
import { pack } from "@/domain";
import { kmText, stampCheck, STAMP_RADIUS_KM } from "@/features/explore/places";
import { locateOnce } from "@/features/today/services/weather";
import { useStore } from "@/state/store";
import { Body, BodyB, Button, Eyebrow, Row, Small, tap } from "@/ui/kit";
import { useTheme } from "@/ui/theme";
import { F, radius, space, TOUCH } from "@/ui/tokens";
import { canStampToday, dayKey, entryByKey, gradeName, meaningLine, questionFor, setProgress, type Question } from "./logic";
import { ItemArt } from "./parts";
import { InkStamp, StampMoment, type MomentData } from "./Stamp";

type Phase = "idle" | "here" | "ask";

function useScreenReader() {
  const [on, setOn] = useState(false);
  useEffect(() => {
    // React Native Web always answers true, so only trust it on the phone.
    if (Platform.OS === "web") return;
    let alive = true;
    AccessibilityInfo.isScreenReaderEnabled().then((v) => { if (alive) setOn(!!v); }).catch(() => {});
    const sub = AccessibilityInfo.addEventListener?.("screenReaderChanged", (v: boolean) => setOn(!!v));
    return () => { alive = false; sub?.remove?.(); };
  }, []);
  return on;
}

function QuestionView({ q, onAnswer, picked }: { q: Question; onAnswer: (i: number) => void; picked: number | null }) {
  const { c } = useTheme();
  const done = picked !== null;
  const tone = (i: number) => (!done ? c.line : i === q.answer ? c.good : i === picked ? c.soft : c.line);
  if (q.kind === "art") {
    return (
      <View style={{ flexDirection: "row", gap: space.s }} accessibilityRole="radiogroup" accessibilityLabel={q.prompt}>
        {q.options.map((o, i) => {
          const e = entryByKey(pack, o.key);
          return (
            <Pressable key={o.key} accessibilityRole="radio" accessibilityState={{ selected: picked === i, disabled: done }} accessibilityLabel={`Drawing ${i + 1} of ${q.options.length}`} disabled={done} onPress={() => onAnswer(i)}
              style={{ flex: 1, minHeight: TOUCH, padding: 6, borderRadius: radius.m, borderWidth: done && (i === q.answer || i === picked) ? 2.5 : 1.5, borderColor: tone(i), backgroundColor: c.surface, opacity: done && i !== q.answer && i !== picked ? 0.5 : 1 }}>
              {e && <ItemArt entry={e} label={`Drawing ${i + 1}`} />}
            </Pressable>
          );
        })}
      </View>
    );
  }
  return (
    <View style={{ gap: space.s }} accessibilityRole="radiogroup" accessibilityLabel={q.prompt}>
      {q.options.map((o, i) => (
        <Pressable key={o.key} accessibilityRole="radio" accessibilityState={{ selected: picked === i, disabled: done }} accessibilityLabel={o.text} disabled={done} onPress={() => onAnswer(i)}
          style={{ minHeight: TOUCH, justifyContent: "center", paddingHorizontal: space.m, paddingVertical: 10, borderRadius: radius.m, borderWidth: done && (i === q.answer || i === picked) ? 2.5 : 1.5, borderColor: tone(i), backgroundColor: c.surface, opacity: done && i !== q.answer && i !== picked ? 0.5 : 1 }}>
          <Text style={{ fontFamily: F.body, fontSize: 15, lineHeight: 20, color: c.ink }}>{o.text}</Text>
        </Pressable>
      ))}
    </View>
  );
}

export function SpotIt({ itemId, compact = false }: { itemId: string; compact?: boolean }) {
  const { c } = useTheme();
  const entry = useMemo(() => entryByKey(pack, itemId), [itemId]);
  const rec = useStore((s) => s.fieldbook.spots[itemId]);
  const kid = useStore((s) => s.profile.audience === "explorer");
  const grownUp = useStore((s) => s.fieldbook.grownUpLocation);
  const reader = useScreenReader();
  const [phase, setPhase] = useState<Phase>("idle");
  const [q, setQ] = useState<Question | null>(null);
  const [picked, setPicked] = useState<number | null>(null);
  const [moment, setMoment] = useState<MomentData | null>(null);
  const [msg, setMsg] = useState<{ text: string; tone: "good" | "warn" | "soft" } | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState(false);
  if (!entry) return null;

  const today = dayKey();
  const canStamp = canStampToday(rec, today);
  const visits = rec?.days.length ?? 0;
  const single = entry.maxGrade === 1;
  const locationAllowed = !kid || grownUp;

  const ask = () => {
    let question = questionFor(pack, entry, visits, today);
    // A screen reader can't compare drawings, so ask about the clue instead.
    if (reader && question.kind === "art" && entry.kind === "item") question = questionFor(pack, entry, 2, today);
    if (reader && question.kind === "art" && entry.kind === "train") question = { ...question, kind: "look", prompt: `How do you recognise the ${entry.name}?`, options: question.options.map((o) => ({ key: o.key, text: entryByKey(pack, o.key)?.look })) };
    setQ(question); setPicked(null); setPhase("ask"); setMsg(null);
  };

  const answer = (i: number) => {
    if (!q || picked !== null) return;
    setPicked(i);
    const correct = i === q.answer;
    tap(correct ? "light" : "warn");
    const before = rec?.grade ?? 0;
    const out = useStore.getState().stampSpot(itemId, correct);
    if (!out.ok) { setPhase("idle"); return; }
    const set = pack.spots.sets.find((x) => x.id === entry.set)!;
    const prog = setProgress(pack, set, useStore.getState().fieldbook.spots);
    const right = q.options[q.answer];
    const feedback = correct ? "Well remembered." : `The answer was ${q.kind === "art" ? "this drawing" : `"${right.text}"`}. ${q.kind === "art" ? q.explain : ""}`.trim();
    setTimeout(() => {
      setMoment({ key: itemId, name: entry.name, rarity: entry.rarity, grade: out.grade, single, day: today, feedback, correct, meaning: meaningLine(prog), note: out.review && before > 0 ? "review" : undefined });
      setPhase("idle"); setQ(null);
    }, 650);
  };

  const checkIn = async () => {
    if (!entry.place) return;
    setBusy(true); setMsg(null);
    const r = await locateOnce();
    setBusy(false);
    if (!r.ok) return setMsg({ text: r.message, tone: "warn" });
    const chk = stampCheck(entry.place, r.lat, r.lon);
    if (chk.ok) { setMsg({ text: `You're ${kmText(chk.km)} from ${chk.label}.`, tone: "good" }); ask(); }
    else setMsg({ text: `You're about ${kmText(chk.km)} from ${chk.label}. Stamps work within ${STAMP_RADIUS_KM} km. Been before? Say so below.`, tone: "soft" });
  };

  const addPhoto = async (camera: boolean) => {
    try {
      if (camera) {
        const perm = await ImagePicker.requestCameraPermissionsAsync();
        if (!perm.granted) return setMsg({ text: "Camera is off for Groundwork. You can turn it on in Settings, or choose a photo instead.", tone: "soft" });
      }
      const opts: ImagePicker.ImagePickerOptions = { mediaTypes: ["images"], quality: 0.6, allowsEditing: true, aspect: [4, 3] };
      const res = camera ? await ImagePicker.launchCameraAsync(opts) : await ImagePicker.launchImageLibraryAsync(opts);
      if (!res.canceled && res.assets?.[0]?.uri) { useStore.getState().setSpotPhoto(itemId, res.assets[0].uri); tap("light"); }
    } catch { setMsg({ text: "Couldn't open photos just now.", tone: "warn" }); }
  };

  const spotted = (rec?.grade ?? 0) > 0;
  const lastDay = rec?.days[rec.days.length - 1] ?? "";
  const nextGrade = !single && rec && rec.grade < 3 ? gradeName(rec.grade + 1, 3).toLowerCase() : null;
  const verb = entry.kind === "place" ? "I'm here" : entry.kind === "train" ? "I spotted one" : "I spotted it";

  return (
    <View style={{ gap: space.m }}>
      {phase === "idle" && (
        <>
          {spotted && (
            <Row gap={space.m} style={{ alignItems: "center" }}>
              <InkStamp k={itemId} grade={rec!.grade} single={single} day={lastDay} size={compact ? 56 : 68} />
              <View style={{ flex: 1, gap: 2 }}>
                <BodyB>{single ? (entry.kind === "place" ? "Stamped in your book." : "Underlined in your book.") : `${gradeName(rec!.grade, 3)} in your book.`}</BodyB>
                <Small color={c.soft}>
                  {!canStamp ? (nextGrade ? `Stamped today. Spot it on another day for ${nextGrade}.` : "Stamped today.") : nextGrade ? `Spot it on another day for ${nextGrade}.` : rec?.via === "passport" ? "From your old rail passport." : "Seen it again? It still counts towards your week."}
                </Small>
              </View>
            </Row>
          )}
          {canStamp && entry.kind !== "place" && (
            <Button kind="primary" label={spotted ? "Spotted it again" : verb} onPress={ask} accessibilityLabel={`${spotted ? "Spotted it again" : verb}: ${entry.name}`} />
          )}
          {canStamp && entry.kind === "place" && !spotted && (
            <View style={{ gap: space.s }}>
              {locationAllowed ? (
                <>
                  <Small color={c.soft}>Stand within {STAMP_RADIUS_KM} km of the station. Your location is checked once, on this phone, and not stored.</Small>
                  <Button kind="primary" label={busy ? "Checking where you are..." : "I'm here: check and stamp"} onPress={checkIn} disabled={busy} accessibilityLabel={`Check my location and stamp ${entry.name}`} />
                </>
              ) : (
                <Small color={c.soft}>Location checks are off for Explorers. A grown-up can turn them on in You, under Settings.</Small>
              )}
              {confirm ? (
                <View style={{ gap: space.s }}>
                  <Small>Only if you have really been. Stamp {entry.name}?</Small>
                  <Row gap={space.s}>
                    <Button small kind="pass" label="Yes, I've been" onPress={() => { setConfirm(false); ask(); }} />
                    <Button small kind="ghost" label="Cancel" onPress={() => setConfirm(false)} />
                  </Row>
                </View>
              ) : (
                <Button small={locationAllowed} kind={locationAllowed ? "secondary" : "primary"} label="I've been here" onPress={() => setConfirm(true)} accessibilityLabel={`I've been to ${entry.name}, stamp without location`} />
              )}
            </View>
          )}
          {spotted && entry.kind === "place" && !compact && (
            <Button small kind="ghost" label="Remove this stamp" onPress={() => useStore.getState().unstamp(itemId)} accessibilityLabel={`Remove the ${entry.name} stamp`} />
          )}
          {spotted && !compact && (
            <View style={{ gap: space.s }}>
              {rec?.photo ? (
                <View style={{ gap: 6 }}>
                  <Image source={{ uri: rec.photo }} accessibilityLabel={`Your photo of ${entry.name}`} style={{ width: "100%", aspectRatio: 4 / 3, borderRadius: radius.l, backgroundColor: c.sunk }} resizeMode="cover" />
                  <Row gap={space.s}>
                    <Small color={c.soft} style={{ flex: 1 }}>Your photo. It stays on this phone.</Small>
                    <Button small kind="ghost" label="Remove photo" onPress={() => useStore.getState().setSpotPhoto(itemId, null)} />
                  </Row>
                </View>
              ) : (
                <View style={{ gap: 6 }}>
                  <Row gap={space.s} wrap>
                    {Platform.OS !== "web" && <Button small label="Take a photo" onPress={() => addPhoto(true)} />}
                    <Button small kind={Platform.OS === "web" ? "secondary" : "ghost"} label="Choose a photo" onPress={() => addPhoto(false)} />
                  </Row>
                  <Small color={c.soft}>Optional. Photos stay on this phone. No flash at stations.</Small>
                </View>
              )}
            </View>
          )}
        </>
      )}

      {phase === "ask" && q && (
        <View style={{ gap: space.m, padding: space.m, borderRadius: radius.l, backgroundColor: c.sunk }} accessibilityLiveRegion="polite">
          <Eyebrow>One quick question</Eyebrow>
          <Body style={{ fontFamily: F.bodySemi }}>{q.prompt}</Body>
          <QuestionView q={q} onAnswer={answer} picked={picked} />
          {picked === null && <Button small kind="ghost" label="Not now" onPress={() => { setPhase("idle"); setQ(null); }} />}
        </View>
      )}

      {msg && <Small accessibilityLiveRegion="polite" color={msg.tone === "good" ? c.good : msg.tone === "warn" ? c.warn : c.soft}>{msg.text}</Small>}
      <StampMoment data={moment} onDone={() => setMoment(null)} />
    </View>
  );
}
