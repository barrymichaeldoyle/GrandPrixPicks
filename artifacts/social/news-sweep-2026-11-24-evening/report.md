# News sweep, Tue 24 Nov 2026, 18:00 SAST

Current race: qatar-2026 (race Sun 29 Nov). Last round: las-vegas-2026.
Access: Convex prod, Buffer channel list and shared social state all worked.

Published (all verified by re-run showing `would update`, and `news show` for Gasly):
- global/engine-makers-two-team-supply-cap-2030 (regulation), Crash, reported proposal, WMSC next month
- global/verstappen-daytona-24-2027 (driver), Motorsport.com
- las-vegas-2026/gasly-las-vegas-cooling-podium (general, no sessions, technical, GAS), Motorsport.com

Skipped: Hadjar penalty analysis (covered by hadjar-las-vegas-safety-car-penalty), F1 2027 grid roundup, Herta F2, opinion pieces.

X: queue was 0/2, so one post selected: Gasly story, scheduled 2026-11-24T16:30Z (18:30 SAST), card image plus link reply.
Pending-post check: nothing stale.

Tooling gap: `globalNews:listForOperators` reads only 50 rows (MAX_GLOBAL_NEWS), so newer global stories
are invisible to the duplicate check and to `news social`, which refused the Verstappen selection. Global stories cannot be
selected for X until the cap is fixed.
