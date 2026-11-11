import { useLocalSearchParams } from "expo-router";
import TrainDetail from "@/features/trains/TrainDetail";

export default function TrainPage() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <TrainDetail key={String(id)} id={String(id)} />;
}
