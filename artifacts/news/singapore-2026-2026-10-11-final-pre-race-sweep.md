# Singapore final pre-race news sweep — 11 October 2026

Checked eight discovery feeds (281 entries), the unfiltered scan, the FIA document listing and full source texts. FIA final grid document 84, published at 11:01 UTC, supersedes the provisional grid.

## Publications

Four created, three updated, no retractions:

- Created Alonso, Stroll and Hadjar Sunday pit-lane start stories. Race only; separate from Saturday sprint stories.
- Created Gasly’s response to the Norris/Piastri no-penalty decision as general news. The ruling remains unchanged.
- Updated Russell’s existing penalty story: another 20 places for his fourth ES and CE, 60 in total.
- Updated the existing SQ1 Overtake Mode error story with Tombazis’s explanation and acknowledgement of compromised fairness. Its affected session remains sprint qualifying.
- Replaced `singapore-starting-grid` in place with the FIA final grid: 19 grid starters and three pit-lane starters, all 22 roster entries. Russell P19; Albon P16, Perez P17, Bottas P18; Alonso, Stroll and Hadjar shown as PL. Hülkenberg remains P10.

FIA documents 79, 80, 81, 78 and all pages of final grid document 84 were downloaded and read. Dates use the document listing’s publication times with the CET offset applied. Hadjar’s final-grid note explicitly cites decision 83. Routine approved replacements in document 82 were not treated as penalties. The newer Hadjar mechanical-problems article repeats Saturday’s failures and was not published as a new Sunday failure.

## Verification and read-bound fix

All new records were read back or checked against the live social snapshot. The public write-up displayed the final grid, P19 Russell and all three PL labels. Publishing linked captions initially exposed a 50-story read bound: new stories existed but grid validation could not find their keys, and the public list omitted them.

The grid was published immediately with accurate pit-lane captions. The backend fix keeps reads bounded at 200, reads the newest rows first, and resolves grid references through their exact indexed keys. Regression coverage checks late publication after 60 stories and linked keys beyond the list bound. The normal production pipeline triggered by the authorized main push deploys this fix before the web build. The complete publication payload retains the desired story links for the final readback.

## Distribution

Pending X posts checked before selection; three earlier posts reconciled as sent. No stale pending posts required cancellation.

Two reviewed posts scheduled through Buffer, 25 minutes apart:

- 13:25 SAST: final grid, three pit-lane starts and Russell’s 60-place penalty. Material update of the previously shared grid; expiry 11:55 UTC before the race.
- 13:50 SAST: FIA acknowledgement of the SQ1 fairness error.

Both created posts were read back by the operator CLI. Write-up URLs include the exact story query parameter. No device push was selected; normal first-publication Discord and Reddit distribution follows the publish-race-news skill.

## Checks

Focused grid regression tests passed (8 tests). Full required pre-push checks run on the isolated checkout. Product copy audit reported only existing warnings. Only this sweep’s artifacts and the backend read-bound fix are included; unrelated working-tree edits are excluded.
