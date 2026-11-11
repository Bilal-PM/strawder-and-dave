/** Small shared pieces for the Today and Explore screens. */
import { router, type Href } from "expo-router";
import React from "react";
import { Linking, Pressable, Text, View } from "react-native";
import { pack } from "@/domain";
import type { Source } from "@/domain/types";
import { Small, tap } from "@/ui/kit";
import { useTheme } from "@/ui/theme";
import { F, radius } from "@/ui/tokens";
import { resolveLink, type Topic } from "../services/links";

export const go = (href: string) => router.push(href as Href);

/** A tappable "learn more" chip that resolves a topic to a lesson or season. Renders nothing if it cannot. */
export function TopicChip({ topic, prefix, color, onDark }: { topic: Topic | null | undefined; prefix?: string; color?: string; onDark?: boolean }) {
  const { c } = useTheme();
  if (!topic) return null;
  const link = resolveLink(topic, pack);
  if (!link) return null;
  const col = color ?? (onDark ? "#F5C451" : c.accent);
  const text = `${prefix ? `${prefix} ` : ""}${link.label}`;
  return (
    <Pressable
      accessibilityRole="link"
      accessibilityLabel={`${prefix ?? "Learn"}: ${link.label}`}
      accessibilityHint={link.kind === "lesson" ? "Opens the lesson" : "Opens the Line tab"}
      onPress={() => { tap(); go(link.href); }}
      hitSlop={6}
      style={({ pressed }) => ({ alignSelf: "flex-start", flexDirection: "row", alignItems: "center", gap: 6, minHeight: 32, borderRadius: radius.s, borderWidth: 1, borderColor: col, paddingHorizontal: 8, paddingVertical: 5, opacity: pressed ? 0.7 : 1 })}
    >
      <Text style={{ fontFamily: F.mono, fontSize: 11, letterSpacing: 0.6, color: col, textTransform: "uppercase", flexShrink: 1 }}>{text}</Text>
      <Text style={{ fontFamily: F.mono, fontSize: 12, color: col }}>›</Text>
    </Pressable>
  );
}

/** Source list: tappable when a url is given. */
export function Sources({ sources, onDark }: { sources: Source[]; onDark?: boolean }) {
  const { c } = useTheme();
  if (!sources?.length) return null;
  const col = onDark ? "#A3ABB5" : c.soft;
  return (
    <View style={{ gap: 2 }} accessibilityLabel="Sources">
      <Text style={{ fontFamily: F.mono, fontSize: 10, letterSpacing: 0.8, textTransform: "uppercase", color: col }}>Sources</Text>
      {sources.map((s, i) => {
        const label = `${s.label}${s.where ? `, ${s.where}` : ""}`;
        return s.url ? (
          <Pressable key={i} accessibilityRole="link" accessibilityLabel={`Source: ${label}. Opens in your browser.`} onPress={() => Linking.openURL(s.url!).catch(() => {})} hitSlop={4}>
            <Small color={c.accent} style={{ textDecorationLine: "underline" }}>{label}</Small>
          </Pressable>
        ) : (
          <Small key={i} color={col}>{label}</Small>
        );
      })}
    </View>
  );
}

/** Quiet status line, e.g. "Open-Meteo · updated 2 min ago". */
export function Meta({ children, color }: { children: React.ReactNode; color?: string }) {
  const { c } = useTheme();
  return <Text style={{ fontFamily: F.mono, fontSize: 11, letterSpacing: 0.4, color: color ?? c.soft }}>{children}</Text>;
}
