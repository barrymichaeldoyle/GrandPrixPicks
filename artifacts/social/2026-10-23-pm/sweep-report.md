# News sweep 2026-10-23 18:00 SAST

- Created (usa-2026, both general, no affected sessions): austin-upgrades-fia-submissions, verstappen-power-unit-penalty-looming (VER).
- Updated/retracted: none. Scan gaps: BBC Sport 403. Other scan hits were covered, aftermath or not independent news.
- X: one post scheduled for verstappen-power-unit-penalty-looming at 2026-10-23T18:30Z (20:30 SAST), card + link reply. Queue was 0/2, so the daily post was selected.
- Pending-post check: nothing stale.

## Defect
The scheduled post's reply link uses `/f1-2026-usa-grand-prix-predictions`, which 404s. The write-up lives at `/f1-2026-united-states-grand-prix-predictions?story=verstappen-power-unit-penalty-looming`. The CLI treats the post as already queued and will not change it; the selection file keeps the link as scheduled. The post goes out 2026-10-23T18:30Z (20:30 SAST). Fix the reply in Buffer, or cancel it, before then.
