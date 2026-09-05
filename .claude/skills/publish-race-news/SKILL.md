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

## Name the drivers

`driverCodes` is optional but nearly always worth setting. It puts the driver's
badge and team colour on the card, which is what makes a reader see a Mercedes
story before reading a word of it.

State it; never let it be inferred from the text. The Antonelli item names
Russell in its body while being a story about Antonelli, so anything scanning
the prose would badge the wrong driver with a straight face.

Pick the driver whose **pick** is implicated, which is not always the one in the
headline. "Luke Browning drives the Williams in FP1" is `["ALB"]`: Browning is
not on the roster and cannot be picked, and the point of the item is that Albon
is in the car for everything that counts. Include a second driver only when the
news genuinely moves their pick too, the way Antonelli's penalty may put him on
tow duty for Russell.

Codes are validated against the roster at publish, so a typo fails loudly rather
than shipping a card with a silently missing badge. Leave it off entirely for
news about a team, a circuit or the weather.

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
  "driverCodes": ["ANT"],
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
- **`body`** — one to three sentences, and they are reporting. Lead with what
  happened and who it happened to, then, if it still needs saying, one closing
  clause on how to read the session. These bodies are not feed-only: the
  write-up page renders every one of them under "What changed this weekend",
  which is a page we want strangers to find, and a card that opens by telling
  the reader what to do with their picks reads as a tip sheet rather than as
  news. "Browning takes over Albon's Williams for Friday morning. Albon is back
  in the car from FP2, so FP1 is not a read on Williams pace" beats "Use FP2 for
  your first comparison of Albon and Williams".
- **Never address the reader's picks in the imperative.** "Treat Russell as
  unpenalised" and "Use FP2 for your first comparison" are the shape to avoid.
  The section already ends with the scoring-policy note and every card links
  "How these are scored", so the instruction is both redundant and the weakest
  sentence on the card. State the fact and let it do the work.
- **One story per key, one source per card.** A new fact the item's `sourceUrl`
  does not support is a new item with its own source, not a fourth sentence on
  an existing body. It usually has a narrower `affectsSessions` too: Antonelli's
  Monza penalty is `["quali","race"]`, the tow he gives Russell in qualifying is
  `["quali"]`.
- **Never invent a position.** "If he qualifies P4 he starts P14" reads as a
  tip, not an illustration: a player who skims it puts that driver P4. Say what
  the penalty does to a score in general terms and let the card's "How these
  are scored" link carry the rest. Numbers that came from the source, like the
  size of a penalty, are the ones to be specific about, and the size is the
  first thing a reader wants: "at least 10 places" is the fact, "takes a grid
  penalty" is half a story.
- **`sourceUrl`** — the primary source. Prefer formula1.com or the team over
  aggregators. Rejected unless it is a full `http(s)` URL.

## Publishing the starting grid

Saturday evening's grid is news like any other, and it goes out as one item
with the whole grid attached rather than as a sentence describing it. Pass
`startingGrid` alongside the usual fields:

```bash
npx convex run --prod raceNews:publish '{
  "raceSlug": "italy-2026",
  "key": "monza-starting-grid",
  "headline": "The Monza grid is set",
  "body": "Gasly starts his maiden pole alongside Russell...",
  "affectsSessions": ["race"],
  "sourceName": "Formula 1",
  "sourceUrl": "https://www.formula1.com/en/results/...",
  "startingGrid": [
    { "position": 1, "code": "GAS" },
    { "position": 2, "code": "RUS" },
    { "position": 6, "code": "PIA", "note": "3-place penalty" }
  ],
  "dryRun": true
}'
```

The write-up page renders every place; the feed card opens on the top ten with
the rest a tap away. Both read the one record, so a correction fixes both.

- **All of it or none of it.** Positions must run 1 to N with no gaps and no
  repeats, and every code is checked against the roster. The dry run reports
  `gridPositions`, so count it against the field before the real call: a grid
  one row short renders as a perfectly tidy table with somebody's driver
  missing from it.
- **`note` is why a driver is not where qualifying left them**, e.g.
  `3-place penalty`, `Engine penalty`, `Pit lane`. It is a caption beside a
  name, not a sentence, and it is capped at 60 characters. Leave it off for
  anyone starting where they qualified.
- **`affectsSessions` is `["race"]`.** A grid is where a race starts from. It
  does not touch the qualifying classification, which is what we score quali
  on: see `/results-policy`.
- **Leave `driverCodes` off.** A grid belongs to no one driver, and the card
  takes its team colour from the first code: setting one would paint the whole
  grid card in one team's colour.
- **Correct it in place.** A late stewards' decision that moves the grid is a
  republish under the same key with the corrected array, not a second item.

## News for a later round

News that breaks this weekend about a *future* one is worth publishing the day
you find it: the write-up page is what gets indexed, and it wants the content
early. The feed does not. Somebody reading it is picking this weekend, and a
Madrid story above an unlocked Monza session is noise wearing a source link.

`feedVisibleAt` (ms epoch) splits the two. The write-up page shows the item
immediately; the feed card waits until the moment you name, which for news about
the next round is normally the day after the current race finishes.

```bash
npx convex run --prod raceNews:publish '{
  "raceSlug": "madrid-2026",
  "key": "hadjar-madrid-return",
  ...
  "feedVisibleAt": 1788760800000,
  "dryRun": true
}'
```

The dry run echoes `feedVisibleAt` back when the item will be held, and omits it
when the card goes out now, so rehearsing tells you which of the two you are
about to do. Omit the field entirely for news about the current weekend.

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
