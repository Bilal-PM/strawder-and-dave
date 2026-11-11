import { Redirect } from "expo-router";
import { TabList, TabSlot, TabTrigger, Tabs, type TabTriggerSlotProps } from "expo-router/ui";
import { Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useStore } from "@/state/store";
import { useTheme } from "@/ui/theme";
import { F } from "@/ui/tokens";

/** Same five tabs as the iPhone, Field Book in the centre. Explorers see Mindcast as "Ideas". */
const TABS = [["index", "/", "Today"], ["line", "/line", "Learn"], ["fieldbook", "/fieldbook", "Field Book"], ["mindcast", "/mindcast", "Mindcast"], ["you", "/you", "You"]] as const;

function TabButton({ children, isFocused, ...props }: TabTriggerSlotProps) {
  const { c } = useTheme();
  return (
    <Pressable {...(props as object)} style={{ flex: 1, alignItems: "center", paddingVertical: 10 }}>
      <View style={{ width: 22, height: 4, borderRadius: 2, marginBottom: 6, backgroundColor: isFocused ? c.ppe : "transparent" }} />
      <Text style={{ fontFamily: F.bodySemi, fontSize: 13, color: isFocused ? c.ink : c.soft }}>{children}</Text>
    </Pressable>
  );
}

/** Web preview tab bar (the iPhone app uses native tabs). */
export default function TabsLayout() {
  const { c } = useTheme();
  const ins = useSafeAreaInsets();
  const onboarded = useStore((s) => s.onboarded);
  const kid = useStore((s) => s.profile.audience === "explorer");
  if (!onboarded) return <Redirect href="/onboarding" />;
  return (
    <Tabs>
      <TabSlot style={{ flex: 1 }} />
      <TabList style={{ position: "absolute", left: 0, right: 0, bottom: 0, flexDirection: "row", backgroundColor: c.surface, borderTopWidth: 1, borderTopColor: c.line, paddingBottom: ins.bottom }}>
        {TABS.map(([name, href, label]) => (
          <TabTrigger key={name} name={name} href={href} asChild>
            <TabButton>{kid && name === "mindcast" ? "Ideas" : label}</TabButton>
          </TabTrigger>
        ))}
      </TabList>
    </Tabs>
  );
}
