# Singapore post-race news sweep — 11 October 2026

Checked existing production news, all eight discovery feeds (281 entries), the official Formula 1 live coverage and the FIA Singapore document listing immediately after the race. RSS feeds had not yet picked up the finish. The official F1 event tracker showed the race finished and the live blog supplied the flag order.

Created three general stories and updated one existing general story; all have empty affected-session lists:

- Verstappen’s first Singapore Grand Prix victory on his 250th Grand Prix start, ahead of Leclerc and Antonelli. Norris and Piastri complete the top five.
- Hamilton’s late tyre fade and drop from third to sixth.
- Russell’s recovery from 19th to ninth and Hadjar’s pit-lane recovery to tenth.
- Updated the existing Piastri puncture key with his final-lap pass on Hamilton for fifth; no duplicate puncture item.

The primary source is [Formula 1’s live race coverage](https://www.formula1.com/en/latest/article/live-coverage-formula-1-singapore-airlines-singapore-grand-prix-2026.64UBFhKsSsN0V9RoD8JQqx). The outer article was fetched through the operator CLI, and browser inspection confirmed the finished event tracker. The live page’s publicly loaded Monterosa history JSON was read for the detailed reports, using the individual source-post timestamps of 13:46:44 and 13:48:06 UTC. Earlier entries establish Hamilton’s tyre fade, Piastri’s slow puncture and pass at Turn 16, and both recovery drivers’ starting positions.

At the check, the official result table still said no results available and the FIA listing ended at document 84, the final starting grid. These stories report the finish, not a final post-scrutineering classification. No new formal penalty, disqualification or race retirement was found. Antonelli’s possible track-limits sanction was not presented as a confirmed penalty, and no new mechanical diagnosis was inferred from his radio concerns. Existing retirement stories remain valid.

All four payloads passed production preview, were applied and were read back as active and selected for the feed and write-up. Browser verification confirmed all four cards on the public Singapore page and a story-specific Open Graph image for the win. No application code or scoring records were changed.

The pending X check was previewed and applied. The previous retirement post is sent. Two new posts were previewed, scheduled and read back for **16:05 and 16:30 SAST (14:05 and 14:30 UTC)**: the win, then Hamilton’s tyre fade with Piastri’s recovery. Both carry exact story links. The points recoveries did not warrant a third post. Source snapshots, selection and reconciled ledger are retained with this sweep.

First-publication Discord and Reddit distribution follows the [publish-race-news skill](../../.claude/skills/publish-race-news/SKILL.md). No result-spoiling device push was selected.
