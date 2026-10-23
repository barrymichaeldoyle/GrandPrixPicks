# Austin news check — 23 October 2026, evening

Reviewed all eight discovery feeds and read the source articles before publication.

Created and verified on the live United States GP write-up:

- `austin-lindblad-colapinto-bortoleto-grid-penalties`: Lindblad five places, Colapinto ten, Bortoleto twenty and therefore a back-of-grid start. Pick-related; race only. Source: Formula 1, 19:08 UTC.
- `leclerc-austin-fp1-pace`: Leclerc leads Verstappen by 0.084s, Verstappen loses a faster lap to track limits, Williams prioritises data collection. General news, no affected sessions. Source: Formula 1, 18:51 UTC.

Upgrade submissions and Mercedes setup difficulties repeat existing stories. The event stories and liveries are already covered. No news push selected.

Pending X news checked. The reviewed penalties selection previewed and scheduled at 23:10 SAST, then was cancelled before publication after direct Buffer reads established that the channel had already sent two posts today:

- `6adaf9f0535235087b85a671`: sent 06:30:10 UTC.
- `6adb872465d99fb9319d3fdb`: sent 18:30:15 UTC.

The CLI incorrectly reported `queue 0/2` in preview and apply. Deleted the new post `6adbcb049acae620d81a3662` successfully and reconciled its cancellation under the shared journal lock. No new X post remains scheduled from this sweep. Keep the selection as an editorial record; do not reapply it today. The CLI inventory discrepancy needs investigation before relying on its daily count.

## Approved exception

The user subsequently approved an exception for confirmed grid penalties and
requested that the publishing skill reflect it. Updated the skill, social
documentation and CLI to accept an explicit `dailyCapException` reason on
pick-related race news. Routine stories retain the two-post limit. Cancelled
posts can be selected again without claiming a material story update.

Previewed and scheduled the penalties post again as Buffer
`6adbcc45e4be8a4d8626cfd2`, due 23 October at **23:10:55 SAST**
(21:10:55 UTC). The CLI read it back and verified the scheduled content and
time. The exception reason is saved in the selection and shared ledger.
The earlier cancellation above is historical; this approved post supersedes it.

Validation: 26 social tests and 3 CLI tests passed, formatting and diff checks
passed. The standard skill validator could not run because Python lacks
PyYAML; Ruby's YAML parser validated the skill frontmatter instead.
