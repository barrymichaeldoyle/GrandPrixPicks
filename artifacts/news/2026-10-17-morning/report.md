# News check — 17 October 2026 morning

Reviewed 281 items from all eight configured feeds, including the unfiltered scan, against live Austin and global news. Read the existing Singapore Russell item before deciding whether the later report added anything. Production targets `cheery-tern-274`; Austin (`usa-2026`, 25 October) is the upcoming round.

Published three new general-news items, with no affected sessions:

- `beganovic-ferrari-reserve-driver-2027` — global news, Ferrari development and reserve role from 2027. Used Beganovic’s own announcement, published 16 October 11:20:41 UTC; no race seat or immediate driver replacement implied. Validated fields and limits locally because the global mutation has no preview, then verified every stored field and active status in production.
- `lawson-austin-garage-sessions` — Austin event news. Lawson & Friends headline at Inn Cahoots on 22 October, with the music programme from 7pm to 9:15pm. Read Racing Bulls’ full announcement in Chrome after the CLI returned a JavaScript loading shell. Source published 16 October 11:58 UTC.
- `cota-giant-cowboy-hat` — Austin event news, sourced to the full Motorsport.com report published 16 October 12:33:56 UTC and corroborated against COTA’s visitor guide. Kept the Guinness inspection pending; did not claim a verified record or repeat potentially ambiguous dimensions.

Rehearsed both Austin items, published, and read back the active records. Verified both bodies on the live United States race write-up (HTTP 200). The initially composed social URL used `usa` rather than the route’s `united-states`; the HTTP check caught it and the selection was corrected before any scheduling preview or apply.

No new confirmed penalty, replacement or schedule change established. Russell’s Las Vegas suggestion is already preserved as tentative under `russell-singapore-future-engine-penalty`; the new report repeats that quote, so no duplicate or correction. Skipped repeated Câmara, Mercedes specification, Williams anniversary, Rwanda and Verstappen GT stories, plus commentary and promotional videos without a substantive new development. No news push selected.

Pending X preview and apply checks completed with no stale cancellations. Selected Beganovic and Lawson for X, with 25-minute spacing. The hat remains in the feed/write-up without its own social post. Scheduling preview: 17 October 08:00 and 08:25 SAST (06:00 and 06:25 UTC). Final scheduling outcome follows.

Both reviewed posts scheduled successfully through Buffer with content/time read-back and shared-journal persistence. Beganovic: **17 October 08:00 SAST**, post `6ad301691694d771d51e1cea`. Lawson: **17 October 08:25 SAST**, post `6ad30176c34368e4b0a99a54`. The apply completed successfully and checked the X news queue. Channel/account timezone: `Africa/Johannesburg`. Retained published batches, selection and local ledger snapshot. No deployment, calendar/result/scoring change or main push.
