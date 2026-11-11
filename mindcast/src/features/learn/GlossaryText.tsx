/** Body text with glossary terms underlined; tapping a term opens a plain-English definition sheet. */
import React, { useMemo, useState } from "react";
import { Text, type StyleProp, type TextStyle } from "react-native";
import type { GlossaryTerm } from "@/domain/types";
import { Body, Button, Eyebrow, H2, tap } from "@/ui/kit";
import { useTheme } from "@/ui/theme";
import { F } from "@/ui/tokens";
import { Sheet, SourceChips } from "./ui";

const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Splits text into plain runs and glossary-term runs (first match wins, longest terms first). */
function split(text: string, terms: GlossaryTerm[]): (string | { t: string; g: GlossaryTerm })[] {
  if (!terms.length) return [text];
  const re = new RegExp(`\\b(${terms.map((g) => esc(g.term) + "s?").join("|")})\\b`, "gi");
  const out: (string | { t: string; g: GlossaryTerm })[] = [];
  let last = 0;
  for (const m of text.matchAll(re)) {
    const i = m.index ?? 0;
    const word = m[0].toLowerCase();
    const g = terms.find((x) => word === x.term.toLowerCase() || word === x.term.toLowerCase() + "s");
    if (!g) continue;
    if (i > last) out.push(text.slice(last, i));
    out.push({ t: m[0], g });
    last = i + m[0].length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

export function useTermSheet() {
  const [term, setTerm] = useState<GlossaryTerm | null>(null);
  const sheet = (
    <Sheet open={!!term} onClose={() => setTerm(null)} label="Glossary">
      {term && <TermBody term={term} onDone={() => setTerm(null)} />}
    </Sheet>
  );
  return { open: setTerm, sheet };
}

function TermBody({ term, onDone }: { term: GlossaryTerm; onDone: () => void }) {
  const { c } = useTheme();
  return (
    <>
      <Eyebrow>In plain words</Eyebrow>
      <H2>{term.term}</H2>
      <Body color={c.ink}>{term.plain}</Body>
      {term.sources?.length ? <SourceChips sources={term.sources} /> : null}
      <Button label="Got it" kind="primary" onPress={onDone} />
    </>
  );
}

export function GlossaryText({ text, terms, onTerm, style, size = "body" }: { text: string; terms: GlossaryTerm[]; onTerm: (g: GlossaryTerm) => void; style?: StyleProp<TextStyle>; size?: "body" | "big" }) {
  const { c } = useTheme();
  const parts = useMemo(() => split(text, terms), [text, terms]);
  const base: TextStyle = size === "big" ? { fontFamily: F.body, fontSize: 19, lineHeight: 28, color: c.ink } : { fontFamily: F.body, fontSize: 17, lineHeight: 26, color: c.ink };
  return (
    <Text style={[base, style]}>
      {parts.map((p, i) =>
        typeof p === "string" ? (
          p
        ) : (
          <Text key={i} accessibilityRole="link" accessibilityHint="Opens a plain definition" onPress={() => { tap(); onTerm(p.g); }}
            style={{ textDecorationLine: "underline", textDecorationStyle: "dotted", textDecorationColor: c.accent, color: c.ink, fontFamily: F.bodySemi }}>
            {p.t}
          </Text>
        )
      )}
    </Text>
  );
}
