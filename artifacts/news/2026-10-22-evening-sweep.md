# Evening news check — 22 October 2026 (18:00 SAST)

Current weekend: United States GP (usa-2026), qualifying locks Sat 24 Oct 21:00Z.
Read existing race and global news, ran the feed scan (215 items from 7 of 8
feeds; BBC Sport returned HTTP 403) and read the full articles for the stories below.

Created three general global stories, no affected sessions
([payload](global-2026-10-22-evening.json)). The global publisher has no dry run, so
fields, limits, team names and timestamps were checked locally. All three were read
back from production as active.

- `cadillac-charlotte-engine-factory-opening`: Charlotte factory opens 18 December.
- `fia-2027-f1-non-f1-staff-separation`: WMSC-approved 2027 staff separation rules.
- `alpine-adobe-ai-fan-experience-partner`: Adobe becomes Alpine's AI fan experience partner.

Updated or retracted: none. Skipped: Horner/Hamilton and Marko retrospectives,
Norris clothing line, FIA V8 timeline (no new decision, "hopefully in a few months"),
fan-zone listings, MotoGP items. The Singapore McLaren-talks story was not written up.

X: the pending-post check ran with `--apply` (no stale posts). One post scheduled for
the FIA rules story at 18:45 SAST on 22 October, verified by the CLI. Shared state was
available. No failures.
