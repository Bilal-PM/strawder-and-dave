# Launch pack: Groundwork on the App Store

## 1. Accounts you need
- **Apple Developer Program** (£79/year in the UK at the time of writing; check the current price). Enrol as an organisation if Groundwork will be a company, so the seller name is the company, not you personally.
- **Expo account** (free) for EAS Build, Submit and Update.
- Optional later: RevenueCat or StoreKit for the Season Pass, Supabase for accounts and shared Mindcasts.

## 2. Build and test
```
cd mindcast
npx eas-cli@latest login
npx eas-cli@latest build --platform ios --profile preview     # installs on your registered iPhone
npx eas-cli@latest build --platform ios --profile production  # App Store build
npx eas-cli@latest submit --platform ios                      # sends it to App Store Connect / TestFlight
```
Use TestFlight with 10 to 20 people first: a mix of a parent and child, two students, two new joiners, two engineers and two leaders. Ask each for one thing that confused them and one thing they'd share.

## 3. App Store listing (draft)
- **Name:** Groundwork: Railway, explained
- **Subtitle:** Learn the railway. Lead like it.
- **Category:** Education (secondary: Reference)
- **Age rating:** 4+. There is no public feed: a Mindcast can be sent as a link through the share sheet, and the person who opens it sees it marked "Not checked by Groundwork" before choosing to save it. If you later add a public feed, you will need reporting and blocking tools and a higher rating.
- **Promotional text:** The railway explained from the ground up: drawings you can play with, trains drawn to scale, live departures, and Mindcasts that carry real engineering into how we lead.
- **Description:**
  How does the railway actually work? Why do rails buckle on hot days, why can't a train just stop, and what does any of it teach us about leading big work?
  Groundwork answers in plain words and hand-drawn pictures, at three depths: Explorers (children), Starters (students and new joiners) and Leaders (professionals).
  • The Line: 20 stops on the permanent way, each with an interactive drawing, a quiz and a Mindcast
  • Mindcast: a method for sharing experience that sticks, with an integrity check that keeps it specific and free of clichés
  • Trains: 35 UK classes drawn to scale, in 2D and 3D, with spec sheets and sources
  • Today: railway history, what today's weather means for the track, and live departures with the reasons behind delays
  • The Open Line: drive a train through a small world and feel what signals and braking distance really mean
  • Postcards, a crew member, companions and the Loop, a simple way to turn learning into action
  Everything you learn is free. Facts carry sources, and anything not yet checked is labelled.
- **Keywords:** railway,train,engineering,track,learn,careers,leadership,STEM,signals,trains
- **Screenshots:** 6.9" iPhone: Today, Line, a lesson with the buckle drawing, Mindcast composer with the integrity check, Trains 3D, a postcard.

## 4. Privacy (App Store "nutrition label")
This version stores everything on the device. Answer:
- **Data collected:** None. (Location is used on device for weather and the rail passport and is not sent anywhere except as coordinates to the weather service; Apple treats on-device use without collection as "not collected", but if you prefer, declare "Coarse location, not linked to you, used for app functionality".)
- **Tracking:** No.
- Permission texts are set in `app.json` (`NSLocationWhenInUseUsageDescription`, photo library).
- Add a privacy policy URL (a simple page saying the above) before submission.

## 5. Before you submit
- [ ] Every fact shown to users is `checked`, or labelled `approx`/`unverified` in the UI. Today: 21 train classes are `approx` (mostly heights missing from the source), 12 history cards and 7 places are marked draft. See the comments at the top of `src/domain/railway/*.ts` for exactly what is outstanding.
- [ ] Open-Meteo: move to their commercial plan or to the Met Office DataHub before charging money (see DATA_SOURCES.md).
- [ ] Live departures: confirm the data provider's terms allow app use; for production, register with the Rail Data Marketplace for the official feed.
- [ ] Run `npm test`, `npm run typecheck`, and a TestFlight round.
- [ ] Children: no purchases, no sharing between users, no ads. Keep it that way for a 4+ rating.
- [ ] Employer check: confirm your employment contract allows a side business and that no client information appears in content.
- [ ] Trademarks: check "Groundwork" with the UK IPO (Groundwork UK is an established charity name); choose the final name before submission.
