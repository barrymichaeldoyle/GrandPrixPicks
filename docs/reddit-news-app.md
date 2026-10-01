# r/GPPicks news app

**Status:** uploaded 30 September 2026 as `gpp-news` v0.0.1, owned by
u/GrandPrixPicks, and installed on the playtest subreddit r/gpp_news_dev.
Waiting on Reddit's review of the `grandprixpicks.com` fetch domain; until it
is approved every run logs a failed fetch and posts nothing.

A small Devvit app, `apps/reddit-news`, that mirrors the site's news feed into
r/GPPicks so the subreddit has a steady run of F1 news. It is the Reddit
sibling of the Discord #news webhook (`apps/backend/convex/discord.ts`,
`docs/discord-server-setup.md`), and it is unrelated to the shelved Reddit
prediction game in `docs/devvit-product-specification.md`.

## What a post looks like

One news item is one Reddit post:

- **A link post** to the source article, titled with the item's headline. The
  source's domain and thumbnail show in the subreddit listing, and credit goes
  to the outlet that reported it.
- **A pinned first comment** with the item's summary (`body`), distinguished
  as a moderator comment and stickied.

Nothing links back to grandprixpicks.com in the first version. Devvit's rules
say apps should not send people off Reddit to another version of themselves,
and a link to our own write-up is the part app review is most likely to
question. The source link is the content, so it stays. Asking for a write-up
link is a later update, once the app is approved.

## How it works

```
Convex feedEvents (race_news)
  → feed.recentNews (public query, last 14 days, visible items only)
  → GET https://grandprixpicks.com/api/news/recent   (apps/web/server/routes/api/news/recent.get.ts)
  → Devvit cron task every 10 minutes                 (apps/reddit-news/src/server/index.ts)
  → syncNews(): post / edit / delete                  (apps/reddit-news/src/server/sync.ts)
```

**Pull, not push.** Devvit's documented way to reach an outside service is
server-side `fetch` to an allowlisted hostname. Its `externalEndpoints`
(inbound calls) are marked experimental and undocumented, so the app polls.

**The source of truth is the feed.** A news item is on the list only while it
has a `race_news` feed event, which already encodes every publishing rule:

- an item held back with `feedVisibleAt` has no feed event until release;
- an item published with `feedSelected: false` never gets one;
- a retracted item loses its feed event;
- season-wide `globalNews` items have one too, so they post as well.

### Sync rules (`syncNews`)

State lives in the app's Redis, one hash field per feed event id:
`{ postId, commentId, headline, sourceUrl, body, createdAt }`.

- **First run** records a start time 24 hours back. Items older than that are
  never posted, so installing the app does not dump two weeks of news at once.
- **New item** (not tracked, created after the start time): submit the link
  post, add the comment, pin it. At most 5 new posts per run, oldest first; the
  rest wait for the next run.
- **Body changed**: edit the pinned comment.
- **Headline or source URL changed**: Reddit cannot edit a post title or a
  link, so delete the post and post it again.
- **Tracked item missing from the list**: it was retracted (or moved out of the
  feed), so delete the post. Items older than 7 days stop being tracked, well
  inside the endpoint's 14-day window, so "missing" always means "gone" rather
  than "aged out".
- **An empty list never deletes anything.** A broken endpoint that answers
  `{ "items": [] }` must not wipe the subreddit.
- A retract followed by a republish creates a new feed event id, so it deletes
  the old post and makes a new one. Discord does the same (it posts again).

Every Reddit call is wrapped so one failure (a rate limit, a removed post) is
logged and the run carries on with the next item.

## Devvit rules that shape this

From the Devvit docs as of 30 September 2026:

- `permissions.http.domains` must name the exact hostname
  (`grandprixpicks.com`). Domains are reviewed when the app is playtested or
  uploaded, usually in 1-2 business days. HTTPS only, 30 second timeout.
- Fetching is a "premium feature": it needs app review (about a week) and the
  app must link a terms of service and privacy policy. We use
  `https://grandprixpicks.com/terms` and `https://grandprixpicks.com/privacy`.
- App review needs a plain-language `README.md` in the app root.
- Posts and comments come from the app's own account (named after the app),
  not from u/GrandPrixPicks.
- `comment.distinguish(true)` is a moderator action. Add the app account as a
  moderator of r/GPPicks with Posts permission.

## Rollout

Steps only Barry can do, in order:

1. `pnpm --filter @grandprixpicks/reddit-news run login` (opens a browser).
2. `pnpm --filter @grandprixpicks/reddit-news build`, then from
   `apps/reddit-news`: `npx devvit upload`. This registers the app and submits
   the `grandprixpicks.com` domain for review.
3. Once the domain is approved: `npx devvit install r/GPPicks`, add the app
   account as a moderator, and watch `npx devvit logs r/GPPicks`.
4. Publish for review (`npx devvit publish`) if fetching does not work for an
   unreviewed app. The docs imply it will not.

**`devvit upload` rewrites `package.json`.** It renames the package to the app
name (`gpp-news`) and sets a BSD licence. The rename breaks every
`--filter @grandprixpicks/reddit-news` script, so revert `package.json` after
each upload (`git checkout apps/reddit-news/package.json`). Its edit to
`devvit.json` (the `dev.subreddit` line) is fine to keep.

The web endpoint ships with a normal push to `main`; it is safe to deploy
before the app exists.

## Checking it worked

```sh
curl -s https://grandprixpicks.com/api/news/recent | jq '.items | length'
```

`utm` does not apply here: the posts link to the source, not to us.
