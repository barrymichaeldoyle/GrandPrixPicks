---
name: publish-race-news
description: Research F1 news for the upcoming race weekend and publish what fans would want to know (sporting news that changes a pick, plus interesting paddock, technical and event news) to the Grand Prix Picks feed and race write-up. Use when asked to check for race news, add a news item, correct or retract one.
---

# Publish race news

Short, sourced news for a race weekend, shown in the activity feed and under
"What changed this weekend" on the race write-up. Full design in
`docs/race-news.md`.

## What to publish

**Publish what a fan following the weekend would want to know.** That is wider
than what changes a pick. A McLaren upgrade, a Williams weight saving, a
contract extension, a dry forecast: none of these changes a pick on its own, and
all of them belong on the write-up and in the feed. Do not drop a real,
sourced story because it has no session to name.

Two categories, and the choice is honest rather than generous:

- **`pick_related`** (the default): the story changes a session. Name every
  session it changes in `affectsSessions`; publishing rejects an empty list.
- **`general`**: interesting, sourced, but it changes no session. Pass
  `"category": "general"` and `"affectsSessions": []`; publishing rejects a
  general item that names sessions.

Never invent an impact to promote a story to `pick_related`. A part being
evaluated in FP1 is general until the team says it stays on the car.

Both categories go to the feed and the write-up by default. `feedSelected:
false` or `writeUpSelected: false` keeps one off a surface, e.g. a future
round's colour that should only be on its write-up.

Get sessions right on pick-related items. A grid penalty moves a race start and
leaves the qualifying classification untouched, so it is `["race"]` and not
`["quali","race"]` — see `/results-policy`. That field drives what the app tells
a player, so a careless value misinforms them.

## File it under the race it is about

`raceSlug` is the race the story is about, not the race that is up next.
Straight after a race, most of the news is about the race that just finished:
a lock-up that cost a podium, a stewards' decision, a team explaining its pace.
Those go on that race's slug (`azerbaijan-2026`), even though the next weekend
(`bahrain-2026`) is the one players are picking. Filed under the next race, a
Baku story shows up on the Bahrain write-up and gets a Bahrain label in the feed.

A story goes under the next race only when it changes something there: a grid
penalty handed out in Baku but served at Sepang is Sepang news. When a story is
really about the finished race but also matters for the next one, file it under
the finished race.

Still skip: gossip with no named source, stories sourced to another prediction
site, and anything already covered by an existing key (republish that one).

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

Always in this order. Every command goes through `scripts/gpp.mjs` (see
`docs/gpp-cli.md`), which prints one line per item instead of whole documents.
Drop `--prod` to rehearse against dev.

**1. See what exists.** This is the step that prevents duplicates.

```bash
scripts/gpp.mjs news list italy-2026 --prod          # one line per item
scripts/gpp.mjs news show italy-2026 <key> --prod    # one item in full
```

**Find candidates with the scan before searching the web.**

```bash
scripts/gpp.mjs news scan italy-2026 --prod
```

It reads eight F1 feeds (formula1.com, Autosport, Motorsport.com, RaceFans, The
Race, BBC, Sky, Crash), keeps what appeared since the race's newest item, and
drops stories whose URL is already a `sourceUrl` or whose headline matches a
filed one. A match that broke well after the filed item stays in, tagged
`newer than <key>`: read it, and if it firms the story up, republish that key. It groups the same story across outlets and ranks by weekend terms,
drivers and pick signals such as penalties, power units and replacements. The
score only sorts the list: whether a story belongs is still your call, under
"What to publish". Aftermath of the previous round prints in its own
"last round" section: file those under that round's slug, and spend the run on
the weekend ahead. `--days N` widens the window. `--all` also shows what it
filtered out, and it is the thing to check when a story you expected is
missing.

