/** Today: the front door. The real railway today, linked to what you are learning. */
import React from "react";
import { View } from "react-native";
import { useStore } from "@/state/store";
import { Enter, Eyebrow, Screen } from "@/ui/kit";
import { space } from "@/ui/tokens";
import { ExploreTeaser, FeaturedCast, Greeting, NextStopCard, OpenLineCard } from "./components/Cards";
import { DeparturesCard } from "./components/DeparturesCard";
import { HistoryCard } from "./components/HistoryCard";
import { WeatherCard } from "./components/WeatherCard";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={{ gap: space.s }}>
      <Eyebrow>{title}</Eyebrow>
      {children}
    </View>
  );
}

export function TodayScreen() {
  // Mindcasts are written for older learners, so children see the Open Line and Explore instead.
  const kid = useStore((s) => s.profile.audience === "explorer");
  return (
    <Screen>
      <Enter i={0}><Greeting /></Enter>
      <Enter i={1}><NextStopCard /></Enter>
      <Enter i={2}>
        <Section title="On the railway today">
          <WeatherCard />
          <DeparturesCard />
        </Section>
      </Enter>
      <Enter i={3}><HistoryCard /></Enter>
      <Enter i={4}>
        <Section title="More to explore">
          {!kid && <FeaturedCast />}
          <OpenLineCard />
          <ExploreTeaser />
        </Section>
      </Enter>
    </Screen>
  );
}
