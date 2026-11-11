/**
 * Today: one clear order. Next stop, one spot of the day, what is due for another look, live departures,
 * then this day in history. A routine screen, so it appears without entrance animations.
 */
import React from "react";
import { DueTodayCard, SpotOfDayCard } from "@/features/fieldbook/SpotOfDay";
import { Screen } from "@/ui/kit";
import { Greeting, NextStopCard } from "./components/Cards";
import { DeparturesCard } from "./components/DeparturesCard";
import { HistoryCard } from "./components/HistoryCard";

export function TodayScreen() {
  return (
    <Screen>
      <Greeting />
      <NextStopCard />
      <SpotOfDayCard />
      <DueTodayCard />
      <DeparturesCard />
      <HistoryCard />
    </Screen>
  );
}
