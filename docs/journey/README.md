# The development journey

LINESIDE, from its first rough prototype to today, milestone by milestone. Every screenshot here was re-captured from the original commit (`tools/journey/capture.js`), at the same two sizes: desktop 1440×900 and phone 390×844. Nothing has been retouched, and the rough early shots are left rough on purpose.

**Ready-to-post images** are in [`social/`](social/):

| File | Use it for |
|---|---|
| `then-and-now.jpg` (1600×900) | A landscape before and after post |
| `then-and-now-sq.jpg` (1080×1350) | Portrait feeds |
| `timeline.jpg` | Every milestone in one image |
| `<milestone>.jpg` (1600×1000) | One card per milestone, for a carousel or a thread |

To rebuild them after adding a milestone, run `python3 tools/journey/collage.py`. It reads [`milestones.json`](milestones.json).

---

## Timeline

### 01 · 23 Feb 2026 · The first prototype: a tiny office in a dark box
A small pixel-art office game: you walk up to your team, have a chat and watch the meters move. It was playable, but the game filled a fraction of the screen and it didn't work on a phone.

![](01-first-prototype/desktop-office.jpg)

| Title | Dialogue | Phone |
|---|---|---|
| ![](01-first-prototype/desktop-title.jpg) | ![](01-first-prototype/desktop-dialogue.jpg) | ![](01-first-prototype/mobile-office.jpg) |

### 02 · 24 Feb 2026 · Warmer colours, same small office
Nine quick versions later, it had a warmer colour scheme, a PPE locker, monthly reports and a bigger map. It was still the same small box.

![](02-warmer-office/desktop-office.jpg)

| Title | Monthly report | Phone |
|---|---|---|
| ![](02-warmer-office/desktop-title.jpg) | ![](02-warmer-office/desktop-report.jpg) | ![](02-warmer-office/mobile-office.jpg) |

### 03 · 14 Jun 2026 · Tried a new engine and a ready-made art pack. Reverted the same day
The game was moved to a game engine with a ready-made art pack. The original look and feel won, so it was rolled back the same evening. Not every step is forward.

![](03-engine-trial/desktop-office.jpg)

| Character select | Phone |
|---|---|
| ![](03-engine-trial/desktop-select.jpg) | ![](03-engine-trial/mobile-office.jpg) |

### 04 · 15 Jun 2026 · Stepping outside: a first town
The first outdoor space: a road, a pond and three buildings to walk between.

![](04-first-town/desktop-town.jpg)

| Phone |
|---|
| ![](04-first-town/mobile-town.jpg) |

### 05 · 16 Jun 2026 · An opening trailer and a busier town
An opening trailer, people walking about, cars on the road, and signposts to the doors.

![](05-trailer-and-town/desktop-town.jpg)

| Trailer | Phone |
|---|---|
| ![](05-trailer-and-town/desktop-trailer.jpg) | ![](05-trailer-and-town/mobile-town.jpg) |

### 06 · 26 Sep 2026, 00:38 · The judgment engine: big calls under pressure
The idea that became LINESIDE: big calls made with incomplete information, whose consequences ripple into later weeks. It also gained a proper phone layout and a shareable result card.

![](06-judgment-engine/desktop-big-call.jpg)

| Title | Phone |
|---|---|
| ![](06-judgment-engine/desktop-title.jpg) | ![](06-judgment-engine/mobile-big-call.jpg) |

### 07 · 26 Sep 2026, 01:05 · LINESIDE: a cinematic reboot
A new name, a painted valley and characters with proper portraits. It was all conversation, with no world to walk around.

![](07-lineside-reboot/desktop-dialogue.jpg)

| Title | Phone |
|---|---|
| ![](07-lineside-reboot/desktop-title.jpg) | ![](07-lineside-reboot/mobile-title.jpg) |

### 08 · 26 Sep 2026, 07:27 · A world you can walk, side-on
The first walkable LINESIDE: a side-on 2.5D world.

![](08-walkable-side-on/desktop-office.jpg)

| Title | Phone |
|---|---|
| ![](08-walkable-side-on/desktop-title.jpg) | ![](08-walkable-side-on/mobile-chapter.jpg) |

### 09 · 26 Sep 2026, 07:45 · Open world, top-down
Eighteen minutes later, the world became a free-roaming valley seen from above.

![](09-open-world/desktop-site.jpg)

| Title | Phone |
|---|---|
| ![](09-open-world/desktop-title.jpg) | ![](09-open-world/mobile-site.jpg) |

### 10 · 26 Sep 2026, 08:42 · Chapter 1, "Make the Case": playable, but the world felt wrong
The full Chapter 1 story: renewing the track, and Marjorie, the 1961 railcar. It played end to end, but the verdict on the world was blunt. Roads connected backwards, entrances weren't marked, and everything was cramped and illogically placed.

![](10-chapter-1/desktop-town.jpg)

| Title | Chapter card | Phone |
|---|---|---|
| ![](10-chapter-1/desktop-title.jpg) | ![](10-chapter-1/desktop-chapter.jpg) | ![](10-chapter-1/mobile-chapter.jpg) |

### 11 · 26 Sep 2026, 11:20 · Rebuilt properly: a specialist AI team, a validated map and a tile world
Rebuilt the way a game studio works, with a dedicated AI agent for each discipline: game design, level design, narrative, learning design, art, audio, engineering and QA. A UK rail project-manager reviewer checked the engineering logic before sign-off.

- The map was laid out and validated first, with a real road hierarchy, marked entrances and PPE gates.
- It was then drawn as a tile world.
- An automated test suite plays the chapter through on desktop and phone.

![](11-studio-rebuild/desktop-forecourt.jpg)

| The line at Beck Bridge | The depot and Marjorie | The village hall |
|---|---|---|
| ![](11-studio-rebuild/desktop-beck-bridge.jpg) | ![](11-studio-rebuild/desktop-depot.jpg) | ![](11-studio-rebuild/desktop-village-hall.jpg) |

| Title | Phone: forecourt | Phone: the line |
|---|---|---|
| ![](11-studio-rebuild/desktop-title.jpg) | ![](11-studio-rebuild/mobile-forecourt.jpg) | ![](11-studio-rebuild/mobile-beck-bridge.jpg) |

### Next · The visual overhaul (in progress)
A full art pass on the same validated map: painted, higher-detail art, characters twice the size, and lighting. Each stage is added here as it lands.

---

## Adding a milestone

1. Capture: `node tools/journey/capture.js <NN-name>`. This captures the working tree; add `--rev=<commit>` for a past commit. Frames land in `tests/out/journey/<NN-name>/`, with a contact sheet at `tests/out/journey/index.html`.
2. Pick 3–4 desktop frames and 1–2 phone frames. Save them as JPEG (quality 88) in `docs/journey/<NN-name>/`, named `desktop-<view>.jpg` or `mobile-<view>.jpg`. Reuse the view names of the milestone before, so they line up.
3. Add an entry to `milestones.json` and a section above.
4. Run `python3 tools/journey/collage.py`. The "now" side of `then-and-now` is always the latest milestone.

**Rules:**
- Never replace or retouch an earlier milestone.
- Never use a frame the capture marks `FLAG`. That means it shows a real organisation's name or a retired character name.
