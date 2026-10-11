# Singapore live-race news sweep — 11 October 2026

Checked the eight discovery feeds (281 entries), unfiltered candidates, FIA documents, existing production stories and pending X posts. The race was still underway. The final grid remains unchanged; no new sporting decision was found.

Published four new general stories, all with empty affected-session lists:

- Bortoleto retired with a suspected gearbox issue; Audi will investigate after the race.
- Colapinto retired with a suspected driveline issue; Alpine will investigate after recovering the car.
- Stroll parked at Turn 15 and retired, bringing out a Virtual Safety Car.
- Piastri made an extra stop after reporting a front-right puncture.

The primary source is [Formula 1’s Sunday live coverage](https://www.formula1.com/en/latest/article/live-coverage-formula-1-singapore-airlines-singapore-grand-prix-2026.64UBFhKsSsN0V9RoD8JQqx). The article extractor returned only the outer page, so the live coverage was read in the browser and its publicly loaded Monterosa history JSON was inspected. Source dates are the individual live-post timestamps: 12:28:17, 13:05:48, 13:11:25 and 13:13:33 UTC respectively. The first two posts carry the teams’ provisional diagnoses. Saturday sprint retirements were not reused as Sunday reports.

The Antonelli pre-start report contains unsupported mechanical claims. The official blog describes a possible brake sensor problem, a successful start and later pedal/fluid concerns without a settled diagnosis; no separate mechanical-failure story was published. Strategy speculation, older duplicates and betting-site articles were excluded.

All four payloads passed production previews, were created and were read back as active, feed-selected and write-up-selected. Browser verification exposed a separate Singapore display issue: the route hid all news after race picks locked. The fix keeps the dated news visible during and after the race and avoids duplicating the store link in the footer. Lifecycle guidance now distinguishes published news from expiring forecasts and decision prompts.

Pending X posts were checked and reconciled; the earlier two pre-race posts were sent. One grouped retirement post was previewed, scheduled and read back for **15:40 SAST (13:40 UTC)**, with a story-specific write-up URL. Piastri’s puncture was not selected for an additional X post. The selection and updated ledger accompany this sweep. First-publication Discord and Reddit distribution follows the [publish-race-news skill](../../.claude/skills/publish-race-news/SKILL.md); no device push was selected.
