# Singapore post-qualifying news sweep — 10 October 2026

Production: `cheery-tern-274`, using `--prod`. Payload:
`singapore-2026-2026-10-10-post-qualifying.json`.

## Published

Six new items and three updates. The starting grid is pick-related and affects
only the race; the other eight are general news with no affected sessions.

- Created the Grand Prix qualifying result: Verstappen beat Leclerc by 0.054s,
  with Hamilton third and Antonelli fourth.
- Updated the existing McLaren sprint-collision story: no penalty for either
  driver. Created Stella's subsequent response as a separate story.
- Updated Stroll/Perez and Albon/Bortoleto/Bottas collision stories with the
  decisions. No penalty was applied; none of these incidents moves Sunday's grid.
- Created Antonelli's setup progress and Ferrari's missed-pole explanations.
- Created Hadjar's qualifying failure. A fresh power unit is his request, not
  a confirmed replacement or penalty.
- Created `singapore-starting-grid`: all 22 positions, explicitly provisional,
  with linked notes for Russell's engine penalty and Hadjar's missing time.

## Grid evidence and outstanding decisions

Read the [FIA provisional qualifying classification](https://www.fia.com/system/files/decision-document/2026_singapore_grand_prix_-_provisional_qualifying_classification.pdf)
and the documented [Russell power-unit penalty](https://www.fia.com/system/files/decision-document/2026_singapore_grand_prix_-_infringement_-_car_63_-_changes_to_pu_elements.pdf).
Read the rendered [official F1 qualifying live account](https://www.formula1.com/en/latest/article/live-coverage-qualifying-in-singapore-2026.17cYORHG0DLsHyQxOhzimh)
through its live-blog iframe. Its post-session analysis explicitly confirms the
top ten after Russell's penalty and Russell/Hadjar sharing the back row.
The remaining classified drivers move up one place, preserving their order.

The array is VER, LEC, HAM, ANT, NOR, PIA, GAS, LAW, LIN, HUL, BEA, OCO, SAI,
BOR, COL, ALO, ALB, STR, PER, BOT, RUS, HAD. Hadjar has no qualifying time and
is not classified, so Russell is ahead of him. Crash.net's complete provisional
grid independently agrees; Motorsport.com's accompanying Hadjar report differs
on the last two places, so it was used only for his mechanical problems.

The FIA had not issued a Grand Prix starting-grid document at the research
cutoff. Hülkenberg/Sainz qualifying impeding summonses were outstanding. The
Saturday new-PU report lists another energy store and control-electronics unit
for Russell, but no new penalty decision was available. No additional penalty
total, Hadjar replacement, Alonso replacement or pit-lane start is assumed.
Recheck the FIA grid and these decisions before Sunday's 12:00 UTC race; edit
the same grid key if anything changes.

## Research

Listed 41 existing Singapore stories before scanning. Standard and `--all`
scans each read 281 entries from all eight feeds. Checked official F1 reports,
the FIA document listing, classifications and relevant decisions in full.
Source article URLs and publication timestamps are retained in the payload.

FIA decisions 54, 55, 56, 58, 61 and 62 were read from both rendered PDF pages.
The titles "Infringement" on documents 61/62 do not mean a penalty was imposed:
both decisions apply no penalty. Lindblad's wrong-direction and Bearman's
Safety Car timing cases also drew no further action. The earlier speculation
about Albon/Bottas penalties was corrected before publication.

The Albon source date is the FIA listing's 16:20 CET upload time, 14:20 UTC.
The F1 live account's 13:00:03.298 UTC timestamp is its original publication,
not the time of the post-session grid entries. The final sprint classification
confirms nine retirements, including Piastri's classified 14th-place DNF.

Read additional full reports on McLaren qualifying, Verstappen's pole,
Russell's repaired car, Mercedes' upgrade and provisional grids. Routine
repetition was not published. The asserted Rwanda 2030 deal lacked official
confirmation, so no definitive calendar announcement was published.

## Verification and distribution

Used `.claude/skills/publish-race-news/SKILL.md` and `docs/news-social.md`.
Publishing provides the normal feed/write-up and first-publication Discord and
Reddit distribution. No news push was selected for these result spoilers.

Previewed the eight stories, applied them, then previewed and applied the grid
after Hadjar's linked story was live. The grid preview returned 22 positions,
two links and no missing news keys. Read back all nine full production records
and checked copy, categories, sessions, drivers, sources, dates, visibility and
the exact grid array against the payload.

Browser verification confirmed all 22 rows and both linked notes on the public
race write-up. An initial stale edge document referenced old asset chunks;
revalidation refreshed the canonical page, which then loaded with no console
errors and displayed the grid. No cache-rule or application change was needed.
The existing dashboard component reads this same live news record, so the grid
is available beside race picks as well as in the feed and write-up.

Checked pending X posts before and after publication. Three earlier post-sprint
posts were reconciled as sent. No stale cancellation was needed. Scheduled
three reviewed posts, each read back by the scheduler and saved in the ledger,
25 minutes apart in Africa/Johannesburg:

- 18:45 (16:45 UTC): qualifying and provisional grid,
  Buffer `6aca6868c4de2d2b1232cba2`.
- 19:10 (17:10 UTC): McLaren ruling and Stella's response,
  Buffer `6aca6869bba9419ccb0af48b`. Selected as a material update to the earlier
  collision post.
- 19:35 (17:35 UTC): Hadjar's qualifying failure,
  Buffer `6aca686abba9419ccb0af4ca`.

All expire for scheduling at 11:30 UTC on Sunday. This is not a Buffer-side
automatic cancellation; pending posts should be rechecked if the news changes.
