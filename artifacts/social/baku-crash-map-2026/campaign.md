# Baku crash map

Status: **scheduled** in Buffer for Tuesday 22 September 2026, 12:45 SAST
(10:45 UTC), on X and Instagram. Post IDs and asset hashes are in
`buffer-schedule.json`. The images attach from grandprixpicks.com, verified
byte-identical to the files here before scheduling.

## Selected artwork

| Channel   | Asset                               | Size      |
| --------- | ----------------------------------- | --------- |
| Instagram | `baku-crash-map-2026-instagram.png` | 1080×1350 |
| X         | `baku-crash-map-2026-x.png`         | 1600×900  |

A poster, not an infographic. The image carries the title "F1 Baku Crash
Map", one line of fact ("57 incidents since 2016"), the lap with a dot per
corner sized by its count, the two busiest corners as large numerals beside
their dots (Turn 3, 11; Turn 15, 10), and a "Drivers most involved" list: one
row per driver with count, flag and full name, for everyone on the top three
counts (Hülkenberg and Stroll 6; Ricciardo 5; Ocon, Pérez, Räikkönen and
Verstappen 4), so no tie is cut.

The first revision also carried a legend, a "Crash map" subtitle, a date line,
a driver key and an archive qualification in the footer. Barry found it "too
wordy and not like a stand out social poster". Barry then asked
for the drivers back as individual rows with full names, including everyone
on 4, and for the title "F1 Baku Crash Map". The archive's scope is in the
captions, and the whole archive is on the write-up they link to.

## Data and scope

All figures are derived from `apps/web/src/lib/bakuCrashes.ts` and the shared
map model. The circuit uses `bakuCircuitGeometry.ts`, never an image prompt or
a hand drawing.

- 57 curated incidents across nine weekends, 2016–2025.
- 51 incidents placed at 12 corners; six have no named corner.
- Turn 3: 11 incidents. Turn 15: 10. Turn 2: 7.
- Hülkenberg and Stroll: six each. Ricciardo: five.
- Ocon, Pérez, Räikkönen and Verstappen: four each.

Driver counts mean involvement in an archive incident, not responsibility;
several drivers can share one incident. Corner attribution follows the
archive's stopped-car rule. This is a curated record, not every crash at Baku,
and not advice about 2026 picks. Say "incidents", not "crashes" or "cars
claimed".

## Captions

Written against the write-up's own definition (`BakuCrashMap.tsx`): an
incident ended in a red flag, a retirement or a stewards' collision note, and
is placed at the corner where the car stopped. Say "incidents", never
"crashes" or "cars claimed", and say "involved", never "caused".

### X

No hashtags on the brand account.

> 57 incidents at Baku since 2016. Turn 3 has had the most with 11, then Turn 15 with 10.
>
> We count an incident when it ended in a red flag, a retirement or a stewards' collision note. Each one is listed with its source in our Azerbaijan GP preview:
> https://grandprixpicks.com/f1-2026-azerbaijan-grand-prix-predictions?utm_source=x&utm_medium=organic&utm_campaign=baku_crash_map_2026

### Instagram

> 57 incidents at Baku since 2016. Turn 3 has had the most with 11, then Turn 15 with 10.
>
> We count an incident when it ended in a red flag, a retirement or a stewards' note about a collision, in practice, qualifying, sprints or races, across nine race weekends. Each one is placed at the corner where the car stopped. Six have no named corner, so they're in the total but not on the map.
>
> The driver counts include every driver involved in an incident, not only the one at fault.
>
> Each incident is listed with its source in our Azerbaijan GP preview. Link in bio.
>
> #F1 #Baku #AzerbaijanGP

## Alt text

Poster on a charcoal background titled "F1 Baku Crash Map", with "F1 Baku" in
large chartreuse letters, then "57 incidents since 2016". Below, the outline
of the Baku City Circuit with a chartreuse dot at each corner where incidents
happened, larger dots for more. Turn 3 is labelled 11 and Turn 15 is labelled 10. A list headed "Drivers most involved": Nico Hülkenberg 6, Lance Stroll 6,
Daniel Ricciardo 5, Esteban Ocon 4, Sergio Pérez 4, Kimi Räikkönen 4, Max
Verstappen 4. GrandPrixPicks.com at the bottom.

## Rendering and posting

Run `pnpm --filter @grandprixpicks/web social-baku-crash-map` from the
repository root. It writes the two PNGs here and identical copies under
`apps/web/public/social/baku-crash-map-2026/`.

Before scheduling, deploy, then check that each public URL returns 200 and
hashes byte-identical to the file here: Buffer keeps whatever it fetched when
the post was created.
