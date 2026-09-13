# News pipeline implementation

The existing `raceNews` publication path and `feedEvents` feed remain the public read path. No feed read calls AI. Manual `raceNews:publish` calls still default to pick-related news and still upsert by `(raceId, key)`. General weekend stories can use an empty `affectsSessions` array, and a separate `globalNews` table holds reviewed stories with no weekend. Both paths write an explicit category to the feed event. Feed arrival time remains fixed on correction.

## Stages delivered

1. **Publishing:** optional `category`, `feedSelected`, and `writeUpSelected` fields on stored weekend stories; a separate race-independent publication table; correction and retraction paths. Existing documents resolve to pick-related, feed-selected and write-up-selected. Existing manual publishing remains valid.
2. **Push:** `newsPushPreference` resolves to off, pick-related only, or all selected. Legacy `pushNews: true` maps to pick-related; false or unset maps to off. Fanout and queued delivery both check the immutable published category. Campaign selection is still a separate internal action with its existing story key, quiet hours, cancellation and daily cap.
3. **Discovery:** admin-approved HTTPS RSS source records; a bounded SAX parser; host and redirect restrictions; excerpts only; tracking URL normalization and deduplication by source external ID, URL, then same-source content fingerprint. Stored source cadence accelerates near a race. Known race, driver and team names become suggestions only; candidates are private.
4. **Worker:** five-candidate transactional batches, 15-minute claims, three attempts, dead-letter status, exact JSON-only authenticated HTTP routes. Submissions only create review proposals.
5. **Review:** Clerk admin-only source controls and proposal queue. A reviewer can edit the headline, body, category, affected sessions and weekend, choose feed and write-up inclusion for weekend stories, merge a second source into an open proposal, reject, publish, or send a weekend story to a private write-up handoff queue with a note. Review identity and time are stored. General proposals with no weekend use `globalNews`.

## Schema and rollout

All new fields on populated `users`, `raceNews`, `feedEvents`, and `notificationDeliveries` are optional. Legacy documents therefore validate without a backfill. The new source, candidate, batch, proposal and global-publication tables are additive. Source polling is inert until `NEWS_RSS_ALLOWED_HOSTS` lists the exact feed host and an admin enables that source. Worker routes refuse requests until a 32-character or longer `NEWS_WORKER_SECRET` is set on the deployment. Start with one approved source, review its proposals, then add others. Do not change production deployment settings or enable a Cursor Automation without the operator's separate rollout decision.

To pause, disable sources in Admin → News, remove the feed host allowlist, and remove the worker secret. To roll back code, keep the optional fields and new tables while stored documents exist. Existing published cards can be retracted through the matching `raceNews` or `globalNews` retraction function. Cancelling a selected news campaign remains separate from retracting a card.

## Authorization and validation

Only admins can configure sources or review and publish proposals. Worker routes use a dedicated secret and have no publishing endpoint. Claims expire; submit checks batch membership, type validators, text lengths, category/session consistency and HTML-like content. Source fetching stays on admin-approved hosts with no redirects, an eight-second timeout and a 128 KB response limit. No full article body or publisher image is fetched.

## Remaining editorial work

Side-by-side source comparison beyond linked corroborating candidates and contradiction notes remains editorial work. The handoff queue records the reviewer, weekend, note and source; it does not edit a hand-written write-up route. A published card still has one primary source link; reviewers must confirm each factual sentence against it. No automated push selection or auto-publication is present.

The source parser, candidate deduplication, batch leases, review authorization, global publication, correction, category routing and preference changes have focused backend tests. Web and mobile settings compile and their full test suites run. See [Cursor worker setup](cursor-news-automation.md) for the exact prompt and environment contract.
