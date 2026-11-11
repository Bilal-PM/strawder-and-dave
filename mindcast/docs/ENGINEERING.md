# Groundwork app: engineering guide

Expo SDK 58, React Native 0.88, React 19, Expo Router (file routes in `src/app/`), TypeScript strict.
Target: iPhone first (Expo Go compatible: no custom native modules), web build for previews and QA.

## Principles
- **Purposeful and beautiful.** Paper and ink, hand-drawn lines (rough.js), one hero colour per moment. Colour meanings are fixed: orange (`ppe`) = heat/pressure, yellow (`pass`) = look here / Season Pass, blue (`accent`) = calm/structure, green (`good`) = done/safe, red (`warn`) = stop.
- **Accurate.** Railway content comes only from the domain pack (`@/domain`), which carries sources. Never hard-code railway facts in screens.
- **Not slop.** Plain British English, short sentences, no em-dashes, no hype words ("unlock", "delve", "journey", "seamless"), no railway puns in UI copy.
- **Accessible.** Every tappable thing has an accessibilityLabel/role; respect reduced motion (`useReducedMotion` from react-native-reanimated); text contrast in both themes; tap targets 44pt+.
- **Fast.** Memoise rough drawings (Sketch does this; pass `deps`). Avoid re-generating large drawings on every render. 3D only mounts when visible.

## Foundation (read before building)
- `src/ui/tokens.ts`: palettes (`light`, `dark`), fonts `F`, `space`, `radius`, `type`.
- `src/ui/theme.tsx`: `useTheme()` → `{ c, dark }`.
- `src/ui/kit.tsx`: `Screen`, `Card` (tone "pass" | "board" | "sunk"), `Button` (kind "primary" | "secondary" | "pass" | "ghost"), `Chip`, `Segmented`, `Bubble`, `Row`, `Stat`, `Tappable`, `Eyebrow`, text styles `Hero H1 H2 H3 Body BodyB Small Hand Mono`, `tap()` haptics, `usePal()` sketch palette, `PaperGrid`.
- `src/ui/sketch.tsx`: `<Sketch w h pal paint deps seed />` renders a hand-drawn SVG; `Painter` API: `rect, circle, ellipse, line, path, poly, curve, linear, arc, text, image, group(transform, fn)`, plus `measure(text, size, font)`. Fill: pass a colour as the `fill` arg (solid) or `{fillStyle: "hachure", hachureGap}` in options. Coordinates are in viewBox units; it scales to container width.
- `src/state/store.ts`: zustand store persisted to AsyncStorage (`useStore`). Fields: profile, progress (stop, completed, quizBest, miles, streak), crew, companions, pass, loop, casts, passport, postcard, settings. Use `useStore(s => s.x)` selectors and `useStore.getState().set(s => ({...}))` to update.
- `src/domain/index.ts`: `pack` (the active DomainPack: lessons, trains, history, places, glossary, casts, companions, seasons, cliches), helpers `lessonById`, `trainById`, `castById`, `companionById`. Types in `src/domain/types.ts`.
- Routes (`src/app/`): tabs `(tabs)/index` Today, `(tabs)/line`, `(tabs)/mindcast`, `(tabs)/trains`, `(tabs)/you`; stack screens `lesson/[id]`, `train/[id]`, `postcard`, `world`, `explore`, `cast/[id]`, `cast/new`, `onboarding`, `pass`.

## Ownership (do not edit files you don't own; add new files under your feature folder)
| Area | Owner files |
|---|---|
| Learn | `src/features/learn/**`, `src/app/(tabs)/line.tsx`, `src/app/lesson/[id].tsx` |
| Trains | `src/features/trains/**`, `src/app/(tabs)/trains.tsx`, `src/app/train/[id].tsx`, `src/app/postcard.tsx` |
| World | `src/features/world/**`, `src/app/world.tsx` |
| Today and Explore | `src/features/today/**`, `src/features/explore/**`, `src/app/(tabs)/index.tsx`, `src/app/explore.tsx` |
| Mindcast, You, onboarding, pass, shell | lead engineer |
| Domain content | content team (`src/domain/railway/**`) |

## Rules
- Never run `npm install`/`npx expo install` or edit `package.json`/`app.json`. Installed: react-native-svg, roughjs, zustand, async-storage, expo-gl, three, @react-three/fiber, expo-location, expo-sharing, react-native-view-shot, expo-haptics, expo-linear-gradient, expo-media-library, expo-image-picker, expo-audio, expo-image, expo-symbols, reanimated, gesture-handler. If you truly need something else, say so in your report.
- Expo changes every SDK: check https://docs.expo.dev/versions/v58.0.0/ (or `https://docs.expo.dev/llms.txt`) before using an Expo API.
- Typecheck: `npx tsc --noEmit -p . 2>&1 | grep <your paths>`; fix all errors in your files.
- Visual check (once `src/domain/railway/*.ts` exist): `npx expo export -p web --output-dir <scratch>/web-<you>` then `node scripts/serve.mjs <dir> <port>` (unique port) in the background and `node scripts/shot.mjs http://localhost:<port> <outdir> /route ...`. Look at the screenshots and fix what looks wrong.
