# Singapore afternoon news sweep — 12 October 2026

Reviewed 76 active Singapore production stories, the empty Austin news list,
all eight discovery feeds and the all-results scan for false duplicate matches.
Read full source text before writing. Checked the official Formula 1 latest
stories, Mercedes' race report, the Singapore organiser's attendance release
and the FIA Singapore document listing, which still ends at document 91.

Created five general stories:

- Leclerc reported unexpected slowing on lap 46. His engineer supplied a
  settings change two laps later; no further recurrence was reported. The
  radio report does not establish a technical cause, so none was asserted.
- Hamilton repeatedly requested permission to pass Leclerc after Ferrari's
  hold-position instruction. This is a separate radio story from his late-race
  pit-stop decision and has its own source and key.
- Alonso complained about power and energy delivery after Hadjar re-passed
  him following the first virtual safety car. No engine failure was inferred
  from his radio complaints.
- Lawson scored ten points across the sprint and Grand Prix, with Racing
  Bulls' 2027 seat decision still pending. The official F1 interview has an
  inconsistent Grand Prix finishing position; the published item deliberately
  uses the supported weekend points total and sprint result, without repeating
  that position. This race-specific story does not duplicate the existing
  global driver-selection timeline.
- Singapore reported 301,294 attendance, its second-largest total and its
  highest since the 2023 track change. Hospitality attendance also set a record.

Updated three existing keys in place:

- Mercedes' upgrade assessment now includes Shovlin's conclusion that
  Antonelli's updated package was faster by the end of the weekend, while
  retaining the need to find its setup window. Both the Mercedes report and
  official F1 team quotes support this. The dated F1 article is the card's
  source, avoiding retaining an old timestamp against an undated replacement.
- The McLaren sprint-collision story now includes Norris' responsibility and
  apology, alongside the unchanged no-penalty outcome.
- Stella's response now records both drivers agreeing the collision was
  unacceptable and further discussions focused on the team's interests.

All eight items are general news with empty affected-session lists. Post-race
stories remain under Singapore. The [publication payload](singapore-2026-2026-10-12-afternoon.json)
retains the source links and available exact publication timestamps. The
attendance release carries a calendar date without an exact timestamp, so its
source timestamp is omitted.

The proposed Imola finale report was held: no official calendar change was
found, and [Formula 1's calendar](https://www.formula1.com/en/racing/2026)
still lists Qatar and Abu Dhabi. No calendar or championship records were
changed. Existing title, track-limits and puncture coverage was not duplicated;
commentary, rankings, party footage and broadcast swearing were not selected.

Production preview passed, followed by five creates and three updates. Exact
headlines and bodies for all eight were verified in the server-rendered live
[Singapore story page](https://grandprixpicks.com/f1-2026-singapore-grand-prix-predictions?story=leclerc-singapore-race-braking-issue).
The first bare-page fetch showed older content; the story-specific live URL
returned the current batch. The social CLI also checked live source snapshots
before scheduling.

Pending X checks were previewed and applied. Yesterday's three remaining
ledger entries reconciled to sent; no stale cancellations were required.
Three selected posts were previewed, scheduled and read back through Buffer
for **17:30, 17:55 and 18:20 SAST (15:30, 15:55 and 16:20 UTC)**:
Leclerc's braking issue, Mercedes' upgrade comparison, then Norris' apology
and Stella's response. The McLaren post is explicitly a material update.
All three are within X's character limit, with 25-minute spacing and
story-specific links. The [selection](../social/singapore-afternoon-2026-10-12/x-selection.json)
and reconciled ledger are retained.

First-publication Discord and Reddit distribution follows the
[publish-race-news skill](../../.claude/skills/publish-race-news/SKILL.md).
No device push was selected. No application code or scoring records changed.
