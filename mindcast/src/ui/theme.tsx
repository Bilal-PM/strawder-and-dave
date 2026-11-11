import React, { createContext, useContext, useMemo } from "react";
import { useColorScheme } from "react-native";
import { useStore } from "@/state/store";
import { dark, light, type Palette } from "./tokens";

type Theme = { c: Palette; dark: boolean };
const Ctx = createContext<Theme>({ c: light, dark: false });

export function GroundworkTheme({ children }: { children: React.ReactNode }) {
  const system = useColorScheme();
  const pref = useStore((s) => s.settings.theme);
  const isDark = pref === "system" ? system === "dark" : pref === "dark";
  const value = useMemo(() => ({ c: isDark ? dark : light, dark: isDark }), [isDark]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

/** Current palette and whether we are in dark mode. */
export const useTheme = () => useContext(Ctx);
