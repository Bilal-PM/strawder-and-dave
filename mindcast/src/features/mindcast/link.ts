/**
 * Share a Mindcast as a link, no server needed: the cast travels inside the link itself.
 * groundwork://cast/import?d=<base64url JSON>. Imported casts are marked as not checked by Groundwork.
 */
import * as Linking from "expo-linking";
import type { Mindcast } from "@/domain/types";

const b64 = (s: string) => {
  const bytes = new TextEncoder().encode(s); let bin = ""; bytes.forEach((b) => (bin += String.fromCharCode(b)));
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
};
const unb64 = (s: string) => {
  const bin = atob(s.replace(/-/g, "+").replace(/_/g, "/")); const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
};

type Packed = [string, string, string, [string, string][], string, string, string, string, string[]];

export function castLink(m: Mindcast) {
  const packed: Packed = [m.title, m.observe, m.mechanism, m.mapping.map((p) => [p.railway, p.target]), m.limits, m.principle, m.action, m.railwayTopic, m.audience];
  return Linking.createURL("/cast/import", { queryParams: { d: b64(JSON.stringify(packed)), by: m.author } });
}

export function decodeCast(d: string, by?: string): Mindcast | null {
  try {
    const [title, observe, mechanism, mapping, limits, principle, action, railwayTopic, audience] = JSON.parse(unb64(d)) as Packed;
    if (typeof title !== "string" || !Array.isArray(mapping)) return null;
    const clip = (s: unknown, n: number) => String(s ?? "").slice(0, n);
    return {
      id: `shared-${Date.now()}`, title: clip(title, 120), author: clip(by || "Shared with you", 60), audience: (Array.isArray(audience) ? audience : ["starter"]).filter((a) => a === "explorer" || a === "starter" || a === "leader") as Mindcast["audience"],
      observe: clip(observe, 1200), mechanism: clip(mechanism, 1500), mapping: mapping.slice(0, 5).map(([r, t]) => ({ railway: clip(r, 400), target: clip(t, 400) })),
      limits: clip(limits, 800), principle: clip(principle, 240), action: clip(action, 300), railwayTopic: clip(railwayTopic, 20), sources: [],
    };
  } catch { return null; }
}
