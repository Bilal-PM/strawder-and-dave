import { BricolageGrotesque_600SemiBold, BricolageGrotesque_800ExtraBold } from "@expo-google-fonts/bricolage-grotesque";
import { Caveat_600SemiBold } from "@expo-google-fonts/caveat";
import { FamiljenGrotesk_400Regular, FamiljenGrotesk_600SemiBold } from "@expo-google-fonts/familjen-grotesk";
import { IBMPlexMono_500Medium } from "@expo-google-fonts/ibm-plex-mono";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { useStore } from "@/state/store";
import { GroundworkTheme, useTheme } from "@/ui/theme";

SplashScreen.preventAutoHideAsync().catch(() => {});

function Shell() {
  const { c, dark } = useTheme();
  return (
    <>
      <StatusBar style={dark ? "light" : "dark"} />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: c.bg }, animation: "slide_from_right" }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="onboarding" options={{ animation: "fade", gestureEnabled: false }} />
        <Stack.Screen name="world" options={{ animation: "fade_from_bottom" }} />
        <Stack.Screen name="cast/new" options={{ presentation: "modal" }} />
        <Stack.Screen name="pass" options={{ presentation: "modal" }} />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  const [loaded] = useFonts({ BricolageGrotesque_800ExtraBold, BricolageGrotesque_600SemiBold, Caveat_600SemiBold, FamiljenGrotesk_400Regular, FamiljenGrotesk_600SemiBold, IBMPlexMono_500Medium });
  const touch = useStore((s) => s.touchStreak);
  useEffect(() => { if (loaded) { SplashScreen.hideAsync().catch(() => {}); touch(); } }, [loaded, touch]);
  if (!loaded) return null;
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <GroundworkTheme>
          <Shell />
        </GroundworkTheme>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
