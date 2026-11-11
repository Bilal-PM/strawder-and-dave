/** iPhone: capture the postcard view to a PNG file, then share or save it. */
import * as MediaLibrary from "expo-media-library";
import * as Legacy from "expo-media-library/legacy";
import * as Sharing from "expo-sharing";
import { Share } from "react-native";
import { captureRef } from "react-native-view-shot";
import { POSTCARD_H, POSTCARD_W } from "./postcardArt";

export const canCopyText = false;

export async function capturePng(view: unknown): Promise<string> {
  return captureRef(view as never, { format: "png", quality: 1, result: "tmpfile", width: POSTCARD_W, height: POSTCARD_H });
}

export async function sharePostcard(view: unknown): Promise<"shared" | "unavailable"> {
  const uri = await capturePng(view);
  if (!(await Sharing.isAvailableAsync())) return "unavailable";
  await Sharing.shareAsync(uri, { mimeType: "image/png", UTI: "public.png", dialogTitle: "Share your postcard" });
  return "shared";
}

export async function savePostcard(view: unknown): Promise<"saved" | "denied"> {
  const perm = await MediaLibrary.requestPermissionsAsync(true);
  if (!perm.granted) return "denied";
  const uri = await capturePng(view);
  try { await MediaLibrary.Asset.create(uri); }
  catch { await Legacy.saveToLibraryAsync(uri); }
  return "saved";
}

/** No clipboard module is installed, so the caption goes to the share sheet (which has Copy). */
export async function copyCaption(text: string): Promise<"copied" | "shared"> {
  await Share.share({ message: text });
  return "shared";
}
