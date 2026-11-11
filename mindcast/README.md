# Groundwork: Mindcast

The railway, explained from the ground up, and what it teaches about leading and delivering.
An iPhone app for children (Explorers), students and new joiners (Starters) and professionals (Leaders).

**Mindcast** is the product inside it: experienced people share knowledge in a way that sticks. Every Mindcast
starts from something real on the railway, explains the mechanism, and carries the *cause and effect* (not the
slogan) across to leadership and management. A built-in integrity check keeps it specific and free of clichés.

## What's in the app
| Tab | What it does |
|---|---|
| Today | History card, railway weather (what today's weather means for the track), live departures with delay reasons linked to lessons, next stop, featured Mindcast |
| Line | Season 1, The Permanent Way: 20 stops, each taught at three depths with an interactive drawing, a quiz and a Mindcast lens |
| Mindcast | The method, the feed, and a composer that scores your Mindcast as you write it |
| Trains | 35 UK classes drawn to scale, a 3D view, spec sheets with sources, and a postcard maker |
| You | Crew member, companions (with unlocks), the Loop (want, strategy, plan, do, learn) and a shareable ticket, Season Pass, settings |
| Open Line | An open 3D world: drive a train, read signals, feel braking distance, learn as you go |
| Explore | Great places to reach by train, with a rail passport |

## Run it on your iPhone (no Mac needed)
1. Install **Expo Go** from the App Store.
2. On any computer with Node 20+: `cd mindcast && npm install && npx expo start --tunnel`
3. Scan the QR code with the iPhone camera. The app opens in Expo Go.

## Ship it to the App Store
You need an Apple Developer account and a free Expo account.
```
npx eas-cli@latest login
npx eas-cli@latest build --platform ios --profile production
npx eas-cli@latest submit --platform ios
```
TestFlight first: `--profile preview` builds an internal-distribution app you can install on your own iPhone.

## Develop
```
npm install
npx expo start            # dev server
npm test                  # unit tests (integrity check, rules)
npm run typecheck
npx expo export -p web    # web build used for previews and visual QA
```
Docs: `docs/ENGINEERING.md` (architecture and rules), `docs/MINDCAST_METHOD.md` (the method),
`docs/VOICE.md` (tone), `docs/DATA_SOURCES.md` (APIs and licences), `docs/DOMAIN_PACKS.md` (reuse for other domains).

## Accuracy
Railway content lives in `src/domain/railway/` with a source on every fact (the user's engineering books, Network Rail's
permanent way booklet, Wikipedia/Wikidata). Anything not yet checked is marked `approx` or `unverified` and labelled in the app.
