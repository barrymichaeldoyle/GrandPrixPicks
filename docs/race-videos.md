# Official F1 video links

Race videos are optional links to the official FORMULA 1 YouTube channel.
The web app opens watch pages in a new tab. Tests of official practice, race
and Radio Rewind embeds returned Formula One Management rights restrictions,
even when the watch-page metadata reported `playableInEmbed: true`.

## Publication

`raceVideos` stores one link per `(raceId, kind)`, with the video ID and source
title. Supported kinds: `fp1`, `fp2`, `fp3`, `sprint_quali`, `sprint`, `quali`,
`race`, `radio`. Operator publication verifies channel ownership through
YouTube oEmbed. The operator checks that the video belongs to the named race,
year and session; the channel check does not establish those relationships.

After identifying the intended deployment, attach a reviewed video:

```sh
pnpm exec convex run raceVideos:attach '{"raceSlug":"azerbaijan-2025","kind":"fp2","videoId":"7QC7-5jWriI"}'
```

Run from `apps/backend` with that deployment's environment selected. Use only
a race slug present in that deployment. `attach` is an internal action; clients
can read links but cannot publish them. A repeated race/kind replaces the link
instead of inserting a duplicate. Invalid IDs, videos from other channels,
unknown races and sessions absent from that weekend are rejected.

Remove an incorrect or unavailable link:

```sh
pnpm exec convex run raceVideos:remove '{"raceSlug":"azerbaijan-2025","kind":"fp2"}'
```

No backfill is required. Existing races/results remain valid. Results publish
independently of highlights; links can arrive later. Link publication creates
no feed events, Discord messages or push notifications.

## Web surfaces

- Practice results on the dashboard/feed, write-ups, race pages and full
  classification dialogs show the matching practice link.
- Sprint and qualifying tabs in the results sheet show their matching link.
- Scored feed session groups show one highlights link for that session.
- Race pages and write-ups show competitive highlights and Radio Rewind.
- Missing links render nothing. Replacements/removals update subscribed pages.

`race_video_clicked` records `video_id`, `video_kind` and `race_slug` where
available, through the existing consent-aware analytics path.

## Automatic uploads

The Convex HTTP endpoint `/youtube-websub` receives the official F1 channel's
WebSub notifications. POST deliveries require a valid HMAC SHA-1 or SHA-256
signature over the exact body. XML is bounded to 128 KB, rejects DTDs/entities,
and accepts at most 30 entries from the configured official channel.
Subscription challenges must match a requested subscription's callback token,
channel topic and valid lease. Neither subscription secrets nor tokens are
exposed by the admin status query.

`youtubeUploads` deduplicates by video ID and ignores stale deliveries. Every
new upload or metadata update schedules a channel verification through YouTube
oEmbed. Only supported highlights/Radio Rewind with an explicit single year,
an unambiguous race name, a matching calendar window and a valid session can
publish automatically. F2/F3, F1 Academy and explicitly historical compilations
are ignored. Missing years, uncertain matches and occupied race/session slots
enter the private admin News video queue. Verification failures retry up to
three attempts before review; admins can retry them.

Admins can choose a race/session and publish a verified upload, or reject it.
Publication records the reviewer and time, rejects stale review versions and
uses the same raceVideos store as manual attachment. Rejected video IDs stay
rejected through later notifications. If changed metadata invalidates an old
match, its former link is removed only if that slot still contains this video;
a replacement by an operator is preserved. No upload creates notifications,
Discord messages or additional feed posts.

### Activation and monitoring

Set `YOUTUBE_WEBSUB_SECRET` to a unique random value of at least 32 characters
on the intended deployment. Never commit it. Each deployment needs its own
secret and subscription. With no secret, ingestion and recurring jobs are
inactive. After deploying, run:

```sh
pnpm exec convex run youtubeUploads:reconcile '{}' --env-file ../../.env.local
```

Identify the deployment before running this command. `reconcile` registers the
callback at `CONVEX_SITE_URL` with Google's hub, fetches recent channel uploads,
and retries pending verification. The six-hour cron renews subscriptions when
less than 24 hours remains and reconciles the recent feed. Google grants the
actual lease; an accepted registration request alone does not prove the GET
challenge succeeded. Check `youtubeUploads:subscription` internally or the
sanitized subscription status in the admin News panel for a nonzero future
`expiresAt`. A failed feed fetch does not invalidate a confirmed subscription.

The recent Atom feed is bounded: reconciliation can recover recent missed
uploads, but cannot backfill the entire channel history. Video deletion/private
status is not guaranteed to generate these upload notifications. Remove a
known unavailable link with `raceVideos:remove`; an edited video that fails
verification repeatedly is also removed from its previous automatic slot and
sent to review. To stop renewal/ingestion, remove the deployment secret; the
hub's outstanding lease will expire and incoming deliveries are refused.

Protocol references:
https://developers.google.com/youtube/v3/guides/push_notifications
https://pubsubhubbub.appspot.com/
https://www.w3.org/TR/websub/

## Development verification — 30 September 2026

Deployed to personal development `fine-greyhound-738`. Google's real callback
confirmed a five-day lease ending 5 October 2026 at 07:14 UTC. Initial
reconciliation imported 15 official uploads: the 2026 Azerbaijan Radio Rewind
(`QsAq3PygsKI`) was automatically attached to `azerbaijan-2026`; the other 14
were ignored as unsupported clips or formats.

Validation: 566 backend tests passed (one skipped), all 1,163 web tests passed,
shared/web/backend typechecks passed, and focused lint/format/query checks
passed. HTTP tests cover signed Atom delivery and subscription challenges;
queue tests cover deduplication, publication, metadata corrections, admin-only
review, stale reviews and sticky rejection. The live Google subscription
challenge and initial ingestion were verified; a future upload delivery has
not yet been observed in this development session.

## Production activation — 30 September 2026

Deployed the backend to `cheery-tern-274` and the web release to Cloudflare
Pages project `grand-prix-picks`, serving `grandprixpicks.com`. Production has
its own signing secret. Google's callback confirmed a five-day subscription
lease ending 5 October 2026 at 09:20 UTC, with no subscription error. The
six-hour cron renews that lease and reconciles recent uploads.

Initial production ingestion imported 15 uploads: one published (the 2026
Azerbaijan Radio Rewind, `QsAq3PygsKI`) and 14 ignored. The published link was
verified through the production query. The production web build and live
edge-cache checks passed. A future upload delivery has not yet been observed.
