# Singapore pre-race news sweep — 11 October 2026

Production: `cheery-tern-274`, using `--prod`. Research started at 03:51 UTC,
ahead of the 12:00 UTC Grand Prix. Payload:
`singapore-2026-2026-10-11-pre-race.json`.

## Publication

Six new items and one update:

- **Hülkenberg/Sainz:** no penalty after qualifying impeding. Inconsistent
  timing information misled both teams about Sainz taking the chequered flag.
  This is general news, not an invented grid drop.
- **Hadjar:** permission to start, a pick-related item affecting only the race.
  It is separate from his existing qualifying failure and does not assert a
  new power-unit replacement or pit-lane start.
- **Pirelli:** soft tyres favoured for the start, followed by mediums or hards.
  The two-stop time loss is an estimate, not a guaranteed race outcome.
- **Verstappen:** concern about second-gear wet starts, with a possible different
  approach if the race starts wet. No procedure change or wet race is confirmed.
- **Russell:** the repaired car felt different in qualifying. No unconfirmed
  floor damage or mechanical diagnosis is stated.
- **Hamilton:** proposed track changes to improve passing, alongside Verstappen
  and Leclerc's criticism of sprint venues. This is a proposal, not a circuit
  change for today's race.
- **Starting grid:** updated `singapore-starting-grid` in place to cite FIA
  document 75. All 22 positions remain unchanged and the headline remains
  provisional. Russell's note now names the 40-place penalty; Hadjar's note
  links to the new permission-to-start story.

Hadjar's permission and the grid affect `["race"]`. The other five new items
are `general` with no affected sessions.

## Sources and grid checks

Listed 47 active Singapore items before discovery. Standard and `--all` scans
each read 282 entries from all eight feeds. Checked the official FIA documents
that feeds missed, including the full final qualifying classification, the
provisional grid, Hülkenberg's decision, Hadjar's permission and the qualifying
Safety Car line timing decision. The last of those applies no further action.
The available FIA listing ended at document 75; no final Grand Prix grid or
new Sunday car-change decision was available at the cutoff.

The [FIA provisional grid](https://www.fia.com/system/files/decision-document/2026_singapore_grand_prix_-_provisional_starting_grid.pdf)
confirms Hülkenberg tenth, Russell 21st and Hadjar 22nd. Its only penalty note
is Russell's 40-place drop under document 20. It explicitly references Hadjar's
permission under document 71. No extra Russell penalty total is assumed.

FIA publication dates use the listing's CET timestamps converted to UTC:
document 71 at 17:55 UTC, document 73 at 18:47 UTC, document 75 at 19:01 UTC,
all on 10 October. Their document headers use Singapore local time and are
dated 11 October; that date difference is expected.

Read the full Pirelli Saturday report and all three published driver reports
with `gpp page --full`. Their exact URLs and publication dates are retained in
the payload. Pirelli's `17:58:43+02:00` is 15:58:43 UTC, not 17:58 UTC.
Read the newer Mercedes upgrade article in full; it repeats the already
published Antonelli setup progress and does not warrant another item.

The F1 strategy guide and "What To Watch For" articles expose only their
introductions through `gpp page`. Browser inspection confirmed the same
membership gate. The strategy item therefore uses Pirelli's complete primary
report. No gated text or search-summary-only detail was used.

## Verification and distribution

Used `.claude/skills/publish-race-news/SKILL.md` and `docs/news-social.md`.
Normal first-publication Discord/Reddit distribution follows the news feed;
the grid correction updates the existing card. No editorial news push was
selected: these are routine race-day updates, and the qualifying details
include result spoilers.

The six-story dry run passed with the expected sessions, drivers and dates.
After those stories were live, the separate grid preview returned 22 positions,
two linked notes and no missing keys. Apply returned six `created` and one
`updated`. Read back all seven full production records and checked headline,
body, category, sessions, driver codes, sources, dates, active/feed/write-up
selection and the exact grid against the payload.

The public write-up renders all 22 rows, the FIA source, Hülkenberg tenth,
Russell's 40-place note and Hadjar's permission link. Its selected Hülkenberg
story URL produces a distinct `/og/news` image URL while keeping the bare
write-up canonical. Browser verification had no console errors.

Ran pending-post checks in preview and apply modes. Yesterday's three
post-qualifying X posts were reconciled as sent; no stale cancellation was
needed. The new selection uses `?story=<key>` links as required by the updated
social workflow. It covers the FIA rulings, Pirelli's strategy and Verstappen's
start concern. The unchanged grid positions do not warrant reposting yesterday's
grid selection.

Scheduled times in Africa/Johannesburg are 06:15, 06:40 and 07:05, 25 minutes
apart. The scheduler reads back each Buffer create and records it in
`artifacts/social/news-sweeps/ledger.json`. Scheduling expiry is 11:30 UTC,
before the race; it is not an automatic Buffer cancellation timer. Recheck
pending posts and the FIA grid if further car changes are announced.
