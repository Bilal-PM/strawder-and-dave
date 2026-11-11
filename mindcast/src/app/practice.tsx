import { useLocalSearchParams } from "expo-router";
import { PracticeScreen } from "@/features/fieldbook/MoreScreens";

/** Add a practice stamp (a sheet). `?lesson=s1-01` picks the stop. */
export default function Practice() {
  const { lesson } = useLocalSearchParams<{ lesson?: string }>();
  return <PracticeScreen lessonId={lesson ? String(lesson) : undefined} />;
}
