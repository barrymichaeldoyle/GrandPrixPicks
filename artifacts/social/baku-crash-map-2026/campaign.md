# Baku crash map

Status: **not scheduled or published.** Two combined posters, revised on
21 September 2026. The separate corner and driver cards are superseded.

## Selected artwork

| Channel   | Asset                               | Size      |
| --------- | ----------------------------------- | --------- |
| Instagram | `baku-crash-map-2026-instagram.png` | 1080×1350 |
| X         | `baku-crash-map-2026-x.png`         | 1600×900  |

One image contains both the crash map and driver totals. The race-week
poster's oversized mixed-case Baku title, chartreuse and charcoal carry over.
The final artwork has **no architecture or generated imagery**: Barry asked
for clarity over busyness. Driver totals occupy the open space beside the lap,
with ties grouped under one number instead of individual bar charts.

The four old corner/driver exports and their public copies were removed.
The unused architectural illustration was also removed from this campaign.
The approved race-week artwork is retained in its own campaign directory.

## Data and scope

All figures are derived from `apps/web/src/lib/bakuCrashes.ts` and the shared
map model. The circuit uses `bakuCircuitGeometry.ts`; it is never generated
from an image prompt or redrawn by eye. Local Archivo fonts keep rendering
offline and repeatable.

- 57 curated incidents across nine weekends, 2016–2025.
- 51 incidents placed at 12 corners; six have no named corner.
- Turn 3: 11 incidents. Turn 15: 10. Turn 2: 7.
- Hülkenberg and Stroll: six each. Ricciardo: five.
- Ocon, Pérez, Räikkönen and Verstappen: four each.

Every driver with at least four incidents is shown. The old eight-driver
ranking cut through a four-way tie on three; the new grouping avoids that.
Driver counts mean involvement in archive incidents, not responsibility or
individual car totals. Multiple drivers can be involved in the same incident.
The map counts incidents, and the larger dots indicate more incidents.
Corner attribution follows the archive's stopped-car location rule.

This is historical, curated circuit data, not an exhaustive crash census or
advice about 2026 picks. Practice, qualifying, sprint sessions and races are
included. Do not describe the corner counts as cars claimed or the whole
archive as every crash at Baku.

## Draft captions

### X

Baku, 2016–2025: 57 incidents across nine race weekends in our crash archive.

Turn 3 has the most, with 11. Hülkenberg and Stroll lead the driver totals on six each.

### Instagram

Baku's crash archive, 2016–2025: 57 incidents across nine race weekends.

Turn 3 leads with 11 incidents, followed by Turn 15 with 10 and Turn 2 with seven. Hülkenberg and Stroll appear most often, with six incidents each.

The archive covers practice, qualifying, sprints and races. It is a curated record, with a source for each incident. Six incidents have no named corner and are not placed on the map.

#F1 #Baku #AzerbaijanGP

## Alt text

Chartreuse and charcoal Baku crash map poster covering 2016–2025. A circuit
outline has dots sized by incident count, a start/finish mark and a direction
arrow. Labels identify Turn 3 with 11 incidents, Turn 15 with 10 and Turn 2
with seven. Driver totals list Hülkenberg and Stroll with six each, Ricciardo
with five, and Ocon, Pérez, Räikkönen and Verstappen with four each. The
curated archive contains 57 incidents over nine weekends; six are unplaced.
Grandprixpicks.com appears at the bottom.

## Rendering and posting

Run `pnpm --filter @grandprixpicks/web social-baku-crash-map`.
This renders the two selected PNGs here and identical copies under
`apps/web/public/social/baku-crash-map-2026/`.

Both formats were visually checked; exported dimensions and public-copy
hashes were verified. The renderer was linted and formatted. No scheduling
or hosting changes are part of this revision. Before scheduling, host the
selected files and verify their hashes against these originals.
