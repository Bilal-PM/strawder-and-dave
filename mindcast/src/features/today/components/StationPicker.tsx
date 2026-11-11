/** Full-screen station chooser: search, nearest station (location on tap only), or the bundled list. */
import React, { useMemo, useState } from "react";
import { FlatList, Modal, Pressable, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Button, H2, Small, tap } from "@/ui/kit";
import { useTheme } from "@/ui/theme";
import { F, radius, space } from "@/ui/tokens";
import { STATIONS, type Station } from "../services/stations";
import { distanceKm, locateOnce } from "../services/weather";

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9 ]/g, "");

export function StationPicker({ visible, current, onPick, onClose }: { visible: boolean; current: string | null; onPick: (s: Station) => void; onClose: () => void }) {
  const { c } = useTheme();
  const ins = useSafeAreaInsets();
  const [q, setQ] = useState("");
  const [near, setNear] = useState<{ s: Station; km: number }[] | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const list = useMemo(() => {
    const n = norm(q.trim());
    if (!n) return STATIONS;
    return STATIONS.filter((s) => norm(s.name).includes(n) || s.crs.toLowerCase() === n);
  }, [q]);

  const findNearest = async () => {
    setBusy(true);
    setMsg(null);
    const r = await locateOnce();
    setBusy(false);
    if (!r.ok) return setMsg(r.message);
    const ranked = STATIONS.map((s) => ({ s, km: distanceKm(r.lat, r.lon, s.lat, s.lon) })).sort((a, b) => a.km - b.km).slice(0, 3);
    setNear(ranked);
  };

  const row = (s: Station, extra?: string) => {
    const on = s.crs === current;
    return (
      <Pressable
        key={s.crs}
        accessibilityRole="button"
        accessibilityState={{ selected: on }}
        accessibilityLabel={`${s.name}${extra ? `, ${extra}` : ""}`}
        onPress={() => { tap(); onPick(s); }}
        style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: space.m, minHeight: 52, paddingHorizontal: space.m, borderBottomWidth: 1, borderBottomColor: c.line, backgroundColor: pressed ? c.sunk : on ? c.sunk : "transparent" })}
      >
        <Text style={{ fontFamily: F.mono, fontSize: 13, color: c.soft, width: 38 }}>{s.crs}</Text>
        <View style={{ flex: 1 }}>
          <Text style={{ fontFamily: F.bodySemi, fontSize: 16, color: c.ink }}>{s.name}</Text>
          {extra && <Small color={c.soft}>{extra}</Small>}
        </View>
        {on && <Text style={{ fontFamily: F.mono, fontSize: 12, color: c.good }}>Chosen</Text>}
      </Pressable>
    );
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: c.bg, paddingTop: space.l }}>
        <View style={{ paddingHorizontal: space.l, gap: space.m, paddingBottom: space.m }}>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            <H2 accessibilityRole="header">Choose a station</H2>
            <Button small kind="ghost" label="Close" onPress={onClose} />
          </View>
          <TextInput
            value={q}
            onChangeText={setQ}
            placeholder="Search by name or code, e.g. York or YRK"
            placeholderTextColor={c.soft}
            autoCorrect={false}
            autoCapitalize="none"
            clearButtonMode="while-editing"
            accessibilityLabel="Search stations"
            style={{ minHeight: 48, borderWidth: 1.5, borderColor: c.ink, borderRadius: radius.m, paddingHorizontal: space.m, fontFamily: F.body, fontSize: 16, color: c.ink, backgroundColor: c.surface }}
          />
          <Button small label={busy ? "Finding you..." : "Nearest station to me"} onPress={findNearest} disabled={busy} accessibilityLabel="Find the nearest major station using your location" />
          {msg && <Small color={c.warn} accessibilityLiveRegion="polite">{msg}</Small>}
          {near && (
            <View style={{ borderWidth: 1, borderColor: c.line, borderRadius: radius.m, overflow: "hidden", backgroundColor: c.surface }}>
              {near.map(({ s, km }) => row(s, `${km < 10 ? km.toFixed(1) : Math.round(km)} km away`))}
            </View>
          )}
        </View>
        <FlatList
          data={list}
          keyExtractor={(s) => s.crs}
          renderItem={({ item }) => row(item)}
          keyboardShouldPersistTaps="handled"
          initialNumToRender={20}
          contentContainerStyle={{ paddingBottom: ins.bottom + space.xl }}
          ListEmptyComponent={<Small color={c.soft} style={{ padding: space.l }}>No major station matches that. This list covers about 120 of the busiest and best-connected stations in Great Britain.</Small>}
          ListFooterComponent={list.length ? <Small color={c.soft} style={{ padding: space.l }}>Busiest stations from ORR station usage data, plus regional stations. Northern Ireland is not in the National Rail feed.</Small> : undefined}
        />
      </View>
    </Modal>
  );
}
