import { useLocalSearchParams } from "expo-router";
import { lessonById } from "@/domain";
import { LessonMissing, LessonScreen } from "@/features/learn/LessonScreen";
import { StoryPlayer } from "@/features/story/StoryPlayer";
import { storyFor } from "@/features/story/stories";

/**
 * A stop on the line. Stops with an illustrated story open as the story; `?view=notes` opens the detailed
 * notes instead (the story's "Full notes"). `?scene=N` opens the story at scene N (1-based).
 */
export default function LessonPage() {
  const { id, view, scene } = useLocalSearchParams<{ id: string; view?: string; scene?: string }>();
  const lesson = id ? lessonById(String(id)) : undefined;
  if (!lesson) return <LessonMissing />;
  const story = view === "notes" ? undefined : storyFor(lesson.id);
  if (story) return <StoryPlayer key={lesson.id} lesson={lesson} story={story} start={scene ? Math.max(0, Number(scene) - 1 || 0) : 0} />;
  return <LessonScreen key={lesson.id} lesson={lesson} hasStory={!!storyFor(lesson.id)} />;
}
