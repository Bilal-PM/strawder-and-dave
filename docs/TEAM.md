# LINESIDE: studio team and production pipeline

The game is built the way a professional game studio builds one: fixed roles, each with a clear deliverable, one person who integrates, and nothing reaching the client without QA and subject-matter sign-off.

## Roles

| Discipline | Role | Owns | Deliverable |
|---|---|---|---|
| Direction | **Game Director & Producer** (lead) | Vision, priorities, integration, the build, client communication | One coherent build; decides between conflicting recommendations |
| Design | **Game Designer / UX lead** | Core loop, onboarding, pacing, wayfinding, UI flow | Prioritised UX and design fix list |
| Design | **Level Designer** | The map: zoning, road hierarchy, placement, entrances and exits, interiors | Validated tile map and placements (JSON) |
| Design | **Narrative Director / Lead Writer** | Story bible, cast voices, cold open, dialogue, humour | Story bible, cold open, dialogue polish pass |
| Design | **Learning Designer** | Learning outcomes, assessment, facilitation, L&D positioning | Outcomes map, facilitator guide, website copy |
| Art | **Art Director** | Reference look, style guide, asset sourcing and licensing | Style spec, licensed asset list, gap list |
| Art / Tech | **Environment and technical art** (lead-implemented) | Tile renderer, autotiling, lighting, props | The rebuilt world |
| Audio | **Audio Director** | Score, ambience, SFX (procedural, no asset licences) | `js/audio.js` |
| Engineering | **Lead Engineer** (lead) | Engine, gameplay systems, the Director, save, performance | Working code |
| QA | **QA Lead** | Automated tests: playthroughs, gating, reachability, layout, performance | `tests/` suite and a bug list |
| Subject matter | **UK Rail Project Manager** | Credibility of the engineering, sequencing, safety and assurance logic; first playtester | Error list with exact fixes; sign-off |

## Pipeline

1. **Pre-production.** The specialists research and write specs in parallel: art style and assets, level layout, UX review, rail logic review, story, learning design, audio, test harness.
2. **Integration plan.** The Game Director consolidates the specs into one build plan and resolves any conflicts between them.
3. **Production.** The world is rebuilt from the art and level specs; content fixes come from the rail PM, narrative and learning reports; UX and onboarding fixes come from the design review.
4. **QA.** The automated suite runs on desktop and mobile: playthroughs, gating, reachability, save/resume, layout and performance.
5. **Expert sign-off.** The rail PM replays the new build as a first-time professional player.
6. **Release.** Commit, push, publish and report to the client.

## Content rules

- Humour is warm and relatable, never dark or rude.
- Names are ordinary and UK-relatable.
- No real suppliers, rail organisations, regulators or brands are named.
- The engineering logic follows UK practice and is explained in plain English.
