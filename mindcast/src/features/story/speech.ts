/** "Read to me": reads a caption aloud with expo-speech (in Expo Go). Calm pace, British English. */
import * as Speech from "expo-speech";

export function speakCaption(text: string, onDone: () => void) {
  try {
    Speech.stop();
    Speech.speak(text, { language: "en-GB", rate: 0.92, onDone, onStopped: onDone, onError: onDone });
  } catch {
    onDone();
  }
}

export function stopSpeaking() {
  try { void Speech.stop(); } catch { /* not available */ }
}
