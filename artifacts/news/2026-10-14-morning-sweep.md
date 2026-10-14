# Morning news check — 14 October 2026

Checked the two-day discovery scan, including all results, against existing
production news. The scan returned 261 entries from seven of eight feeds;
RaceFans returned HTTP 403. Targeted web searches supplemented discovery.
Read the full selected articles and original sources before publication.

Created three general global stories in the
[published batch](global-2026-10-14-morning.json), with no affected pick sessions:

- Rwanda's proposed circuit design: 6km, 17 corners, 197 metres of elevation
  change across a lap, and a route around two hills and a lake. Formula 1's
  feature provides details beyond the existing ten-year race agreement.
- The FIA's tighter 2027 floor-support geometry. Checked Article C3.5.14 in
  the published issue 3 regulations, including the 5mm fillet-radius rule and
  constraints on intersections with bodywork. This is sourced directly to the
  regulations. The story avoids repeating reports that confuse support
  diameter with bodywork junction radius, and does not assert that current
  cars have been ruled illegal. The document gives a publication date without
  an exact time, so sourcePublishedAt is omitted.
- Waché's assessment of Red Bull's in-house engine programme. Read the
  original RacingNews365 interview rather than relying on Motorsport.com's
  retelling. His four-or-five-out-of-ten score is a subjective assessment;
  the story does not turn it into a claim that 50–60% more power is available.

Reviewed global keys before creating these stories. The global publisher has
no dry-run parameter; payload fields, length limits, canonical team name and
source timestamps were checked locally. The initial publication request failed
with a network/DNS error. Production read-back confirmed none had been created
before the approved retry. The retry created all three; operator read-back
verified their exact payloads and active status. The social preview also
validated selected stories against the published batch.

Sky's Las Vegas penalty article repeats Russell's previously published
"maybe Las Vegas" comment, not a confirmed new decision. Its metadata also
carries a future timestamp and its calendar sidebar conflicts with existing
official season information. No penalty, calendar or scoring change was made.
Tom Hart's engineer duties and other repeated Singapore reports were skipped.
The FIA Singapore document listing still ends at document 91.

Pending X checks were previewed and applied; no stale cancellations were needed.
Selected two posts, previewed their exact copy and spacing, then scheduled and
read them back through the social CLI for **07:35 and 08:00 SAST / 05:35 and
06:00 UTC on 14 October**. The first covers Rwanda's design, the second the
2027 floor-support rules. Waché's interview stays in the feed without a
separate X post. The
[selection](../social/news-2026-10-14-morning/x-selection.json) and updated ledger
are retained. No device push was selected. First-publication Discord and Reddit
distribution follows the
[publish-race-news workflow](../../.claude/skills/publish-race-news/SKILL.md).
