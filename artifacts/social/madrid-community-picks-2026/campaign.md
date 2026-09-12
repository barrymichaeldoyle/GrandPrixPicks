# 2026 Spanish Grand Prix (Madrid) community picks

Post-qualifying recap of the community's P1 predictions at Madrid.

Rendered by `apps/web/scripts/render-community-picks.mts`, which is the reusable
template. Add a `Campaign` entry and run
`npx tsx scripts/render-community-picks.mts` from `apps/web`.

## Status

- **Qualifying: ready to post, not yet scheduled.** Assets are rendered
  locally. Nothing is deployed or in Buffer yet — do that before scheduling,
  per `docs/convex-cicd.md` deploy conventions and the asset-hosting note
  below.
- **Race: not run yet.** Race predictions for this same Madrid weekend lock at
  lights out (2026-09-13, race start), so the CTA below points at that, not at
  a future race.

## Qualifying

Counts of players who put each driver in P1: ANT 9, LEC 1, RUS 1, VER 1, NOR 0
(pole). 12 entrants total.

Source: `consensus:getSessionConsensus` (`raceId` for `madrid-2026`,
`sessionType: "quali"`) for the predicted counts, `results:getResultForRace`
(same race, `sessionType: "quali"`) for the actual classification. Queried
directly against prod on 2026-09-12.

### X

Draft copy:

> Race picks close before lights out tomorrow. Make yours.

Asset: `madrid-community-picks-qualifying-x.png`

### Instagram

Draft copy:

> Race picks close before lights out tomorrow. Make yours.
>
> Link in our profile.
>
> #F1 #MadridGP #F1Predictions

Asset: `madrid-community-picks-qualifying-instagram.png`

### Alt text

Bar chart of Grand Prix Picks players' P1 predictions for 2026 Spanish Grand
Prix qualifying in Madrid. Kimi Antonelli leads with nine picks, Charles
Leclerc, George Russell and Max Verstappen have one each. Lando Norris has
zero picks and his bar is marked as pole, the smallest bar on the card.

### Copy notes

- Nobody predicted Norris for pole: his bar is the zero-count case the
  template was built to handle (see the Monza qualifying reference card).
  The image carries that fact; the copy doesn't restate it.
- The nudge points at this weekend's own race picks, not a future race,
  because they are still open and lock inside 24 hours of this card existing.
- Same three-hashtag pattern as `monza-community-picks-2026`: `#F1`, the race
  hashtag from `races.hashtag` (`#MadridGP`, not `#SpanishGP` — matching
  Monza's use of the circuit name over the country name), and
  `#F1Predictions`.

## Design notes

Same template and conventions as `monza-community-picks-2026/campaign.md`:
raw counts not percentages, one heading (circuit/year/session in accent, then
what's counted), winner badge marks the pick's own bar, zero-count draws the
accent nose alone, no totals/full names/logo.
