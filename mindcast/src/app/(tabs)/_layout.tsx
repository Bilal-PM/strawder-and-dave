import { Redirect } from "expo-router";
import { NativeTabs } from "expo-router/native-tabs";
import { useStore } from "@/state/store";
import { useTheme } from "@/ui/theme";

/** iPhone tab bar (native). The web build uses _layout.web.tsx. */
export default function TabsLayout() {
  const { c } = useTheme();
  const onboarded = useStore((s) => s.onboarded);
  if (!onboarded) return <Redirect href="/onboarding" />;
  return (
    <NativeTabs tintColor={c.ink} iconColor={{ default: c.soft, selected: c.ink }} labelStyle={{ default: { color: c.soft }, selected: { color: c.ink } }} minimizeBehavior="onScrollDown">
      <NativeTabs.Trigger name="index">
        <NativeTabs.Trigger.Label>Today</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="sun.horizon.fill" md="wb_sunny" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="line">
        <NativeTabs.Trigger.Label>Line</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="point.topleft.down.to.point.bottomright.curvepath.fill" md="route" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="mindcast">
        <NativeTabs.Trigger.Label>Mindcast</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="lightbulb.max.fill" md="lightbulb" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="trains">
        <NativeTabs.Trigger.Label>Trains</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="tram.fill" md="train" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="you">
        <NativeTabs.Trigger.Label>You</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="person.crop.circle.fill" md="person" />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
