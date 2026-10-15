# Evening news check — 15 October 2026

Production state: United States GP (R18) upcoming, quali locks 24 Oct 21:00Z.
Scan (4 days) returned 195 items from 6 of 8 feeds; RaceFans and BBC Sport
returned HTTP 403. Read the Sky Sports and Motorsport.com articles in full.

- **Created** (usa-2026, general, no affected sessions):
  [williams-marvel-show-car-austin-fan-zone](usa-2026-2026-10-15-evening.json).
  Show car only, will not run at COTA.
- **Updated** (global): [camara-haas-2027-seat](global-2026-10-15-evening.json)
  now reports the official multi-year signing instead of the earlier
  RacingNews365 report.
- **Retracted**: `mekies-red-bull-contract-extension-2031` (global). I created
  it before finding that an earlier run today had published the same story as
  `red-bull-mekies-contract-extension-2031`, which stays live. The duplicate was
  live for a few minutes, so a Discord post may have gone out for it. Cause: the
  duplicate check read only local artifacts for global news, not the production
  list.
- Skipped: FIA sidepod/floor-support report (covered by the existing 2027
  floor-support story), Russell Las Vegas penalty (repeat of "maybe"), Antonelli
  title features, driver-market lists, Horner interviews.

Verification: Williams story read back via `news list usa-2026`; global items
read back via `globalNews:listForOperators` (Câmara active with new source
date; duplicate Mekies inactive). Pending X check applied, no cancellations.

X: one post scheduled and read back, **18:35 SAST / 16:35 UTC, 15 October**
(Câmara signing, marked a material update). Williams and the retracted Mekies
story were not selected. No device push selected.
