# X posts after a news sweep

Select at most one X post per sweep, and the CLI allows two a day on the
channel for routine coverage. Confirmed grid penalties that change the race
starting order may exceed that daily limit; record the reason and source in
the selected post's `dailyCapException`. Possible future penalties and repeated
coverage do not qualify. Keep one post per sweep and normal spacing.
A strong story posts on the sweep that finds it: a grid penalty, a
driver swap, an engine change, a stewards' ruling, a result that moves the
title. Short of that, the account still says something once a day. The
evening sweep checks the `queue` line the CLI prints (posts on the channel
today, including the app's own results posts) and, if it is zero, selects
the day's most interesting story: a preview angle, an upgrade a team has
confirmed, a form-guide fact, a sourced paddock story. Only a livery, a fan
zone or a show car is never worth the day's post. The morning sweep posts
only a strong story.

Why so few: in the fortnight to 23 October 2026 the account sent 33 news
posts with a link each, and they averaged 38 impressions. X shows a link feed
to nobody. The posts that cleared 80 were live session results and short
reactions with no link. The account is a person following the weekend, not a
wire service: one post that says something beats twelve that summarise
Motorsport.com.

**Post shape.** The text carries no URL. The story's own card (the same image
its `?story=` link unfurls to) is attached as a native image, and the link
goes in a reply under the post, where it costs no reach. The CLI does both
from the selection: it refuses a URL in `text`, attaches
`/og/news?race=<slug>&story=<key>` for a race story, and threads `link` as the
second item. A global story has no card and goes out as text.

**Quote the source when it posted the story itself.** A team, the FIA or
Formula 1 announcing something on X is the best image we can have on the
post: their photo, on their licence, and our line above it in their replies.
Put the post's URL in `quote` and the CLI sends a quote post instead of the
card and reply link (a post quotes or links, never both). `gpp page <url>`
lists the X posts embedded in an article as `x posts:`, which is where a
team's post usually sits. Never attach a press photo as our own image: the
agencies file takedowns on X and a locked account is the one outcome that
undoes everything else.

**Copy.** Lead with the angle, not the outlet. Under 200 characters is the
norm. "Antonelli can win the title on Sunday. He needs the win with Russell
no higher than fifth." reads; "Mercedes have confirmed that both cars will
run the latest update package in Austin, Toto Wolff said on Tuesday" does
not. Product voice applies: no hashtags, no calls to action, no "BREAKING".

