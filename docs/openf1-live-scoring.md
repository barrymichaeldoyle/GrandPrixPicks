# OpenF1 paid access and as-it-stands scoring

Internal spec. Supersedes an earlier draft that assumed result publishing still
waits on a human. It does not: unattended publish shipped and runs on every
scoring session. What follows is scoped to what is actually missing.

Read `docs/product-voice.md` before writing any player-facing string here.

## What already exists

Do not rebuild these. Read them first.

| Concern                                                      | Where                                                             | State               |
| ------------------------------------------------------------ | ----------------------------------------------------------------- | ------------------- |
| Poll OpenF1 after a session, publish, score                  | `openF1Results.pollDueResults`, 5-minute cron                     | Live, unconditional |
| Session discovery, payload validation, driver-number mapping | `openF1Results.parseOpenF1Results`, `fetchOfficialClassification` | Live                |
| Publish + score + notify once                                | `results.autoPublishResults` → `publishResultsCore`               | Live                |
| Reconcile against the official classification                | `resultsRecheck`, at +3h / +12h / +72h (`lib/recheckSchedule.ts`) | Live                |
| Amend / rollback                                             | `results.adminRollbackResults`, admin UI                          | Live                |
| Deploy-time smoke test                                       | `openF1Results.smokeTest`                                         | Live                |
| Delay banner when Barry is away                              | `openF1Results.adminSetUnattended`                                | Live                |

`getDuePolls` takes every scoring session of every non-cancelled race in the
last four days and publishes the first valid result it sees. There is no flag
gating it and no admin step. A session reaches provisional scores with nobody at
a laptop today.

Two clarifications, because the earlier draft got both backwards:

- **`unattendedResultSessions` is not the auto-publish switch.** It raises a
  player-facing "results may be late" banner for sessions Barry cannot watch.
  Auto-publish runs regardless.
- **Notifications already resolve correctly.** First publication announces;
  every republish is silent (`shouldSuppressResultNotifications`, and
  `suppressNotifications: true` on both reconcile paths). This is a hard
  invariant from a past spam incident. Anything added here must preserve it.

## Do not add a grid-size sanity check

The earlier draft's headline rule was "reject unless exactly 22 classified
entries, positions 1..22 unique". **That rule would reject real races.**

Verified against OpenF1 for the 2026 Dutch Grand Prix (`session_key=11353`):

```
rows: 22
positions: [1..17, null, null, null, null, null]
```

Twenty-two rows, seventeen classified, five retirements carrying
`position: null`. A 1..22-unique check fails closed on an ordinary race and
pages a human for nothing, which is the precise failure the automation exists to
remove.

There is no hardcoded grid size anywhere in the results path. `BATCH_SIZE = 20`
in `results.ts` is a write-batching constant, unrelated to the grid. The existing
validation is already correct and already grid-size agnostic:

- unique driver numbers and unique non-null positions,
- classified positions contiguous from 1,
- retirements sorted into an unranked tail with `ranked: false`,
- every `driver_number` mapped to a current-round driver, unknown numbers throw,
- `dnf` / `dns` / `dsq` parsed, `dsq > dns > dnf` precedence in `toDriverStatus`.

Leave it alone. If a rule is added, it must be "classified + unranked equals the
round's entry count", never "classified equals 22".

## Work item 1: authenticate to OpenF1

The only part of the original Feature 1 that is genuinely missing.

`OPEN_F1_USERNAME` and `OPEN_F1_PASSWORD` are in `.env.local` and **no code
reads them**. Every request in `openF1Results.ts`, `resultsRecheck.ts` and
`practiceResults.ts` goes out anonymous.

Verified working:

```
POST https://api.openf1.org/token
  grant_type=password&username=…&password=…
→ 200 { "access_token": "…", "expires_in": "3600" }
```

Why it matters, in priority order:

1. **It removes the live-session 401.** OpenF1 closes anonymous access while any
   session runs and answers 401 with "live session in progress". That is the
   block `isLiveSessionRestriction` exists to tolerate, and the one that made a
   race-weekend deploy skew Convex ahead of web. Authenticated callers are not
   subject to it.
2. **Recheck can run during a session** instead of skipping its window.
3. It is a hard prerequisite for the live board, which reads inside that window.

Implementation:

- Token cache in a module-level variable inside the action, refreshed on
  expiry (1 hour) and on any 401. Do not store the token in a table.
- Add the header in `fetchJson`, the single choke point all three callers share.
- Credentials go in Convex env (`npx convex env set`), not `.env.local`, for
  both dev and prod. Convex env var **names** cap at 40 characters; the existing
  names fit.
- Keep the anonymous path working as a fallback so a token failure degrades to
  today's behaviour rather than losing results entirely.
- Extend `smokeTest` to assert the token exchange succeeds, but treat a token
  failure the same way `isLiveSessionRestriction` is treated: warn, do not fail
  the deploy. A deploy must not depend on OpenF1 billing being current.

Send OpenF1 a short commercial-use note when the subscription starts. Do not
hotlink Formula1.com headshots or radio URLs from their payloads.

## Work item 2: as-it-stands board

Only after work item 1 is in production and a weekend has passed with the
authenticated path publishing cleanly.

### What the player sees

On a locked race (and sprint race), on the race page only:

- Their Top 5 against the current running order, scored with the same
  `scoreTopFive()` rules (5 / 3 / 1 / 0).
- Their H2H against current teammate order, 1 point per pair.
- A weekend as-it-stands total against everyone with locked picks.
- A short note that the order is live and can change, including after the flag.

Not on the signed-out home page. No timing tower, no telemetry, no track map.

