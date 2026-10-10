# Singapore news sweep — 10 October 2026

Published on production `cheery-tern-274` after a refreshed scan at 09:00 UTC.
The Singapore batch is `singapore-2026-2026-10-10-pre-sprint.json`; the global
batch is `global-2026-10-10-news-check.json`.

## Published

- **Sainz's sprint pit-lane start** — created; pick-related, sprint only.
  FIA document 37 requires the pit-lane start after Williams changed the
  suspension setup under parc fermé without approval. Document 39 confirms
  it on the final sprint grid. This is separate from Sunday's grid and does
  not change the sprint qualifying classification.
- **Hadjar's power-unit replacement** — created; general, no affected
  sessions. FIA document 38 records a previously used engine and turbo, a
  replacement fuel collector and associated parameter changes. All were
  approved. The earlier SQ3 engine-trouble report remains under its own key
  and source; this repair notice adds a separately sourced development.
- **Singapore sprint rain delay** — created; pick-related, sprint only.
  F1's live coverage confirms heavy rain delayed the scheduled 17:00 local
  start and marshals were clearing standing water. Rechecked at 09:06 UTC:
  its overview still said the start was delayed, with no revised start time
  in the visible updates. The source timestamp is the live page's original
  publication time, 08:30:03.524 UTC, rather than an invented update time.
  Reuse this key when a revised start or resumption is announced.
- **Williams cost-cap reform opposition** — created as global general news.
  Read Jon Noble's full report in The Race. Racing Bulls opposes a wholesale
  change; Mercedes and McLaren also raised objections. Vowles will seek a
  2028 change if 2027 support is insufficient. The vote has not happened,
  and the copy does not present the proposal as formally defeated.

No editorial news push campaign was selected. A delay does not change the
application's pick deadline without a separate scheduling decision. New feed
cards use the existing Discord and Reddit publication workflow.

## Coverage

The first scan checked 282 items across all eight feeds. The refreshed scan
checked 281 items across all eight feeds, and an `--all` pass checked stories
hidden by overlap filtering. Read the new McLaren/Stella report; it repeats
Friday's performance assessment and does not require another fuel-fix card.
Mercedes upgrade commentary, Norris's lap assessment, Haas split commentary
and repeat FIA-glitch coverage added no material change to the filed stories.

Sporting checks included the FIA document listing and full documents 36–39.
The final sprint grid has Sainz in the pit lane and Hadjar ninth. No sprint
grid was stored in the Grand Prix `startingGrid` field. Event coverage was
also checked: the Audi livery, Williams kit, Albon helmet and Bottas cycling
story are already published, with no useful new event story in this scan.

## X selection

Checked pending workflow-owned news before and after selection. No stale
cancellations were needed. Selected two posts through the publish-race-news
workflow, following `docs/news-social.md`, on the verified GrandPrixPicks X
channel. Buffer confirmed each post's copy, channel and scheduled time:

- Sainz: **11:10:11 SAST** (09:10:11 UTC), post `6ac9ffcbbba9419ccbf710e2`.
- Hadjar: **11:35:11 SAST** (09:35:11 UTC), post `6ac9ffccf91f772d4589120f`.

The rain delay was not queued on X because its status may change before a
scheduled post sends. The selection and durable ledger are committed with
this sweep. The Sainz post expires for scheduling at 09:30 UTC; Hadjar at
13:00 UTC. Expiry is not a Buffer cancellation timer.

## Validation

- All three race-news production previews passed and their source dates
  matched the FIA document headers or F1 page metadata.
- Production readbacks verified the three race-news headlines, bodies,
  URLs, dates, categories, sessions and surface selections.
- The global publisher has no dry-run argument; its exact payload and
  timestamp were reviewed before the create. A production readback matched
  every payload field and confirmed that the story is active.
- Focused `oxfmt --check` passed for the news batches, report, X selection
  and ledger.
- `pnpm copy:audit` completed with five existing warnings in unchanged UI
  files. Editorial copy was reviewed against `docs/product-voice.md`.
- No application code changed in this sweep. Other concurrent edits and
  the earlier untracked post-sprint-qualifying batch remain outside it.
