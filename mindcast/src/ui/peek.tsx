/**
 * PeekLink: a tappable card that opens a detail screen.
 * On iPhone it gets a long-press peek (Link.Preview) and the zoom transition (Link.Trigger withAppleZoom, iOS 18+).
 * On web and Android it is a plain link with the same press feedback.
 *
 * The Pressable is the link's only child and has a static style: Link's Slot flattens styles, so animated or
 * function styles would not survive it. Press feedback is a dim, kept calm for cards people tap often.
 */
import { Link, type Href } from "expo-router";
import React, { useState } from "react";
import { Platform, Pressable, StyleSheet, type StyleProp, type ViewStyle } from "react-native";
import { tap } from "./kit";

type Props = {
  href: Href;
  children: React.ReactNode;
  accessibilityLabel: string;
  accessibilityHint?: string;
  style?: StyleProp<ViewStyle>;
  /** Long-press peek (iOS). Default on. */
  preview?: boolean;
  /** Zoom transition into the detail (iOS 18+). Default on. */
  zoom?: boolean;
};

export function PeekLink({ href, children, accessibilityLabel, accessibilityHint, style, preview = true, zoom = true }: Props) {
  const [down, setDown] = useState(false);
  const card = (
    <Pressable
      accessibilityRole="link"
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      onPressIn={() => setDown(true)}
      onPressOut={() => setDown(false)}
      onPress={() => tap()}
      // One plain object: Link's Slot spreads styles, and a spread array turns into indexed keys on web.
      style={StyleSheet.flatten([style, down ? { opacity: 0.82 } : null])}>
      {children}
    </Pressable>
  );
  if (Platform.OS !== "ios") return <Link href={href} asChild>{card}</Link>;
  return (
    <Link href={href} asChild>
      <Link.Trigger withAppleZoom={zoom}>{card}</Link.Trigger>
      {preview ? <Link.Preview /> : null}
    </Link>
  );
}
