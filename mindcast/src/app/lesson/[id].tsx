import { useLocalSearchParams } from "expo-router";
import { lessonById } from "@/domain";
import { LessonMissing, LessonScreen } from "@/features/learn/LessonScreen";

/** A stop on the line: the lesson player. */
export default function LessonPage() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const lesson = id ? lessonById(String(id)) : undefined;
  return lesson ? <LessonScreen key={lesson.id} lesson={lesson} /> : <LessonMissing />;
}