When official results publish, the live board disappears and real scores take
over. Nothing on this surface may write to `scores` or `h2hScores`.

### The running order is not the classification

`position` returned all 22 cars in an unbroken 1..22 for the same race where
`session_result` classified only 17. A retired car keeps its last known
position in the live feed.

So the live board will show a player points for a car that will not be
classified. The scores visibly move when the official result lands. This is
expected, and the copy has to make it survivable: say the order is live and can
change after the flag. Do not present a live total as a result.

### `position` is an event log, not a snapshot

608 rows / 70 KB for one full race, one row per position change per driver. Two
consequences the earlier draft missed:

- Reduce to a running order by taking the **latest row per driver**, then sort
  by position. Verified to reproduce a clean 1..22.
- Poll incrementally with OpenF1's `date>` filter. Re-fetching the whole session
  every 15 seconds is 70 KB × 360 ticks of pointless transfer.

### Worker: scheduler, not a cron

The earlier draft proposed `crons.interval` with seconds. `crons.interval` does
accept `{ seconds }`, but **a cron runs continuously**. A 15-second cron is
~2.6M invocations a month whether or not a car is on track.

Use a self-rescheduling action instead: start it when the session locks, have it
`ctx.scheduler.runAfter` its own next tick, and stop when either the window
closes (30 minutes after expected end) or `pollDueResults` publishes. That
confines the cost to the session, and reuses the lock and window logic in
`getFallbackWindow` rather than inventing a second clock.

Each tick:

1. Fetch `position` incrementally.
2. Reduce to the current order.
3. Skip the write entirely if the order is unchanged. Under safety car this is
   most ticks, and a skipped write is a subscription that stays quiet.
4. Recompute the standings blob and write both into one document.

### One cadence for everyone

Measured on prod, 2026-09-01: **37 users and 512 predictions**. The two
`userSeasonPasses` rows are Barry's own account and his wife's, comped rather
than sold, so **`pro` currently has no paying subscribers at all**. At that size
the fan-out arithmetic that would justify a free/paid tier split does not
apply.

A 90-minute race with, generously, 20 boards open at a 15-second cadence is
~7,200 subscription updates. That is noise against the paid Convex plan's
included calls. The cost case for tiering does not exist, and will not until the
audience is roughly two orders of magnitude larger.

So: **one `liveSnapshots` document, one cadence, every player, signed in or
not.** Because the cost ceiling is irrelevant at this size, spend it on the
product and run the single tier at 15 seconds rather than a minute.

Two consequences worth stating, so this is not silently re-litigated later:

- **Do not build the fast/slow split now.** It is real complexity (two
  documents, two queries, a plan check on a hot subscription path) bought
  entirely on speculation. A refresh-rate perk cannot retain subscribers the
  product does not have, and this spec's stated bar is growth and retention.
- **Keep the cadence a single named constant** and keep the `tier` field off the
  schema until something needs it. Adding a slow tier later is a worker change
  and a second document, not a redesign. That is the whole hedge; it costs one
  constant.

Revisit only when concurrent boards on one session reach the low thousands. The
first wall then is Convex concurrency (1,000 concurrent sessions, 16 concurrent
queries on S16), not storage and not call cost.

Skipping the write when the order is unchanged still matters, and matters more
than tiering ever did: under safety car it keeps most ticks silent for free.

### Scoring the field

Score every locked prediction in an **action**, not a mutation. Mutations cap at
1 second of user code and 32,000 documents scanned; an action gets 10 minutes
Node / 30 minutes Convex runtime. Batch the reads there, then write one
standings document.

At 37 users and 512 predictions the whole field is a single small read and one
standings document. Do not paginate, do not cap the blob, and do not build a
per-user rank index. Revisit when a standings document approaches Convex's 1 MiB
limit, which at roughly 40 bytes a row is thousands of players away.

A player's own points need no server work: the client already holds their picks,
so subscribe to the 22-row order and run `scoreTopFive()` locally. Zero extra
reads per tick.

### Suggested shape

```ts
liveSnapshots: {
  raceId: Id<'races'>,
  sessionType: 'quali' | 'sprint_quali' | 'sprint' | 'race',
  order: Array<{
    driverId: Id<'drivers'>,
    position: number,
    status?: DriverStatus,   // reuse @grandprixpicks/shared/driverStatus
  }>,
  standings: Array<{
    userId: Id<'users'>,
    rank: number,
    topFive: number,
    h2h: number,
    weekend: number,
  }>,                        // whole field; no cap needed at current scale
  source: 'openf1-position',
  updatedAt: number,
}
```

Index by `(raceId, sessionType)`. Reuse `DriverStatus` rather than three
booleans; the rest of the results path already speaks it.

### Qualifying is phase two

A flat 1..22 during Q1 is misleading for Top 5 scoring: P15 in Q1 is not P15 in
the session. Race and sprint race only at first. Revisit quali using the
session-shaped `duration` array, or only after that session's chequered flag.

## Order of work

1. Authenticate to OpenF1. Ship it. Confirm across one weekend that the
   live-session 401 is gone and recheck runs inside the window.
2. Extend the smoke test for the token exchange.
3. Race-only live board, one document, 15 seconds, everyone.
4. Reconsider quali only after that has run a weekend.

Do not debug a live board on the same afternoon as anything touching publish.

## Done when

- Every OpenF1 request carries a token, and a token failure degrades to
  anonymous rather than losing results.
- The live board never writes `scores` or `h2hScores`.
- No paid-tier gate was added to the live board.
- The live board disappears when official results publish, and reconciliation
  still wins afterwards.
- No grid-size assumption was added to the validation path.
