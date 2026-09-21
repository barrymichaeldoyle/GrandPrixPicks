# Baku crash map

Status: **not scheduled or published.** One poster per format, revised on
21 September 2026.

## Selected artwork

| Channel   | Asset                               | Size      |
| --------- | ----------------------------------- | --------- |
| Instagram | `baku-crash-map-2026-instagram.png` | 1080×1350 |
| X         | `baku-crash-map-2026-x.png`         | 1600×900  |

A poster, not an infographic. The image carries the race name, one line of
fact ("57 incidents since 2016"), the lap with a dot per corner sized by its
count, the two busiest corners as large numerals beside their dots (Turn 3,
11; Turn 15, 10), and the drivers most involved (Hülkenberg and Stroll, 6;
Ricciardo, 5). The driver block names everyone on the top two counts, so a
tie is never cut; the four-way tie on 4 stays in the caption.

The first revision also carried a legend, a "Crash map" subtitle, a date line,
a driver key and an archive qualification in the footer. Barry found it "too
wordy and not like a stand out social poster". None of those facts were
dropped: the top drivers came back as their own block at Barry's request, the
archive's scope is in the captions below, and the whole archive is on the
write-up the captions link to.

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

### X

No hashtags on the brand account.

> 57 incidents at Baku since 2016, and two corners stand out: Turn 3 with 11 and Turn 15 with 10.
>
> Every one is mapped, with a source, in our Azerbaijan GP preview:
> https://grandprixpicks.com/f1-2026-azerbaijan-grand-prix-predictions?utm_source=x&utm_medium=organic&utm_campaign=baku_crash_map_2026

### Instagram

> 57 incidents at Baku since 2016, and two corners stand out: Turn 3 with 11 and Turn 15 with 10.
>
> Hülkenberg and Stroll have been involved in the most, six each, then Ricciardo with five. Ocon, Pérez, Räikkönen and Verstappen have four each.
>
> The archive covers practice, qualifying, sprints and races across nine weekends, with a source for every incident. Six have no named corner and are not on the map. The full map is in our Azerbaijan GP preview, link in bio.
>
> #F1 #Baku #AzerbaijanGP

## Alt text

Poster on a charcoal background. "Baku" in large chartreuse letters, then "57
incidents since 2016". Below, the outline of the Baku City Circuit with a
chartreuse dot at each corner where incidents happened, larger dots for more.
Two corners are labelled with large numbers: Turn 3 with 11 and Turn 15 with 10. A list headed "Drivers most involved" shows Hülkenberg and Stroll with 6
and Ricciardo with 5. GrandPrixPicks.com in the bottom right.

## Rendering and posting

Run `pnpm --filter @grandprixpicks/web social-baku-crash-map` from the
repository root. It writes the two PNGs here and identical copies under
`apps/web/public/social/baku-crash-map-2026/`.

Before scheduling, deploy, then check that each public URL returns 200 and
hashes byte-identical to the file here: Buffer keeps whatever it fetched when
the post was created.
