import { useLocalSearchParams } from "expo-router";
import { ItemScreen } from "@/features/fieldbook/ItemScreen";

/** A place from the Explore map, as a sheet: where to get off, why go, and its stamp. */
export default function PlacePage() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <ItemScreen key={String(id)} id={`place.${String(id)}`} sheet />;
}
