# Race News

Short, pick-relevant news items attached to a race weekend, written by an agent
and shown in the activity feed.

Antonelli taking a grid penalty at Monza changes who you put in your race Top 5
and leaves your qualifying picks untouched. That is the kind of thing this
carries. A tribute livery is not, however good the story.

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

**Publish only what changes a pick.**

The rule is enforced by the schema rather than by this paragraph.
`affectsSessions` is required and must be non-empty, so publishing an item means
naming the sessions it changes. An agent that cannot answer that is holding
something that does not belong in the feed.

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
| `driverCodes`             | Optional. Puts the driver badge and team colour on the card     |
| `sourceName`, `sourceUrl` | Attribution, same standard as the write-up pages                |
| `active`                  | Retraction without deletion, so a mistake leaves a trail        |

`key` is the load-bearing field. Agents retry, and the same weekend gets
prompted about more than once, so publishing is an upsert rather than an insert.
Without it, three runs put three Antonelli items in the feed.

## Commands

```bash
# 1. what is already published for this weekend
npx convex run --prod raceNews:list '{"raceSlug":"italy-2026"}'

# inspect the operator audit trail, including retracted items
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
  "dryRun": true
}'

# 3. publish (same call without dryRun)

# 4. corrections and retraction
npx convex run --prod raceNews:retract '{"raceSlug":"italy-2026","key":"antonelli-grid-penalty"}'
```

`list` is the step that prevents duplicates. The `key` makes a repeat safe; `list`
is what stops the agent needing to guess whether it already ran.

## Writing a body

Two rules earned the hard way on the Antonelli item.

**Be specific about numbers that came from the source.** "Takes a grid penalty"
is half a story; "at least 10 places, and further if they fit more new parts" is
the fact a player needs to act on.

**Never invent a position.** The first version of that item explained the
mechanic with "if he qualifies P4 he is classified P4, and starts P14". As an
illustration it is clear, and as something skimmed in a feed it is a tip: it
steers people to put Antonelli P4. Describe what a penalty does to a score in
general terms instead, and let the card's "How these are scored" link to
[the results policy](https://grandprixpicks.com/results-policy) carry the detail.

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
