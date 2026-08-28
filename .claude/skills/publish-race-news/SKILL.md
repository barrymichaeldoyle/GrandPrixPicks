---
name: publish-race-news
description: Research F1 news for the upcoming race weekend and publish anything that changes a prediction to the Grand Prix Picks activity feed. Use when asked to check for race news, add a news item to the feed, correct or retract one.
---

# Publish race news

Short, pick-relevant news for a race weekend, shown in the signed-in activity
feed. Full design in `docs/race-news.md`.

## The rule that decides everything

**Publish only what changes a pick.**

A grid penalty changes one. A rookie taking a seat for FP1 changes how Friday
should be read, so it changes one. A tribute livery does not, however good the
story: that belongs on a write-up page, not in somebody's feed.

The test is mechanical. Name the sessions the item changes. If the honest answer
is "none", do not publish it. `affectsSessions` is required and rejected when
empty, so the schema asks this question whether or not you do.

Get it right per session. A grid penalty moves a race start and leaves the
qualifying classification untouched, so it is `["race"]` and not
`["quali","race"]` — see `/results-policy`. That field drives what the app tells
a player, so a careless value misinforms them.

## The loop

Always in this order.

**1. See what exists.** This is the step that prevents duplicates.

```bash
npx convex run --prod raceNews:list '{"raceSlug":"italy-2026"}'
```

**2. Rehearse.** Same call you intend to make, plus `"dryRun": true`. It writes
nothing and tells you whether it would create or update.

```bash
npx convex run --prod raceNews:publish '{
  "raceSlug": "italy-2026",
  "key": "antonelli-grid-penalty",
  "headline": "Antonelli takes a grid penalty at Monza",
  "body": "Mercedes has confirmed a full power unit change after the Barcelona and Silverstone failures. Ten places minimum, reported as a back-of-grid start.",
  "affectsSessions": ["race"],
  "sourceName": "Formula 1",
  "sourceUrl": "https://www.formula1.com/en/latest/article/...",
  "dryRun": true
}'
```

**3. Publish.** The same call without `dryRun`.

**4. Report what happened.** The return says `created`, `updated` or
`republished`. Say which, and say which sessions it affects.

## Writing the fields

- **`key`** — a stable slug for the story, not for the run:
  `antonelli-grid-penalty`, `browning-williams-fp1`. Republishing with the same
  key **edits the existing item in place**, which is what you want when a fact
  firms up. A new key posts a second item.
- **`headline`** — one line, plain. What happened, and to whom.
- **`body`** — one or two sentences. Lead with what it means for a pick, not
  with the news. "Albon races, so Friday morning is not a read on Williams pace"
  beats "Browning has been announced for FP1".
- **`sourceUrl`** — the primary source. Prefer formula1.com or the team over
  aggregators. Rejected unless it is a full `http(s)` URL.

## Corrections and mistakes

Firming up a fact is an **edit**: republish with the same key. "Ten places
minimum" becoming "confirmed back of grid" is not a second story.

Wrong item, or one that should never have gone out:

```bash
npx convex run --prod raceNews:retract '{"raceSlug":"italy-2026","key":"..."}'
```

Retracting deactivates the item and removes its feed event. The record stays, so
the mistake leaves a trail.

## Careful

- `--prod` writes to the live feed that players read. Drop the flag to rehearse
  against dev.
- Never invent a fact to fill a field. If the source does not say it, it does not
  go in the body.
- Do not publish an item whose source is another prediction site.
