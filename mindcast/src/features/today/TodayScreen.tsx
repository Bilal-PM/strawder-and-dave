/** Today: the front door. The real railway today, linked to what you are learning. */
import React from "react";
import { View } from "react-native";
import { Eyebrow, Screen } from "@/ui/kit";
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
  return (
    <Screen>
      <Greeting />
      <NextStopCard />
      <Section title="On the railway today">
        <WeatherCard />
        <DeparturesCard />
      </Section>
      <HistoryCard />
      <Section title="More to explore">
        <FeaturedCast />
        <OpenLineCard />
        <ExploreTeaser />
      </Section>
    </Screen>
  );
}
