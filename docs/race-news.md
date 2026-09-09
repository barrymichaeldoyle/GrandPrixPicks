# Race News

Research and publish the stories that help fans follow a race weekend. Cover
both sporting developments and noteworthy event news.

A grid penalty belongs in the activity feed and the write-up. A special livery,
tribute or local celebration can also deserve coverage in the write-up, even
when it has no effect on predictions. Do not discard a useful story because it
does not change a pick.

## Why the mutation is the product

The authoring surface is `npx convex run`, not a form. The workflow this is
built for is: prompt an agent to research the weekend, and when it finds
something that matters, prompt it to publish. The admin portal is a phone
fallback for when the laptop is shut, and the realistic phone moment here is not
writing an item, it is **killing one an agent got wrong before a session locks**.
So the portal gets a list and a retract button, and no editor.

That inverts the usual priority. The function signature, its docstring and its
return value are the interface a person actually touches, and they are designed
to be read by something that will re-run them.

## Editorial rule

**Research the event, not just the picks.**

Use two publishing paths:

- Sporting news with a real effect on a session goes through `raceNews` and
  appears in both the feed and the write-up.
- Event news such as a special livery, a tribute, a launch or a local story
  belongs in the relevant write-up section, with a source and the event date
  where useful. Include it when it adds something a fan would want to know.

The current feed API requires a non-empty `affectsSessions` list. That is a
constraint of that publishing path, not a reason to omit event coverage.
Never invent a qualifying or race impact to fit a story into the feed.

Before finishing a weekend research task, check both sporting and event news
and account for both in the update. For example, Williams unveiling its 1981
colours for Madrid belongs beside the Jarama history; it should not disappear
from the task because the livery does not affect lap time.

