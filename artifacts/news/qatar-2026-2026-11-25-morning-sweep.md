# News sweep, 2026-11-25 08:00 SAST (06:06 UTC)

Upcoming: Qatar GP (qatar-2026), quali Sat 28 Nov 18:00Z, race Sun 29 Nov 16:00Z.
Last round: las-vegas-2026 (21 active items).

- Access: `gpp race --prod` and Buffer channel list OK. `gpp run globalNews:listForOperators --prod` failed to read the function spec (HTTP 401), so global news was checked through the `news publish` dry run only.
- Scan: 215 items from 7/8 feeds (BBC Sport HTTP 403).
- Created / updated / retracted: none.
- Candidates checked: F1 2030 two-team engine supply limit and Verstappen's 2027 Daytona 24 Hours. Dry runs for keys `f1-2030-two-team-engine-supply-limit` and `verstappen-daytona-24-2027-considering` returned `updated`, meaning both keys were already live from an earlier sweep. Nothing republished.
- Skipped: Las Vegas aftermath already covered by existing keys (Ferrari talks, Piastri radio, Hadjar penalty, Gasly cooling), F2 Herta replacement, 2027 grid roundup, previews and opinion pieces. No new Qatar-weekend development since the Perez penalty and Camara/Haas items.
- X: pending-post check run (dry and `--apply`), queue 0/2 for 2026-11-25, nothing pending. No selection: morning sweep posts only a strong story, none found.
- Failures: none beyond the notes above.
