# Data sources

Where Groundwork's live and bundled data comes from, the terms, and what has to change before launch.
Owner: Today and Explore (`src/features/today/**`, `src/features/explore/**`).

The app calls these services directly from the phone. Nothing goes through a Groundwork server.
Every live panel shows when it was last updated, keeps the last good copy on the phone (AsyncStorage,
`gw.cache.*` keys), and says plainly when it is showing an old copy or cannot connect. No example data is
ever shown as if it were live.

## Live

### Weather: Open-Meteo
- Endpoint: `https://api.open-meteo.com/v1/forecast` with `daily=temperature_2m_max,temperature_2m_min,precipitation_sum,wind_gusts_10m_max,weather_code`, `forecast_days=7`, `timezone=Europe/London`. No key.
- Code: `src/features/today/services/weather.ts`. Cached for 30 minutes per place.
- Licence: data CC BY 4.0, attribution "Weather data by Open-Meteo.com" (shown on the card).
- **TODO before launch:** the free API is for **non-commercial use only**. Before Groundwork charges money or
  carries paid features, move to Open-Meteo's commercial plan (`customer-api.open-meteo.com` with an API key)
  or to the **Met Office Weather DataHub** (site-specific daily forecast). The swap is one function
  (`loadForecast`) as long as it returns the same `DayWx[]`.
- Location: only requested when the user taps "Use my location" (foreground permission). The stored place is
  rounded to 2 decimal places (about 1 km) and named after the nearest big station or city. Coordinates are
  sent to Open-Meteo to get the forecast and nowhere else.

### Railway weather rules
Not a data source, but they turn the forecast into words, so they are listed here.
`src/features/today/services/railImpacts.ts` (unit tested in `services/__tests__`):

| Rule | Trigger | Links to |
|---|---|---|
| Very hot rails | max at or above 30°C | s1-08 (buckles) |
| Hot rails | max at or above 25°C | s1-07 (stressing) |
| Frost | min at or below 0°C | s1-14 (points) |
| Snow | WMO code 71-77, 85, 86 | s1-14 |
| Leaf fall | October to December, gusts 40 km/h or more, or any rain | Season 2 event "Leaf fall" |
| High winds | gusts 70 km/h or more | s1-15 (inspection) |
| Heavy rain | 20 mm or more in the day | s1-09 (drainage) |

Week events: Buckle Watch (any hot day), Ice on the line (frost or snow, November to March), Leaf fall
(any leaf fall day). The event with the most days wins; ties go heat, then ice, then leaf fall.
These are general guidance written for learners, not operational warnings, and the card says so.

### Live departures: TransitRadar (National Rail Darwin)
- Endpoint: `GET https://transitradar.co.uk/api/v1/board/{CRS}?rows=14` (OpenAPI spec at
  `https://transitradar.co.uk/openapi/v1.json`, docs at `https://transitradar.co.uk/scalar/`).
- Why: it is the only reliable source we found that is **keyless**, covers every GB station by CRS code, and
  returns Darwin's **plain-English delay and cancellation reasons** plus station notices in one call.
- Terms as published: the free tier is anonymous and rate limited per IP; a key (`X-Api-Key`, free on request
  by email) raises the limit. The app reads an optional key from `EXPO_PUBLIC_TRANSITRADAR_KEY`. TransitRadar
  is independent and says it is not an official source, so the board says "If the station screens disagree,
  trust the station." Data underneath is National Rail Enquiries' Darwin feed (open data licence).
- The API sends no CORS headers, so the **web preview cannot load it** (the board shows its honest error
  state, or the TfL fallback in London). The iPhone app is not affected.
- **TODO before launch:** confirm with TransitRadar that use inside a published app is welcome at our expected
  volume (get a key), and plan to move to the official Darwin feed via the **Rail Data Marketplace**
  (`raildata.org.uk`, "Live Departure Board" / LDBWS) behind a small proxy, with "Powered by National Rail
  Enquiries" attribution.
- Cached for 60 seconds per station; refreshed on focus, every minute while visible, and on pull of "Refresh".

### London fallback: TfL Unified API
- Endpoints: `GET https://api.tfl.gov.uk/StopPoint/{id}/Arrivals` and `GET https://api.tfl.gov.uk/Line/{ids}/Status`. Keyless (rate limited), CORS enabled.
- Only used when TransitRadar fails, and only for the 12 London stations where TfL publishes rail arrivals
  (Elizabeth line, London Overground): LST, PAD, SRA, ZFD, EUS, CLJ, EAL, BKG, RMF, IFD, RMD, STL. The
  StopPoint id is the NaPTAN code with `9100` replaced by `910G`.
- TfL gives predictions, not booked times, so those rows say "live estimate". Line status reasons become notices.
- Licence: TfL open data terms, attribution "Powered by TfL Open Data" (shown on the board).

### Delay reasons to lessons
`reasonTopic()` in `services/departures.ts` maps Darwin reason text to the course (first match wins):
slippery rails or leaves → Season 2 leaf fall; signalling, track circuit → Season 2; engineering works,
possession, overrun → s1-17; trespass → s1-19; heat, buckle → s1-08; flooding, landslip → s1-09; points, ice,
snow → s1-14; defective track, broken rail, track inspection, speed restriction → s1-15; trees, high winds →
s1-15. Reasons about people being hit by a train or taken ill are shown as written and **never** linked to a
lesson. If a lesson id does not exist yet, the chip opens the Line tab at the season instead.

## Bundled (no network)

### Stations: `src/features/today/services/stations.ts` (124 stations)
- Selection and CRS codes: ORR "Estimates of station usage", Table 1410, April 2024 to March 2025
  (`https://dataportal.orr.gov.uk/statistics/usage/estimates-of-station-usage/`), the busiest 80 stations by
  entries and exits plus regional stations so every part of Great Britain is covered. A few central London
  metro-style stations (Elizabeth line core, Overground interchanges) are left out.
- Coordinates: DfT NaPTAN rail access nodes, ATCO area 910
  (`https://naptan.api.dft.gov.uk/v1/access-nodes?dataFormat=csv&atcoAreaCodes=910`), joined by station name.
- Both under the Open Government Licence v3.0.
- Northern Ireland stations are not included: NI Railways is not in the National Rail Darwin feed.

### Explore station coordinates: `src/features/explore/stationCoords.ts`
- Smaller stations near great places (Glenfinnan, Ribblehead, Dawlish and so on), from the same NaPTAN file.
  Used for the rail passport check (within 1.5 km of the station, or of the place itself if the station is not
  bundled, for example in Northern Ireland).

### Map: `src/features/explore/gbmap.ts`
- Outline from world-atlas 2.0.2 `countries-50m` (Natural Earth 1:50m, public domain), projected with
  `x = OX + (lon + 8.3) * C * K`, `y = OY + (58.8 - lat) * K` into a 600 x 900 viewBox and simplified.
  Orkney, Shetland and tiny islands are left out.
- Main lines (`places.ts`, `LINES`) are a hand simplification for orientation, not a network map.

### History, places, lessons
- From the domain pack (`src/domain/railway/**`), each item with its own sources, shown on the card.

## Refreshing the bundled data
`stations.ts` and `stationCoords.ts` were generated by joining the ORR Table 1410 CSV (name, TLC, rank) to
the NaPTAN CSV (`CommonName` minus " Rail Station", active `RLY` rows) by name, with a handful of manual
aliases (for example "Preston (Lancs)" to "Preston"). Redo this yearly when ORR publishes new station usage
figures (usually December), and check new or renamed stations by hand.