Use Buffer's GrandPrixPicks X channel. The operator CLI previews by default,
checks the existing X queue, and schedules selected posts 25 minutes apart.
`intervalMinutes` may be set between 20 and 30. Other scheduled campaigns and
recently sent posts count toward that spacing. An urgent development can use
the next available slot; set its requested start time accordingly. A post
that would be the third of a channel day (Africa/Johannesburg, or the
channel's own timezone) is skipped and reported unless the selected post has
a reviewed `dailyCapException` reason. The CLI requires pick-related race news
for an exception and records its reason in the preview and durable ledger.

## Session results on race weekends

The one post type that reliably gets seen, and the one that needs no
judgement, so the app posts it itself: `apps/backend/convex/socialPosts.ts`
scans published results every five minutes and schedules one post per race
and session through Buffer, ten minutes out. The classification card
(`/og/results`) is the image, the podium is the text ("United States GP
qualifying: Verstappen on pole, Leclerc second, Norris third."), the race
page is a reply. The `socialPosts` row is the double-post guard. A result
amended while the post is still queued cancels it and posts the corrected
classification; a result amended after the post went out is left alone.

The same poster makes two more cards, on the same journal and rules:

- **Drivers' championship after a race** (`/og/standings?after=<slug>`),
  25 minutes after the race result is published: "Antonelli leads Russell by 102. 5 rounds left."
- **What players picked** (`/og/consensus?race=&session=`), ten minutes after
  a session locks, once at least 25 players entered it. Below that the poster
  stays silent and switches itself on when the numbers arrive. This is the
  one card nobody else can make.

It needs `BUFFER_API_KEY` and `BUFFER_X_CHANNEL_ID` on the production
deployment and is a no-op without them, so dev never posts. These posts count
toward the two-a-day cap below, which the CLI reads from the Buffer queue.
No routine is involved: the news routine still does the editorial selection.
`gpp race` lists the weekend's app posts on an `x posts:` line and flags a
failed or stuck one with `!!`.

## Reading the numbers back

`gpp social stats [--days N]` prints the channel's sent posts for the window
by kind (quote, results, standings, consensus, news card, link, text) with
median and total impressions, likes, reposts, replies and clicks, plus the
three best posts. The Monday morning sweep includes the table in its report.
That is the only feedback loop the pipeline has; read it before changing a
rule.

## Timing

The 18:00 sweep schedules for the next free slot, which lands in the European
evening. The 08:00 sweep is 06:00 UTC, so a post scheduled straight away
lands at 07:25 in the UK and overnight in the Americas: a morning selection
sets `startAt` to `07:30:00Z` (09:30 CET) unless the story is urgent.

## At every sweep

1. Read `docs/product-voice.md`, publish the reviewed news and verify it live.
2. Check previously scheduled news, even when selecting no new X posts:

   ```sh
   pnpm gpp news social check --prod
   pnpm gpp news social check --prod --apply
   ```

3. Select the strongest development, if any, and write independent, factual
   X copy with no URL in it. Put the link in `link`: the race write-up with
   `?story=<key>` for one of the post's stories (see Link previews below; the
   CLI refuses a bare write-up link), or the story's own `sourceUrl`. Avoid
   forced calls to action, hashtags and repeated versions of the same update.
   Review any result spoilers in the social selection separately from push
   eligibility.
4. Save the selection alongside the campaign in `artifacts/social/`. Point
   `newsFile` at the JSON batch that was published; paths are relative to the
   selection file. That batch is the expected source snapshot.
5. Preview, read the exact copy and times, then apply within the task's
   authorized distribution scope:

   ```sh
   pnpm gpp news social artifacts/social/<campaign>/x-selection.json --prod
   pnpm gpp news social artifacts/social/<campaign>/x-selection.json --prod --apply
   ```

6. Report the scheduled times in the channel's timezone and commit the selection
   and updated `artifacts/social/news-sweeps/ledger.json` with the sweep.

## Selection format

```json
{
  "organizationId": "64f9a17b902afdecc48c8d02",
  "channelId": "6a6f4b8a99afb44349e9c0f4",
  "newsFile": "../../news/<published-batch>.json",
  "startAt": "2026-10-09T21:15:00+02:00",
  "intervalMinutes": 25,
  "posts": [
    {
      "keys": ["<published-story-key>"],
      "text": "<Reviewed X copy, no URL>",
      "link": "https://grandprixpicks.com/f1-2026-<race>-grand-prix-predictions?story=<published-story-key>",
      "expiresAt": "2026-10-10T09:00:00Z"
    }
  ]
}
```

`dailyCapException` is an optional non-empty reason of at most 240 characters,
reserved for confirmed grid penalties. It identifies the penalty and source;
the story must be pick-related and affect the race.

`keys` references stories in `newsFile`. Each key may appear only once in a
selection, and a selection holds one or two posts. `link` is optional; the
card image is attached automatically for a race story. `quote` (an X post
URL) replaces both: the post becomes a quote of that post. A group shares one post and must have supporting copy for every
included story. Global stories omit `raceSlug` in their news payload. A news
batch used for social must have unique keys.

Use explicit timezone offsets. The scheduler moves an elapsed `startAt` to at
least five minutes in the future and finds the first available slots. Choose
`expiresAt` based on when the post would become stale, for example the start of
the sprint for a sprint-grid story. The entire batch is refused if any post
cannot fit before its expiry. The expiry limits scheduling; it is not a
Buffer-side automatic cancellation timer.

## Link previews

X caches a link preview by URL, so every post linking the bare write-up shows
the same card. `?story=<key>` gives each post its own URL and its own card:
the write-up head (`raceWriteupPageHead` in `apps/web/src/lib/raceWriteupSeo.ts`)
swaps `og:image` to `/og/news?race=<slug>&story=<key>&v=<revision>`, rendered by
`raceNewsTemplate`: the race and flag, the story's headline, and its source and
date. No wordmark, round or driver chips: the post already names the account,
and X draws its ALT badge over the card's bottom-left corner. The
canonical stays the bare write-up, so this is not a new page. A key that is not
on the write-up (retracted, unselected, misspelt) falls back to the write-up's
own card, `/og/writeup?race=<slug>` (`raceWriteupTemplate`: race name and the
weekend's session times, right-aligned so X's ALT badge covers none of them).

The `v` revision is the story's last headline change, so a corrected headline
is a new image URL. X may still hold the old card for a post that already
went out.

## Corrections and retries

The command checks live headline, body, source URL, source date and affected
sessions against the news batch before scheduling. Retracted, feed-unselected
or embargoed stories are refused. It checks queued posts from its ledger on
every run, and `--apply` cancels any whose story has changed or expired. Select
the corrected version explicitly if it still merits a post.

Sharing an existing story again requires a changed news revision and
`"materialUpdate": true` on the new selected post. A spelling edit or another
outlet repeating the same report is not a material development. Unchanged
revisions and identical remote copy are skipped.

Buffer creates have no idempotency key. The CLI records each attempted create
before calling Buffer, saves confirmed IDs immediately, and reads the created
post back to verify its content and time. A retry reconciles an interrupted
create against Buffer before proceeding. If a request's outcome cannot be
established, it stops for inspection rather than creating another post.

Keep the ledger and use one operator checkout for live scheduling. A local
lock prevents concurrent applies in that checkout. After a hard interruption,
inspect Buffer and the ledger before removing `.gpp-news-social.lock`. If a
post was edited or removed manually in Buffer, reconcile its ledger record
before retrying; the CLI will stop rather than overwrite that intervention.

When `artifacts/automations/news-check/state.json` exists, the CLI additionally
loads the journal from its configured Git branch using the checkout's origin
remote. Applies acquire an exclusive remote lock and persist each journal
transition before continuing with Buffer writes. This supports fresh cloud
clones and uses their authenticated Git proxy. The local ledger is a snapshot;
the state branch is authoritative. Missing state, lock contention, an uncertain
push or an external state edit stops the operation. Locks are never stolen on
expiry: inspect interrupted Buffer work before manually releasing a stale lock.
The lock branch retains an append-only history: acquisition and release use
ordinary fast-forward pushes, and a released record has `owner: null`. Neither
branch deletion nor force-push is needed for normal operations.

These freshness checks run during sweeps and explicit `news social check`
calls. Buffer sends the scheduled copy independently; there is no background
news watcher or check at send time. Recheck pending posts when news changes,
especially before a session. News publication and editorial push selection
remain separate from X selection.
