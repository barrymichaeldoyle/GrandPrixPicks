# News check — 15 October 2026

Completed the two-day discovery scan and all-results review: 280 items across all eight configured feeds. Read the full selected articles, compared production race/global news, and checked the shared social journal and Buffer queue. User explicitly approved production access, publication and selected X scheduling in this session.

## Published

- `global/red-bull-engine-calibration-gains-2026`: Hodgkinson explains calibration gains without a new engine specification and expects further calibration improvements this season. Original interview: The Race, 15 October 08:48:40 UTC. Global payload fields, length limits, canonical team and source timestamp validated locally (the global publisher has no dry-run argument). Production creation returned document ID `q171ngr04n36brp5p7q8c6xqfh8ga8rr`; social preview verified the exact published snapshot.
- `usa-2026/red-bull-austin-white-race-suits`: white suits with blue accents and vintage-style partner badges. Motorsport.com, 15 October 09:38:09 UTC. Production dry run passed; created and read back the active record with exact copy, source date and both surfaces selected. No matching car livery is asserted.

Both are general news with no affected pick sessions. No device push selected. Existing first-publication Discord and Reddit distribution applies.

## Duplicate and editorial checks

Production already contains `red-bull-mekies-contract-extension-2031`; the provisional Mekies draft was replaced rather than published again. Existing records also cover Hart in Austin, Cadillac operations, Rwanda, the 2027 floor-support rules, McLaren handling and upgrades, and Verstappen's Portimão appearance. The engine calibration interview supplies concrete new information beyond Waché's existing programme assessment.

Read Formula 1's Hadjar reliability follow-up; it mostly repeats existing Singapore failures and recovery coverage. The accessible introduction to its Red Bull upgrade feature overlaps earlier upgrade stories; the full feature requires login and was not used for additional technical claims. Targeted public Haas/FIA searches during the first pass yielded no verified new signing or sporting decision; this is not a complete decisions audit. Commentary, promotions and speculative car-livery claims were not selected.

## Social

Verified Buffer's GrandPrixPicks X channel and Africa/Johannesburg timezone. Checked pending posts, then previewed two selected posts against live source snapshots and the remote journal. Requested 12:50 and 13:15 SAST on 15 October, 25 minutes apart. Apply completed successfully. Both posts were scheduled and read back by the operator CLI at **12:50 and 13:15 SAST** (10:50 and 11:15 UTC). The pending queue check completed without stale cancellations. The shared journal persisted the results and released its lock.

Source batches and the X selection are retained alongside this report. The authoritative ledger is on `claude/news-social-state`; the local ledger is its snapshot. No application deployment or main push. Existing unrelated workspace changes were preserved.
