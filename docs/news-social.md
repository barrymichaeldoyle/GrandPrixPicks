# X posts after a news sweep

Select one to three X posts after a substantial news sweep. Each post covers a
strong story or a small group of related stories. A sweep with no useful new
development can select none. Sporting news and event stories are both eligible.

Use Buffer's GrandPrixPicks X channel. The operator CLI previews by default,
checks the existing X queue, and schedules selected posts 25 minutes apart.
`intervalMinutes` may be set between 20 and 30. Other scheduled campaigns and
recently sent posts count toward that spacing. An urgent development can use
the next available slot; set its requested start time accordingly.

## At every sweep

1. Read `docs/product-voice.md`, publish the reviewed news and verify it live.
2. Check previously scheduled news, even when selecting no new X posts:

   ```sh
   pnpm gpp news social check --prod
   pnpm gpp news social check --prod --apply
   ```

3. Select the strongest developments and write independent, factual X copy.
   Include a useful link to the source, the race write-up or the exact feed
   card. Avoid forced calls to action, hashtags and repeated versions of the
   same update. Review any result spoilers in the social selection separately
   from push eligibility.
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
      "text": "<Reviewed X copy and link>",
      "expiresAt": "2026-10-10T09:00:00Z"
    }
  ]
}
```

`keys` references stories in `newsFile`. Each key may appear only once in a
selection. A group shares one post and must have supporting copy for every
included story. Global stories omit `raceSlug` in their news payload. A news
batch used for social must have unique keys.

Use explicit timezone offsets. The scheduler moves an elapsed `startAt` to at
least five minutes in the future and finds the first available slots. Choose
`expiresAt` based on when the post would become stale, for example the start of
the sprint for a sprint-grid story. The entire batch is refused if any post
cannot fit before its expiry. The expiry limits scheduling; it is not a
Buffer-side automatic cancellation timer.

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

These freshness checks run during sweeps and explicit `news social check`
calls. Buffer sends the scheduled copy independently; there is no background
news watcher or check at send time. Recheck pending posts when news changes,
especially before a session. News publication and editorial push selection
remain separate from X selection.