Use WebSearch only for what feeds miss: FIA documents and stewards' decisions,
team and Pirelli statements, the weather forecast, smaller outlets (none of
Bahrain's forecast, tyre or Mercedes-upgrade items came from a feed), or a
specific story the user mentions. Every
search result stays in context for the rest of the session, so one targeted
search is worth more than a sweep. Read a candidate with `gpp page <url>`
before writing it up. Its `published:` line is the `sourcePublishedAt`.

**A blocked page is not a skipped story.** If `gpp page` still cannot give
you the article text (a 403, a paywall, a page that only renders with
JavaScript), open it in Chrome and read it with `get_page_text` (load the
claude-in-chrome tools first). Only after that fails too, try another
outlet's version of the same story. Never drop a story, or write it from a
search summary, because the first fetch was refused.

**2. Rehearse.** Write the item to a JSON file in your scratchpad (an array
for several; they run one at a time in file order), then publish it. Without
`--apply` it is a dry run: it writes nothing and says whether it would create
or update.

```json
{
  "raceSlug": "italy-2026",
  "key": "antonelli-grid-penalty",
  "headline": "Antonelli takes a grid penalty at Monza",
  "body": "Mercedes has confirmed a full power unit change after the Barcelona and Silverstone failures. Ten places minimum, reported as a back-of-grid start.",
  "affectsSessions": ["race"],
  "driverCodes": ["ANT"],
  "sourceName": "Formula 1",
  "sourceUrl": "https://www.formula1.com/en/latest/article/...",
  "sourcePublishedAt": "2026-09-03T09:00:00Z"
}
```

```bash
scripts/gpp.mjs news publish $SCRATCH/antonelli.json --prod
```

`sourcePublishedAt` and `feedVisibleAt` take an ISO 8601 timestamp with an
explicit offset (for example `"2026-09-28T10:00:00+02:00"`) or milliseconds.
The server converts the string. The dry run echoes `sourcePublished` as a full
UTC ISO timestamp. Read it: a stamp that is well-formed and wrong is the one
mistake nothing else catches. A validation problem shows up in the preview as
`validationProblem` instead of throwing, so fix it before `--apply`.

**3. Publish.** The same command plus `--apply`. A first publish (not a
correction of an existing key) posts to the Discord #news channel
immediately, and to r/GPPicks within ten minutes — the dry run is the last
chance to catch a mistake, not the publish itself.

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
- **Write for the reader, never to vouch for the source.** The card already
  shows the source name and links it. A body that says "Sky Sport reports",
  "the team confirmed he would not participate", "the same clock time the other
  sources give" or quotes the stewards' legal wording ("wholly or
  predominantly to blame") is making a case to the editor that the item is
  sourced, and a reader sees that as the site defending itself. Checking the
  source is the editor's job and belongs in the run's report, not on the card.
  State the fact plainly: "Colapinto drops five places for the collision".
  Name another outlet in the body only when the fact is theirs alone and not
  confirmed, and then attribute the claim, not the checking.
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
  aggregators. Rejected unless it is a full `http(s)` URL. Check the body
  against the article's own text, not a summary of it:
  `scripts/gpp.mjs page <url>` prints the article (`--grep` to find a figure).
  WebFetch and search summaries have returned confident wrong answers.
- **`sourcePublishedAt`** — when the **source** published the story. Prefer an
  ISO 8601 string with an explicit offset, taken from the article's own date
  line: `"2026-09-28T10:00:00+02:00"`. Milliseconds still work. Set it on every
  item you can. The write-up page shows it beside the source name, and that page
  is read weeks later by somebody who wants to know when a penalty was handed
  down: `publishedAt` can only tell them when this command ran, and a batch of
  five items lands two seconds apart. Publishing refuses a seconds-epoch value
  and a date more than a day ahead; both refusals name the value and how it
  reads in UTC. On a dry run the same problem lands in `validationProblem`
  instead of throwing. Omit it when the source carries no date: blank is honest,
  a guess is a made-up date on a public page. It does **not** move the feed
  card, which keeps showing when it arrived.

## Publishing the starting grid

Saturday evening's grid is news like any other, and it goes out as one item
with the whole grid attached rather than as a sentence describing it. Put
`startingGrid` in the item file alongside the usual fields:

```json
{
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
  ]
}
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
- **`newsKey` links the note to the story behind it**, by the `key` of another
  item on the same weekend:
  `{"position": 6, "code": "PIA", "note": "3-place penalty", "newsKey": "piastri-monza-grid-penalty"}`.
  The write-up turns the note into a link to that card. State it rather than
  letting anything match on the driver: Antonelli had three Monza items, and
  the first one found by code would have captioned his grid slot with the tow
  he was giving Russell. Publishing refuses a key with no active item, and
  refuses the grid pointing at itself, so publish the stories before the grid.
  The dry run lists any such row in `missingNewsKeys` (with its position, code
  and whether the key is `unpublished` or `retracted`); it must be empty before
  the real call. Put the stories and the grid in one file, stories first:
  `news publish` runs them one at a time in file order, never in parallel.
  A `newsKey` needs a `note`, because the note is what the reader clicks: that
  also covers a driver who is where qualifying left them and the story is why
  qualifying went badly, e.g.
  `{"code": "VER", "note": "Rear axle problem", "newsKey": "verstappen-rear-axle-monza"}`.
  Set it on the rows that raise the question, not on every row.
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

```json
{
  "raceSlug": "madrid-2026",
  "key": "hadjar-madrid-return",
  ...
  "feedVisibleAt": "2026-09-08T06:00:00Z"
}
```

The dry run prints `feed held until …` when the item will be held, and nothing
when the card goes out now, so rehearsing tells you which of the two you are
about to do. Omit the field entirely for news about the current weekend.

## Corrections and mistakes

Firming up a fact is an **edit**: republish with the same key. "Ten places
minimum" becoming "confirmed back of grid" is not a second story.

Wrong item, or one that should never have gone out:

```bash
scripts/gpp.mjs news retract italy-2026 <key> --prod           # shows the item
scripts/gpp.mjs news retract italy-2026 <key> --prod --apply   # retracts it
```

Retracting deactivates the item and removes its feed event. The record stays, so
the mistake leaves a trail.

Filed under the wrong race: move it rather than retract and republish. A
republish is a new feed event, and a new feed event posts to Discord again.
`move` changes the race in place, retracted items included, and refuses the
whole call if anything would clash. Without `--apply` it is a dry run.

```bash
scripts/gpp.mjs news move bahrain-2026 azerbaijan-2026 <key> [<key>...] --prod
```

## Careful

- `--prod --apply` writes to the live feed that players read. Drop `--prod` to
  rehearse against dev.
- `gpp` needs `ops:*` deployed. If it says a function is not on prod yet, the
  raw `npx convex run --prod raceNews:<fn>` calls take the same JSON (with
  `"dryRun": true` for a rehearsal and epoch ms for dates).
- Never invent a fact to fill a field. If the source does not say it, it does not
  go in the body.
- Do not publish an item whose source is another prediction site.
