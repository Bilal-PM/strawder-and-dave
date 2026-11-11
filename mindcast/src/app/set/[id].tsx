import { useLocalSearchParams } from "expo-router";
import { SetScreen } from "@/features/fieldbook/SetScreen";

export default function SetPage() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <SetScreen key={String(id)} id={String(id)} />;
}