It pays for itself downstream: `['race']` on a grid penalty is what lets the
weekend card flag the item on the Race tab and leave Qualifying alone, which is
[the results policy](https://grandprixpicks.com/results-policy) expressed as UI.

## Data

`raceNews`, keyed by `(raceId, key)`.

| field                     | why                                                             |
| ------------------------- | --------------------------------------------------------------- |
| `raceId`                  | Scopes the item to a weekend, so it retires when the race does  |
| `key`                     | Stable slug, e.g. `antonelli-grid-penalty`. The idempotency key |
| `headline`, `body`        | One line and one or two sentences on what it means for picks    |
| `affectsSessions`         | Required, non-empty. The editorial gate and the UI hook         |
| `driverCodes`             | Optional. Colours the card with the first driver's team         |
| `sourceName`, `sourceUrl` | Attribution, same standard as the write-up pages                |
| `sourcePublishedAt`       | Optional. When the source published it, shown on the write-up   |
| `startingGrid`            | Optional. The confirmed grid, on the item that announces it     |
| `active`                  | Retraction without deletion, so a mistake leaves a trail        |

### What `driverCodes` actually does

It sets the card's team colour, taken from the **first** code, on both surfaces
(`WeekendNewsSection` on the write-up and `RaceNewsItem` in the feed). It does
not draw driver badges: those were deliberately removed, and the colour is what
replaced them, so a run of news reads as a Ferrari story then a Williams one
rather than as grey blocks. Order the codes so the story's team comes first.

Two things that look like bugs and are not:

- **A driver who is not in the car this round still resolves.** The lookup hits
  the `drivers` table directly, so an injured or replaced driver keeps their
  code. `drivers:listDrivers` is the one that filters to the round's grid, and
  it is a different question: who can be picked. Hadjar was badgeable on the
  card announcing he was out.
- **`drivers.team` is the driver's current team**, so the colour follows the
  seat they hold now, not the one they held when the news broke.

`key` is the load-bearing field. Agents retry, and the same weekend gets
prompted about more than once, so publishing is an upsert rather than an insert.
Without it, three runs put three Antonelli items in the feed.

## Commands

```bash
# 1. what is already published for this weekend
npx convex run --prod raceNews:list '{"raceSlug":"italy-2026"}'

# inspect the operator audit trail, including retracted items
# (takes raceId instead of raceSlug too)
npx convex run --prod raceNews:listForOperators '{"raceSlug":"italy-2026"}'

# 2. rehearse
npx convex run --prod raceNews:publish '{
  "raceSlug": "italy-2026",
  "key": "antonelli-grid-penalty",
  "headline": "Antonelli takes a grid penalty at Monza",
  "body": "Mercedes has confirmed a full power unit change after the Barcelona and Silverstone failures. Ten places minimum, reported as a back-of-grid start.",
  "affectsSessions": ["race"],
  "sourceName": "Formula 1",
  "sourceUrl": "https://www.formula1.com/en/latest/article/...",
  "sourcePublishedAt": 1788428400000,
  "dryRun": true
}'

# 3. publish (same call without dryRun)

# 4. corrections and retraction
npx convex run --prod raceNews:retract '{"raceSlug":"italy-2026","key":"antonelli-grid-penalty"}'
```

`list` is the step that prevents duplicates. The `key` makes a repeat safe; `list`
is what stops the agent needing to guess whether it already ran.

## Writing a body

**Report the news; do not instruct the reader.** These bodies have two
surfaces, and the second one is public: the write-up page renders them under
"What changed this weekend" for anyone arriving from a search, who has no picks
in front of them. So a body opens on what happened, and any line about how to
read the session comes last and only when it changes something. "Treat Russell
as unpenalised at Monza" and "Use FP2 for your first comparison" were both cut
for this. The section ends with the scoring-policy note and every card links
"How these are scored", so an instruction in the prose is the weakest sentence
on the card as well as the one that dates fastest.

Three more rules, the first two earned the hard way on the Antonelli item.

**Be specific about numbers that came from the source.** "Takes a grid penalty"
is half a story; "at least 10 places, and further if they fit more new parts" is
the fact a player needs to act on.

**Never invent a position.** The first version of that item explained the
mechanic with "if he qualifies P4 he is classified P4, and starts P14". As an
illustration it is clear, and as something skimmed in a feed it is a tip: it
steers people to put Antonelli P4. Describe what a penalty does to a score in
general terms instead, and let the card's "How these are scored" link to
[the results policy](https://grandprixpicks.com/results-policy) carry the detail.

**One source per card.** A record holds one `sourceUrl`, so a fact that link
does not support does not belong in that body. Antonelli's Monza tow arrived
from formula1.com the morning after his penalty had been published against a
Motorsport.com report, and it became `mercedes-monza-qualifying-tow` rather than
a fourth sentence: its own source, and `["quali"]` where the penalty is
`["quali","race"]`.

## The starting grid

Saturday's grid rides on the news item that announces it, as
`[{position, code, note?}]`, rather than getting a table of its own. It is news
in the strict sense this page uses: it changes a race pick, it has a source, it
is corrected in place when the stewards move somebody, and a wrong one has to
come off the feed before lights out. Every one of those behaviours already
exists on a `raceNews` record, and a second table would have been a second copy
of all of them.

It stores codes and positions only, the same split `driverCodes` makes: who
drives for whom is round-scoped, so a stored team would be a second copy of a
moving fact. The write-up resolves it live and the feed event freezes the
resolved rows, exactly as `newsDrivers` does.

`publish` refuses a grid with a gap, a repeated position, the same driver twice
or a code the roster does not know, and reports `gridPositions` on a dry run.
That is the whole point of the validation: a grid one row short renders as a
perfectly tidy table, and the row that is missing is somebody's pick.

The two surfaces differ in one respect only. The write-up shows every place,
because it is a public page, the grid is what the reader searched for, and a
crawler does not press buttons. The feed closes on the top ten, because a card
twenty-two rows tall pushes the sessions either side of it off the screen.

## Why a driver starts where they do

A grid row's `note` says _what_ ("3-place penalty", "Pit lane"). The story
behind it is usually already published as its own item, so `newsKey` on the
entry points at it and the write-up turns the note into a link to that card.

```json
{
  "position": 6,
  "code": "PIA",
  "note": "3-place penalty",
  "newsKey": "piastri-monza-grid-penalty"
}
```

**State it; never match on the driver.** Antonelli had three Monza items, and
the first one found by code would have captioned his grid slot with the tow he
was giving Russell. Publishing validates the key against the weekend's active
items and refuses an unknown one, a retracted one, or the grid pointing at
itself.

**Only the key is stored.** The headline the reader sees is resolved from the
item at render, so correcting a penalty story corrects the grid caption with
it. Monza proved why that matters: the grid went out on Saturday evening and
Lawson's story changed on Sunday morning.

**A link needs a note**, because the note is what the reader clicks. That also
covers the case where a driver is exactly where qualifying left them and the
story is why qualifying went badly: give the row its reason too, e.g.
`{"code": "VER", "note": "Rear axle problem", "newsKey": "verstappen-rear-axle-monza"}`.

Set it on the rows that raise the question, not on every row. A driver who
qualified where they start prompts nothing, and a grid where every row is
underlined is a grid nobody reads.

## Two dates, two jobs

`publishedAt` is when we published. `sourcePublishedAt` is when the source did,
and it is the one a reader wants.

They are usually days apart, and within a batch `publishedAt` is worse than
approximate: five items published in one run land two seconds apart, in whatever
order the agent happened to call them. That is fine for what it does, which is
ordering, and useless as a date.

**The write-up page shows `sourcePublishedAt` and nothing else.** It is read
long after the weekend by somebody who arrived from a search, and "Antonelli
takes a penalty" means a different thing on Wednesday than it does an hour
before the race. It renders as a `<time datetime="...">` beside the source, in
UTC: the page is server-rendered into HTML a crawler reads and a cache hands to
everybody, so a viewer-local date would either mismatch on hydration or serve
one visitor's timezone to the next.

**The feed shows arrival time and keeps doing so.** Its stamp answers "what is
new since I last looked", which is when the card appeared, not when the fact
became true. Backdating a Thursday story found on Saturday would file it under
cards the reader has already scrolled past. This is the same reasoning that
freezes `createdAt` on an edit.

**Ordering stays on `publishedAt` everywhere**, including the write-up page.
Sorting one surface by a field that most older items do not have would shuffle a
weekend into an order that is neither chronology nor arrival.

Set it from the source's own date line. Milliseconds, not seconds — publishing
refuses a seconds-epoch value and hands back the corrected number, because
untouched it dates a 2026 penalty to 1970 and renders as an ordinary date. It
also refuses a date more than a day in the future, and allows anything inside
that, since a source stamps its own timezone. The dry run echoes the date back
as `sourcePublished: "2026-09-05"` rather than the epoch, because a wrong but
well-formed timestamp is the one mistake validation cannot catch and nobody
proof-reads `1788680139597`.

Omit it when the source carries no date. Blank is honest; a guess is a date on a
public page that we made up.

## Feed behaviour

News is a `race_news` feed event: **authorless**, like `lineup_change`, which the
feed's scoping already treats as visible to everyone. It is the site talking
rather than a player, and it belongs to nobody's activity.

**Placement is inline and chronological.** An item published between sessions
lands between the result groups either side of it, which is where it is useful
and which gives a weekend's feed some variation instead of an unbroken run of
scores. Pinning it would buy prominence on Friday and look stale by Sunday.

**Corrections edit in place.** Republishing with the same key updates the
existing feed event rather than posting a second one, exactly as
`results_amended` converts a `score_published` when a stewards' decision moves
the classification. "Ten places minimum" becoming "confirmed back of grid" is an
edit, not news.

**A later round's news can wait its turn.** `feedVisibleAt` (ms epoch) holds the
feed card until a moment you choose, while the write-up page shows the item the
instant it is published. That split is the whole feature: a Madrid story is
worth indexing the day it breaks, and worth nothing to somebody whose picks are
for Monza, so publishing it a week early should not push it above the weekend
they are playing. Omit the field for news about the current weekend and nothing
changes.

The release is a scheduled job per item, cancelled and re-booked when you
republish, and cancelled by `retract`. It re-reads the record when it fires, so
a story corrected twice during its embargo goes out as it finally reads, and it
does nothing for an item that was retracted or has already appeared. An embargo
on an item that is _already_ in the feed is ignored rather than obeyed: taking
something back is what `retract` is for, and a correction must never silently
pull a card. A missed release is recoverable by hand:

```bash
npx convex run --prod raceNews:releaseToFeed '{"raceId":"jd7...","key":"..."}'
```

## Deliberately not doing

**No notifications.** Not push, not in-app, not for now. Publishing news that
wakes a phone is one prompt away from the result-email incident that put three
guards in `notifications.ts`, and the feed is the right place to prove this
first. An opt-in in-app category for F1 news is a reasonable later step, and
opt-in is the word that matters.

**No cap per weekend.** A busy weekend with several real items is a better feed
than a quiet one, and the editorial rule is the limit that counts.

**No automated ingestion.** No news API filters for "changes an F1 prediction",
so an automated feed would be noise with a source link. The judgement is the
feature.

## Later

**Driver codes are stated, never parsed.** The Antonelli item names Russell in
its body while being a story about Antonelli, so scanning the prose would badge
the wrong driver confidently. They are validated against the roster at publish,
because the alternative is a card that renders one badge short weeks later and
still looks fine. The write-up resolves them live; the feed event stores the
resolved snapshot, frozen, the way `seatMoves` does, because a news item belongs
to one weekend and the seat as it was then is the right one to show against it.

1. **Write-up pages read the same records.** The hand-written "Two things to know
   before FP1" section duplicates facts that will already be in `raceNews`. One
   record, both surfaces.
2. **Session-scoped flag on the weekend card**, using `affectsSessions`.
3. **Opt-in in-app notifications**, if the feed proves it earns attention.
