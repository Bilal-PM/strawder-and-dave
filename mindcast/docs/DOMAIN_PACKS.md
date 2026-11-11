# Domain packs: the same app for another field or business

Everything specific to the railway lives in `src/domain/railway/`. The app shell (screens, drawing system, 3D, the Mindcast
method and integrity check, companions, the Loop, passes) only reads the `DomainPack` contract in `src/domain/types.ts`.

## To build "Groundwork for X"
1. Copy `src/domain/railway/` to `src/domain/<x>/` and replace the content:
   - `seasons.ts`: the big themes, mapped to the real calendar of that world (the railway uses heat, leaf fall, ice, floods).
   - `lessons.ts`: stops for Season 1, each at three depths, with key facts and sources, a quiz and a Mindcast lens.
   - `casts.ts`: seed Mindcasts written with the method (`docs/MINDCAST_METHOD.md`).
   - `glossary.ts`, `cliches.ts`: the field's real terms, and the clichés people reach for in that field.
   - `companions.ts`: characters from that world, with lines that teach.
   - `trains.ts`, `places.ts`, `history.ts`: the equivalent "collection" (aircraft, machines, buildings, products), places and dates.
2. Switch `src/domain/index.ts` to export the new pack, and set the brand in the pack's `brand` field.
3. Update `app.json` (name, bundle id, icon) and the colour tokens in `src/ui/tokens.ts` if the brand differs.

## What carries over unchanged
The method and integrity scoring, the three-depth lesson player, quizzes, the Loop and ticket, companions and unlocks,
streaks, passes, the postcard maker, the hand-drawn drawing system, and the open-world engine (swap the scene content).

## Business versions
A company pack can hold its own operating knowledge (assets, processes, safety rules, leaders' Mindcasts) for onboarding.
That is the Crew Pass offer: the same app, a private pack, a team board.
