import { useLocalSearchParams } from "expo-router";
import { ItemScreen } from "@/features/fieldbook/ItemScreen";

/** One thing to spot ("fishplate", "train.c66", "place.glenfinnan-viaduct"). */
export default function SpotPage() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <ItemScreen key={String(id)} id={String(id)} />;
}
