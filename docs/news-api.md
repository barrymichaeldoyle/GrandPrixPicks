# News API

A keyed JSON API over the news the site already publishes, designed to be
used by other people's bots, apps and displays. The free plan is open: any
signed-in account creates its own key on `/f1-news-api/keys` (see
[Self-serve keys](#self-serve-keys)). The paid plans are not: they will be a
paid subscription, and `/f1-news-api` is the landing page that collects a
waiting list for them until then.

| piece                 | where                                                                  |
| --------------------- | ---------------------------------------------------------------------- |
| Read model, keys      | `apps/backend/convex/newsApi.ts`                                       |
| Public entry points   | `apps/backend/convex/newsApiServe.ts`                                  |
| Self-serve keys       | `apps/backend/convex/newsApiAccount.ts`                                |
| Webhooks              | `apps/backend/convex/newsApiWebhooks.ts`                               |
| No-key sample         | `apps/backend/convex/lib/newsApiSample.ts`                             |
| Topics                | `packages/shared/src/newsTopics.ts`                                    |
| Translations          | `apps/backend/convex/newsApiTranslations.ts`                           |
| Languages             | `packages/shared/src/newsLanguages.ts`                                 |
| HTTP routes           | `apps/web/server/routes/api/v1/`                                       |
| Query parsing, errors | `apps/web/server/lib/newsApi.ts`                                       |
| OpenAPI document      | `apps/web/server/lib/newsApiSpec.ts`, served at `/api/v1/openapi.json` |
| Public page           | `apps/web/src/routes/f1-news-api.tsx`                                  |
| Waiting-list form     | `apps/web/src/routes/-news-api/NewsApiWaitlist.tsx`                    |
| Key page              | `apps/web/src/routes/f1-news-api_.keys.tsx`, at `/f1-news-api/keys`    |

## It owns no news

`raceNews:publish` and `globalNews:publish` stay the only way a story is
written (`docs/race-news.md`), so the publishing skill and the automation feed
the API without knowing it exists. The API is a read model over those two
tables: no third copy, nothing to keep in step.

The web and mobile apps keep reading Convex directly, because they want live
subscriptions and an HTTP poll would be a step back. "Feeds our application"
means one store with two doors, not the app calling its own HTTP API. The
consumers that should move to the HTTP API are the ones that already poll over
HTTP: see [Consumers](#consumers).

What is served is everything `active`, whatever `feedSelected`,
`writeUpSelected` or `feedVisibleAt` say. Those fields place a story on our
own surfaces; a story held out of the feed for a week is on its write-up page
the moment it is published, so it is public then.

## Plans

Every key is on a plan (`NEWS_API_PLANS` in `newsApi.ts`, the one place these
numbers live):

| plan         | requests a minute | sees a story                   | translations |
| ------------ | ----------------- | ------------------------------ | ------------ |
| `free`       | 10                | 24 hours after it is published | no           |
| `hobby`      | 60                | as it is published             | no           |
| `commercial` | 300               | as it is published             | yes          |

The free plan's delay applies everywhere: the list leaves out stories younger
than 24 hours, `get` answers 404 for one, and the change feed settles at now
minus 24 hours instead of five seconds. A key issued before plans existed has
none and counts as `commercial`.

Only a `commercial` key can have [webhooks](#webhooks), which is what the
landing page promises, or read a story in another language
([Languages](#languages)).

## Endpoints

All but the sample and the OpenAPI document need `Authorization: Bearer
<key>`, and every keyed response is `cache-control: private, no-store`.

Every response to a request that was counted (see [Metering](#metering))
carries:

- `ratelimit-limit`: the plan's requests a minute;
- `ratelimit-remaining`: what the key has left;
- `ratelimit-reset`: seconds until every request is back. The limit is a
  token bucket that refills steadily, so one request comes back sooner.

Past the limit the answer is 429 with the same headers and `retry-after` in
seconds, which is when the next request will go through.

`GET /api/v1/openapi.json` needs no key. It is the same contract as this page
in OpenAPI 3.1, for people who generate a client. A test holds its parameters
and status codes to the parsers'; the item's fields and the plan numbers are
kept in step by hand.

An unknown or repeated parameter is a 400 on every endpoint, because a
misspelt filter that was ignored would answer with the whole list and look
like success.

### `GET /api/v1/news`

| parameter          | meaning                                                         |
| ------------------ | --------------------------------------------------------------- |
| `limit`            | 1 to 100, default 25                                            |
| `cursor`           | `nextCursor` from the previous response                         |
| `updated_since`    | ISO 8601 with a zone. Switches to the change feed               |
| `race`             | Race slug, e.g. `italy-2026`. Excludes race-independent stories |
| `season`           | A year, e.g. `2026`. See below                                  |
| `published_after`  | ISO 8601 with a zone. `publishedAt` at or after it              |
| `published_before` | ISO 8601 with a zone. `publishedAt` before it                   |
| `driver`           | Three-letter code, e.g. `LEC`                                   |
| `team`             | Team name, e.g. `Ferrari`, any casing                           |
| `topic`            | One of the [topics](#topics)                                    |
| `lang`             | Language to read in. See [Languages](#languages)                |

```json
{ "data": [ ... ], "nextCursor": "…", "hasMore": true }
```

**Two orders.** Without `updated_since`: live stories, newest published first,
and `nextCursor` is null on the last page. With it: the change feed (below).

**A cursor carries its order.** With a `cursor`, the request reads in the
order that issued it and `updated_since` is ignored, so a poller can send its
cursor alone. Send the same filters with it.

**The filters:**

- `race` and `season` read the race a story is filed under. A
  race-independent story has no race, so `season` counts it in the UTC year
  it was published: a December 2026 story about the 2027 line-ups is in 2026.
- `driver` matches the drivers a story names (`drivers`), not the rows of a
  starting grid. A code nobody has written about yet is an empty list, not an
  error.
- `team` matches the story's `team` field. A name that is not on the current
  grid is a 400 `unknown_team`; `/api/v1/teams` lists the names.
- `topic` matches the story's `topic`. Anything off the list is a 400
  `invalid_request`. A story with no topic matches none.
- `published_after` (inclusive) and `published_before` (exclusive) bound
  `publishedAt` in both orders. In the published list they narrow the index
  read. In the change feed, whose order is `updatedAt`, they filter changes
  after they are read: "corrections to stories published in October".

**A page can be short while `hasMore` is true.** `driver`, `team`, `topic`,
`season` on race stories, and the date bounds in the change feed filter rows
after they are read, and one request reads at most 300 rows from each table.
Follow `nextCursor` until `hasMore` is false.

### `GET /api/v1/news/:id`

`{ "data": item }`. A retracted story answers 200 with the tombstone, the same
record the change feed reports. An id that never existed is a 404, and so is
a story a free key cannot see yet. `lang` is the one parameter it takes.

### `GET /api/v1/news/sample`

No key. A fixed page of three real Sepang stories in exactly the list's shape
(`NEWS_API_SAMPLE`), so someone can see the data before they have a key.
`public, max-age=3600` and `access-control-allow-origin: *`, like the OpenAPI
document. It is served through `newsApi:sample`, whose `returns` validator is
the list's, so a field added to the item and not to the sample fails on every
call and in `newsApi.test.ts`. The router matches the static `sample` segment
before `:id`, so it never reads as a story id.

### `GET /api/v1/races`, `/drivers`, `/teams`

The values the filters take, keyed and counted like the news. Each answers
`{ "data": [ ... ] }`.

- `races`: `slug`, `name`, `season`, `round`, `startsAt`, in calendar order.
  Takes an optional `season`.
- `drivers`: `code`, `number`, `name`, `team`, by code. `team` is the driver's
  current team (`drivers.team`), the same one a story's `drivers[].team`
  shows. Lineups are round-scoped (`driverTeamStints`), but the news API
  speaks in current teams throughout, so this does too.
- `teams`: `name` and `code` (`FER`), from `teams` in
  `packages/shared/src/tokens.ts`. Nothing is read from Convex; the request is
  still counted.

### The item

```json
{
  "id": "p171ettxqmr6w8r0zkvhx1cpn98f4ws0",
  "key": "colapinto-sepang-grid-penalty",
  "status": "published",
  "language": "en",
  "languages": ["de", "en", "es"],
  "headline": "Colapinto drops 15 places on the Sepang grid",
  "body": "…",
  "url": null,
  "source": {
    "name": "Formula 1",
    "url": "https://www.formula1.com/en/latest/article/…",
    "publishedAt": "2026-10-02T05:55:03.757Z"
  },
  "race": {
    "slug": "bahrain-2026",
    "name": "Bahrain Grand Prix",
    "season": 2026,
    "round": 16
  },
  "sessions": ["race"],
  "topic": "penalty",
  "drivers": [
    {
      "code": "COL",
      "number": 43,
      "name": "Franco Colapinto",
      "team": "Alpine"
    }
  ],
  "team": "Alpine",
  "startingGrid": null,
  "publishedAt": "2026-09-26T17:13:56.783Z",
  "updatedAt": "2026-10-02T20:18:09.179Z"
}
```

- `id` is the row's Convex id and the one to store. It survives a correction
  and `raceNews:move`.
- `key` is a readable slug, not an identifier: unique only within a race, and
  a moved story keeps it under another race. Use `id`.
- `sessions` is `affectsSessions`. Empty means the story changes no session,
  so the internal `category` is not exposed: it says the same thing.
- `topic` is one of the [topics](#topics), or null on a story published
  before topics existed and not yet backfilled.
- `url` is the story's card on grandprixpicks.com, or null. See
  [Links](#links).
- `team` follows `newsTeam` (`packages/shared/src/newsTeam.ts`), so the API
  and the site colour a story the same way. `drivers[].team` and
  `startingGrid[].team` are the driver's current team, as everywhere else news
  is shown.
- `language` is the language of `headline` and `body`: the `lang` asked for
  when the story has a current translation in it, otherwise `en`.
- `languages` is every language the story can be read in now, sorted, always
  including `en`. See [Languages](#languages).
- `source.publishedAt` is null when the source carried no date.
- `startingGrid` is `[{ position, code, name, team, note }]` on the story that
  announces a grid, otherwise null.
- `race` is null for a race-independent story.
- Times are ISO 8601 in UTC.
- `writeUpImage` is left out. The photos are licensed for our pages.

A retraction is a tombstone and carries no text, because the text was
withdrawn:

```json
{ "id": "…", "key": "…", "status": "retracted", "updatedAt": "…" }
```

### Errors

`{ "error": { "code": "…", "message": "…" } }`

| status | code                   |
| ------ | ---------------------- |
| 400    | `invalid_request`      |
| 400    | `invalid_cursor`       |
| 400    | `unknown_race`         |
| 400    | `unknown_team`         |
| 400    | `unsupported_language` |
| 401    | `unauthorized`         |
| 403    | `plan_required`        |
| 404    | `not_found`            |
| 429    | `rate_limited`         |
| 503    | `unavailable`          |

## Topics

`NEWS_TOPICS` in `packages/shared/src/newsTopics.ts` is the one list: the
Convex validator, both publish mutations, the `topic` filter, the OpenAPI
document and `scripts/gpp.mjs` all read it.

| topic        | for                                              |
| ------------ | ------------------------------------------------ |
| `penalty`    | Grid and time penalties, stewards' decisions     |
| `grid`       | A starting grid announcement                     |
| `technical`  | Upgrades, car changes, reliability               |
| `driver`     | Line-up changes, injuries, contracts, the market |
| `team`       | Management and team business                     |
| `weather`    | The forecast and conditions                      |
| `calendar`   | The calendar, a venue, a weekend's format        |
| `regulation` | Rules, the FIA                                   |
| `other`      | Anything else                                    |

Publishing sets it (`docs/race-news.md`), and the automated pipeline carries
the topic its proposal names through review to the published story
(`docs/cursor-news-automation.md`); a correction that leaves it out
keeps the one the story has. Stories published before it existed get one
with `newsApi:backfillTopics`, which takes ids and is a dry run unless
`dryRun` is false:

```bash
npx convex run --prod newsApi:backfillTopics '{"items":[{"id":"…","topic":"penalty"}]}'
npx convex run --prod newsApi:backfillTopics '{"items":[…],"dryRun":false}'
```

It does not move `updatedAt`, so neither the change feed nor a webhook reports
it: one backfill would otherwise read as a correction of every story. To tell
readers about a story's new topic, republish it with the topic, which does
move `updatedAt`.

## Links

`url` points at the story's card on its race write-up
(`https://grandprixpicks.com/<write-up>#news-<key>`, the anchor
`WeekendNewsSection` gives each card and the landing page's headlines already
link to). It is set only when the page really shows that story:

- it is a race story, live, and not held off write-ups
  (`writeUpSelected: false`);
- its race has a write-up (`packages/shared/src/raceWriteups.ts`);
- the write-up is live: from the preview until the race locks
  (`isRaceWriteupLive`, `packages/shared/src/raceWriteupPhase.ts`). After
  that most write-ups lead with the result and drop the cards.

Otherwise it is null, including every race-independent story: none has a page
of its own. The rule errs towards null. The Singapore write-up keeps its cards
after the race and Bahrain keeps three, and those are left out rather than
copied from their routes into the backend.

`url` is worked out when it is read, so a story's link turns null when its
weekend locks without the story changing, and the change feed does not report
it. Read it as "where to send a reader now".

## The change feed

`?updated_since=2026-11-20T09:00:00Z` returns every story published, corrected
or retracted at or after that moment, oldest change first. A consumer that
mirrors the news calls it once with a start time, then keeps polling with the
`nextCursor` it was last given, with or without `updated_since`. In this order
`nextCursor` is always set, at the end of the list too, so the next poll
resumes from exactly there.

Two details that are there on purpose:

- **Changes appear five seconds late** (`SETTLE_MS`), a day late on a free
  key. `updatedAt` is stamped when a mutation starts, not when it commits, so
  two overlapping writes can land out of stamp order, and a reader whose
  cursor had passed the later one would never see the earlier one.
- **The cursor remembers ids, not only a time.** Stories from one batch can
  share a millisecond, and a bare timestamp would skip or repeat them.

A story can appear more than once across polls (it changed again). Apply each
record by `id`.

**A republish that changes nothing served is not a change.** `raceNews:publish`
and `globalNews:publish` keep the story's `updatedAt` when every field the API
serves is what it was (`servedFingerprint` in each file), so taking a story off
the feed, adding a photo, setting an embargo or an agent re-running the same
call reports nothing to a poller or a webhook. `writeUpSelected` counts as
served because it decides `url`. Retracting a story already retracted keeps it
too.

## Webhooks

A commercial key can have up to three endpoints, each sent the change feed as
signed POSTs, so its holder does not have to poll. Code:
`apps/backend/convex/newsApiWebhooks.ts`; the request is described under
`webhooks` in the OpenAPI document.

### What is sent

```json
{
  "events": [
    {
      "id": "evt_p171ettxqmr6w8r0zkvhx1cpn98f4ws0_1791045489179",
      "type": "news.updated",
      "createdAt": "2026-10-02T20:18:09.179Z",
      "data": { "id": "p171…", "status": "published", "…": "…" }
    }
  ]
}
```

- Up to 20 events a POST, oldest change first. `data` is the item the API
  returns, built by the same `present`, tombstone included.
- `id` is the story's id and its `updatedAt` in milliseconds: one story at one
  version. A retry sends the same ids, so a consumer dedupes on it.
- `createdAt` is the change's time, the item's `updatedAt`.
- `type` reads the record, not what this endpoint was sent before:
  - `news.published`: the story's first version (`updatedAt` equals
    `publishedAt`);
  - `news.updated`: any later version, including a story republished after a
    retraction, a `raceNews:move`, and a story whose first version this
    endpoint never got (published before the endpoint existed, or corrected
    before a failed first delivery got through);
  - `news.retracted`: the tombstone.

  So `news.updated` does not promise the consumer has the story. Treat
  published and updated alike, as an upsert by `id`. Doing better would mean
  storing what every endpoint has seen of every story.

- If a story changes twice before a delivery succeeds, the endpoint gets only
  the later version. That is the feed's behaviour too: it reports a record's
  current state, not a history.
- `webhook.test`, with `data: null`, is only ever sent by `sendTestEvent`.
- `url` is worked out when the batch is read, as in the API, and a link
  turning null is not an event.

### Delivery

It reads the change feed rather than hooking the publish mutations. The feed
already owns the order, same-millisecond ties and the settle delay; a second
event source would be a second copy of those rules. `readNewsPage` in
`newsApi.ts` is the body of `newsApi:list`, and each endpoint keeps its own
change-feed cursor, so a webhook and a poller holding the same cursor get the
same records. An endpoint starts at the moment it is created, not at the
start of the feed.

What starts a delivery:

- every mutation that moves a story's `updatedAt` (`raceNews:publish`,
  `retract`, `move`, `globalNews:publish`, `retract`, and
  `newsApiTranslations:store` when a translation lands) calls
  `scheduleWebhookDrain` (`lib/newsApiChanges.ts`), which books `drain` six
  seconds later, after `SETTLE_MS`. With no active endpoint it books nothing;
- `drain` books one `deliver` per active endpoint with settled changes
  waiting, reading at most a row or two of each table per endpoint to know;
- a delivery that leaves more waiting books the next one at once;
- a failure books its own retry;
- the cron `deliver news API webhooks` runs `drain` every 15 minutes, so a
  lost schedule or a crashed delivery is late, never lost. With nothing
  pending it sends nothing. `raceNews:releaseToFeed` moves no `updatedAt`,
  because an embargo only holds the feed card, so it books nothing.

`deliver` claims the endpoint (a 60-second lease, so two deliveries never
overlap), reads up to 20 records past its cursor, POSTs them and records the
outcome. The rules:

- POST JSON, 10-second timeout, 2xx is success. The response body is never
  read, only the status.
- The cursor moves only when a batch is accepted, so order is kept and nothing
  is skipped. A delivery that outlives its lease records nothing, and its
  batch is sent again.
- A failure retries after 1 minute, 5, 30, 2 hours, 6, 12 and 24. The eighth
  failure in a row, about 45 hours after the first, sets `active: false`,
  `disabledReason: "failures"`, and it stays off until an operator switches it
  on. Switching on resumes from the cursor, so the changes it missed are sent.
- Stored per endpoint: `lastAttemptAt`, `lastStatus`, `lastError`,
  `lastSuccessAt`, `consecutiveFailures`, `nextAttemptAt`. No payloads.
- A revoked key, or one moved off `commercial`, stops its endpoints at once:
  both `drain` and the claim check the key. The rows stay, and `listWebhooks`
  shows `receiving: false` with the reason. Moved back to `commercial`, they
  resume from their cursors.

### Signing

Every POST carries

```
gpp-signature: t=1791045495,v1=5f2c…
```

`v1` is the hex HMAC-SHA256 of `<t>.<raw body>` keyed with the endpoint's
secret (`whsec_` and 40 characters, used as its UTF-8 bytes). `t` is the send
time in Unix seconds and is inside the signed text, so a captured delivery
cannot be replayed later with a fresh `t`. For 24 hours after a rotation there
are two `v1` values, one per secret. Verify against the raw bytes, before
parsing the JSON:

```ts
import { createHmac, timingSafeEqual } from 'node:crypto';

function verify(rawBody: string, header: string, secret: string): boolean {
  const parts = header.split(',').map((part) => part.split('='));
  const t = Number(parts.find(([name]) => name === 't')?.[1]);
  if (!Number.isFinite(t) || Math.abs(Date.now() / 1000 - t) > 300) {
    return false;
  }
  const expected = createHmac('sha256', secret)
    .update(`${t}.${rawBody}`)
    .digest();
  return parts.some(
    ([name, value]) =>
      name === 'v1' &&
      value.length === expected.length * 2 &&
      timingSafeEqual(Buffer.from(value, 'hex'), expected),
  );
}
```

The secret is stored in the clear in `newsApiWebhooks`. Unlike a key, it
cannot be stored hashed: an HMAC is computed with the secret itself, and a
hash of it signs nothing. Encrypting it under an environment variable would
not keep it from anyone who can read the deployment, since they can read the
variable too. So it is shown once, at creation or rotation, and no list
returns it.

### URL safety

The URL is chosen by a customer and fetched by us, so `webhookUrlProblem`
holds it, at creation, on switching on and before every POST, to:

- `https`, with no username or password;
- the standard port. A non-default port is the usual way to reach a service
  that was never meant to face the internet;
- a hostname, never an IP address. Every IPv4 and IPv6 literal is refused,
  public ones too, rather than a list of private and metadata ranges, which
  leaves nothing to get wrong about octal, hex, decimal or IPv4-mapped forms;
- a name with a dot and not under a private-network suffix (`localhost`,
  `local`, `internal`, `lan`, `home.arpa` and a few more), which refuses
  `metadata.google.internal` and a bare `metadata`.

Redirects are not followed (`redirect: "manual"`; a 3xx is a failure), so a
public URL cannot bounce the request somewhere private.

What this does not protect against: **a public name that resolves to a
private address**, by design or by DNS rebinding. The default Convex runtime
has no DNS lookup, so the address cannot be checked before the fetch, and a
lookup in the Node runtime would not bind the fetch that follows it, which
resolves the name again. Whether Convex's own egress refuses private
addresses is not documented, and was not verified. What limits the damage:
the request is a POST with our JSON body, the response is never read, and
only the status is stored.

### Operator commands

Nothing public manages endpoints yet: no HTTP route, no UI.

```bash
npx convex run --prod newsApiWebhooks:createWebhook '{"keyId":"…","url":"https://example.com/hooks/f1"}'
npx convex run --prod newsApiWebhooks:listWebhooks '{}'
npx convex run --prod newsApiWebhooks:sendTestEvent '{"id":"…"}'
npx convex run --prod newsApiWebhooks:setWebhookActive '{"id":"…","active":false}'
npx convex run --prod newsApiWebhooks:setWebhookActive '{"id":"…","active":true}'
npx convex run --prod newsApiWebhooks:rotateWebhookSecret '{"id":"…"}'
npx convex run --prod newsApiWebhooks:deleteWebhook '{"id":"…"}'
```

- `createWebhook` takes the key's `id` from `newsApi:listKeys` and prints the
  secret once. It refuses a key that is revoked or not `commercial`, a URL
  that fails the rules above, a URL the key already has, and a fourth
  endpoint.
- `sendTestEvent` signs and sends one `webhook.test` and prints what came
  back. It works on a switched-off endpoint, so a fix can be checked first,
  and changes nothing: not the cursor, not the failure count.
- `rotateWebhookSecret` keeps the old secret signing beside the new one for
  `overlapHours` (24 unless given, 0 to drop it at once, at most 168).

Delivery has only been run against a stubbed `fetch` in
`newsApiWebhooks.test.ts`. The first real endpoint is the first end-to-end
run: create one against a request bin, `sendTestEvent`, publish a story on
dev, and check `listWebhooks`.

## Keys

Only the SHA-256 of a key is stored. `createKey` prints the key once and
needs a plan.

```bash
npx convex run --prod newsApi:createKey '{"label":"discord-bot","plan":"hobby"}'
npx convex run --prod newsApi:listKeys '{}'
npx convex run --prod newsApi:setKeyPlan '{"id":"…","plan":"commercial"}'
npx convex run --prod newsApi:revokeKey '{"id":"…"}'
```

The key is checked inside the Convex query, not in the route. The query is
public, like every query a server route calls, so a check in the route alone
would leave the Convex URL open.

`listKeys` shows each key's `account` (`userId` and `username`) when an
account created it, and null for a key the operator issued.

### Self-serve keys

Any signed-in Grand Prix Picks account can create its own key on the `free`
plan at `/f1-news-api/keys` (`apps/web/src/routes/f1-news-api_.keys.tsx`; the
trailing `_` keeps it out of the landing page's layout). The page is noindex,
not in the sitemap and linked only from `/f1-news-api`. Signed out, it shows
`SignInPrompt` in place. It is not on the Clerk-free list, because it reads
viewer-scoped data.

`apps/backend/convex/newsApiAccount.ts`:

- `myKeys`: the viewer's 20 newest keys, revoked ones included, by label,
  prefix, plan, created and revoked times, and `usage`, the key's latest day
  in `newsApiUsage` (the page shows it as today's requests when that day is
  today, UTC). Never the key or its hash. Signed out it returns an empty list.
- `createMyKey({ label })`: label trimmed, 1 to 60 characters. Always `free`.
  At most 2 active (unrevoked) keys per account. Stores the row through
  `issueKey` in `newsApi.ts`, the same path as `createKey`, with `userId` set,
  and returns the key once.
- `revokeMyKey({ id })`: owner only; another account's key, or an operator's,
  answers "No key with that id." Immediate and final.

A self-serve key is an ordinary row: metering, `setKeyPlan` and `revokeKey`
treat it like any other. Moving one to a paid plan with `setKeyPlan` is how a
paid key is issued to an account for now, and `myKeys` then shows that plan.
Creating a key fires the `news_api_key_created` analytics event, with the plan
and nothing else.

## Metering

`newsApi.recordRequest` counts each served request per key per UTC day
(`newsApiUsage`), enforces the plan's per-minute limit with the rate-limiter
component (one bucket per plan, so a plan change starts the key on a full
one), and returns the quota the headers report.

The reads (`newsApi.list`, `get`, `races`, `drivers`) and `recordRequest` are
internal. The only public way in is one action per endpoint in
`newsApiServe.ts`, which runs the count and the read side by side and passes
the read the server's clock as `now`. A route calls that action
(`serveKeyed`) and drops the read's answer when the count refuses. When the
reads were public queries, a key holder could call Convex directly to skip
the count, and pass a later `now` to read past their plan's delay.

So a request the read answers with an error (`invalid_cursor`,
`unknown_race`, `not_found`, `plan_required`) has been counted. Not counted: a request refused
before the read (no key, a malformed query, an unknown team, a language we do
not serve) and one refused for its rate.

```bash
npx convex run --prod newsApi:usage '{"days":7}'
```

## Languages

Stories are written in English. `NEWS_TRANSLATION_LANGUAGES` in
`packages/shared/src/newsLanguages.ts` is the one list of the eleven they are
translated into; the Convex validators, the translator's request, the web
server's `lang` check and the OpenAPI document all read it.

| code | language               |
| ---- | ---------------------- |
| `es` | Spanish                |
| `pt` | Portuguese (Brazilian) |
| `fr` | French                 |
| `de` | German                 |
| `it` | Italian                |
| `nl` | Dutch                  |
| `pl` | Polish                 |
| `tr` | Turkish                |
| `ja` | Japanese               |
| `zh` | Chinese (Simplified)   |
| `ar` | Arabic                 |

### Reading

`lang` on `/api/v1/news` and `/api/v1/news/:id`:

- A regional tag is served by its base language: `en-GB` reads `en`, `es-MX`
  reads `es`, `pt-BR` reads `pt`. A Traditional Chinese tag (`zh-TW`, `zh-HK`,
  `zh-MO`, `zh-Hant`) is a 400 `unsupported_language`, because the
  translation is Simplified. So is any language off the list. The web server
  resolves the tag and passes the base language to the Convex query.
- Any language but `en` needs a `commercial` key. On a `free` or `hobby` key
  it is a 403 `plan_required`, which has been counted. The check is inside
  `newsApi:list` and `newsApi:get` (`mayRead`), like the key check, because
  those queries are public. `NEWS_API_PLANS` says which plans have
  translations.
- The item is served in that language, with `language` set to it, only when
  a translation exists whose `sourceHash` matches the story's current English
  headline and body. Otherwise it is served in English with `language: "en"`.
  A corrected story is never read through a translation of the old text: a
  stale translation of a corrected penalty is worse than the English.
- Only `headline` and `body` change. Every other field is the English item's.
- Every published item, in any language and on any plan, carries `languages`.
  A tombstone carries neither `language` nor `languages`. The sample is
  English only and lists `["en"]`. Webhook payloads are English, with
  `languages`.

### Storage

`newsApiTranslations`, one row per story per language: `newsId` (the
`raceNews` or `globalNews` id), `language`, `headline`, `body`, `sourceHash`
and `translatedAt`, indexed `by_news_language`. `sourceHash` is the SHA-256 of
the English headline and body the row was made from
(`translationSourceHash`, `lib/newsApiTranslations.ts`). The news rows hold no
translation. A retraction leaves the rows in place; a tombstone serves no
text, and a story republished with the same text is served in them again.

### Translating

`newsApiTranslations:translate` is an internal action. One request per story
to the Claude API (`TRANSLATION_MODEL`, `claude-sonnet-5-5`, over `fetch`)
returns every missing language as one JSON object, constrained by a JSON
schema. It runs with server-side refusal fallback (`fallbacks: "default"`, beta
`server-side-fallback-2026-07-01`): a request declined in a category that has
a fallback model is re-run on it in the same call. A decline in any other
category comes back as a refusal and is logged and dropped.

- **What books it.** `raceNews:publish` and `globalNews:publish` call
  `scheduleTranslation` (`lib/newsApiChanges.ts`, beside
  `scheduleWebhookDrain`) when a story is new, its headline or body changed,
  or it was retracted and is published again. `raceNews:move` keeps the id and
  the text, so its translations still match and it books nothing. A retracted
  story is never translated.
- **The key.** It needs the Convex environment variable `ANTHROPIC_API_KEY`
  on the deployment. Without it the run logs one line and does nothing, which
  keeps dev and the tests off the API:

  ```bash
  npx convex env set --prod ANTHROPIC_API_KEY sk-ant-…
  ```

- **Idempotent.** A run asks only for the languages with no row of the
  current `sourceHash`, and makes no request when there are none.
- **Checked before it is stored** (`translationProblem`): each language must
  be there, with a non-empty headline and body, a headline on one line, no
  HTML or entities, a headline at most 240 characters or twice the English,
  a body at most 2,000 characters or twice the English, and a body that is not
  the English left as it was. A language that fails is dropped and logged;
  the rest are stored.
- **A correction mid-run.** `store` drops a run whose English changed, or
  whose story was retracted, while the request was out. The run booked by the
  correction translates the newer text.
- **Failures.** A timeout, a network error, 408, 429 or a 5xx is retried after
  1, 5 and 30 minutes, then dropped. Anything else (a 400, a refusal, output
  cut off by `max_tokens`, output that is not JSON) is logged and dropped. The
  story stays published either way and is served in English. Nothing in the
  run can fail the publish: it is its own scheduled action.

The prompt asks for sports-journalism register, faithful and not embellished;
names of drivers, teams, circuits and sponsors and car numbers unchanged; the
F1 terms and session names that language's F1 press uses, with acronyms kept;
quoted speech translated and still marked as a quote; plain text. The story
goes inside `<story>` tags and the prompt says to treat it as text, never as
instructions.

### The change feed

When a run stores a language the story could not be read in before, `store`
moves the story's `updatedAt` once (one bump per run, not one per language)
and calls `scheduleWebhookDrain`. Pollers and webhooks then get a
`news.updated` for the story whose `languages` grew: `updatedAt` moves when
something the API serves changes, here as everywhere. The bump writes
only `updatedAt`: no feed event, Discord post, email or push, and no new
translation, since the text and its hash did not change. A run that replaces
rows without adding a language does not bump.

### Backfill

Stories published before translations existed, or ones a run missed, are
translated with `newsApiTranslations:backfill`. It takes `ids`, or the newest
live stories, optionally of one `season` (a race story's race season, or the
UTC year a race-independent story was published), up to `limit` (20 unless
given, at most 100). It is a dry run unless `dryRun` is false: the dry run
lists each story and the languages it lacks and calls nothing. A real run
books one `translate` per story, five seconds apart.

```bash
npx convex run --prod newsApiTranslations:backfill '{"limit":20}'
npx convex run --prod newsApiTranslations:backfill '{"season":2026,"limit":50,"dryRun":false}'
npx convex run --prod newsApiTranslations:backfill '{"ids":["…"],"dryRun":false}'
```

It does not move `updatedAt` (`bump: false`), so neither the change feed nor
a webhook reports it, for the reason `newsApi:backfillTopics` does not: one
backfill would otherwise read as a correction of every story. The
translations are served, and listed in `languages`, as soon as they are
stored.

A translation that is wrong is removed with `newsApiTranslations:remove`,
for every language or the ones listed. The story reads in English for those
languages until a backfill translates it again. Removing a language the story
was served in moves `updatedAt`, so pollers and webhooks hear it went.

```bash
npx convex run --prod newsApiTranslations:remove '{"newsId":"…","languages":["es"]}'
```

Translation has only been run against a stubbed `fetch` in
`newsApiTranslations.test.ts`, never against the Claude API. The first real
run is the first end-to-end check: set the key on dev, publish a story, and
read it back with `lang`.

## Waiting list

The waiting list is for the paid plans. `/f1-news-api` takes an email, an
optional `use` (`personal` or
`commercial`) and an optional note with no account, through
`newsApi.joinWaitlist` (5 an hour per address, 600 an hour across all
visitors). One address is stored once. Joining again fills an answer the
first left blank but never replaces one: the form takes no account, so
anyone can send any address.

```bash
npx convex run --prod newsApi:listWaitlist '{}'
```

## Consumers

Nothing reads the HTTP API yet. `apps/reddit-news`, the Devvit app that polled
`/api/news/recent`, was deleted on 2026-11-20 with that endpoint: it was not
working, and Reddit's platform was not worth the upkeep. It is in git history.

- **`/api/trmnl/weekend`** composes a screen from several Convex reads on our
  own server. Its news could come from the same read model, but it gains
  nothing from going over HTTP to itself.
- **Discord `#news`** is posted by its own code (`discord.postNews`, booked
  by the publish mutations), untouched by webhooks. It could become a
  subscriber later, but Discord wants its own body shape, not ours, so it
  would need an adapter, and it posts a story once, where a subscriber hears
  every correction.

## Not built yet

- **Paid plans.** Free keys are self-serve ([Self-serve keys](#self-serve-keys)),
  but a `hobby` or `commercial` key is still issued or moved to its plan by
  hand, and so is a webhook endpoint. Still to build: a Paddle subscription
  behind the paid plans, and self-serve webhook endpoints.
- **Browser access.** No CORS headers on the keyed routes: a key in a web page
  is a key anyone can copy. The sample and the OpenAPI document are open to
  any origin.
