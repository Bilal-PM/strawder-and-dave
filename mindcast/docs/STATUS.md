# Status (11 November 2026)

## Verified in the build environment
- `npm run typecheck`: clean. `npm test`: 76 tests pass, including every seed Mindcast and lesson lens passing the integrity check as "strong".
- iOS render test (`src/__tests__/screens.test.tsx`): all 17 screens render through React Native's iOS code path (jest-expo, `Platform.OS = "ios"`, native-only files such as `*.native.tsx`) with no React errors. GL drawing is stubbed because there is no GPU in CI, and animations jump to their end state.
- iOS bundle: `npx expo export -p ios` compiles to Hermes bytecode (6.9 MB), so every native-only import (3D canvas, sharing, haptics, location) resolves.
- Web build: all main screens (Today, Line, lesson, Mindcast, composer, Trains, train detail, You, Explore, Open Line, Pass, Postcard, onboarding) screenshot cleanly at iPhone size in light and dark with no console errors.
- Expo Doctor: 18 of 20 checks pass; the other 2 need Expo's servers, which this environment can't reach.

## Not yet verified (needs a Mac or an iPhone)
- Running on a real iPhone or the iOS Simulator. Highest risk: the 3D views (expo-gl), slider gestures in diagrams, the share sheet, Save to Photos and location for passport stamps.
- Live departures and weather inside the app on a phone (the web preview has no network; the APIs answer from the server side).

Fastest way to check: `npx expo start --tunnel` on your own computer and open it in Expo Go, or an EAS preview build (docs/LAUNCH.md).

## Content still labelled in the app
- 21 train classes "Approx." (mostly heights the source doesn't give).
- 12 history cards and 7 places shown as "Draft" until rechecked (Wikipedia and Wikidata were rate-limiting during verification). Details at the top of `src/domain/railway/history.ts` and `places.ts`.

## Decisions for you
- Departures: TransitRadar has no published terms. Confirm with them or move to the Rail Data Marketplace.
- Weather: Open-Meteo free tier is non-commercial only.
- Name: "Groundwork" clashes with an established UK charity name; check with the UK IPO.
