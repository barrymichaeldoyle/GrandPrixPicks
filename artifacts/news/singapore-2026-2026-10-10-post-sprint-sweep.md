# Singapore post-sprint news sweep — 10 October 2026

Production: `cheery-tern-274`, using `--prod`. Payload:
`singapore-2026-2026-10-10-post-sprint.json`.

## Published

Seven new stories, all general news with no affected sessions. These report the
completed sprint; none asserts a qualifying restriction, a Sunday grid change
or an amended sprint classification.

- **Verstappen's win:** Hamilton and Leclerc completed the podium; Antonelli,
  Lawson, Bearman, Hülkenberg and Norris took the other points places.
- **McLaren's final-lap collision:** Piastri retired and Norris finished eighth;
  the Turn 5 incident was referred to the stewards after the sprint.
- **Russell's crash:** he took the lead at the start, then crashed at the final
  corner. No lap number is asserted because early reports disagreed.
- **Stroll/Perez:** both retired after early contact, with a post-sprint
  investigation pending. No corner number or blame is asserted.
- **Hadjar:** lack of power and an instruction to stop. No component failure,
  link to his earlier engine replacement or further penalty is assumed.
- **Colapinto:** the Alpine shut down during the Safety Car period; the cause
  remained undiagnosed in the live account.
- **Albon/Bortoleto/Bottas:** contact around the restart preceded their
  retirements; the Albon/Bortoleto Turn 16 incident was referred for investigation.

Nine drivers retired. The result report classifies Piastri 14th, one lap down,
and lists the other eight as DNFs. Retirement and a DNF label are distinct here.

## Research and source dates

Listed all 34 existing Singapore stories before discovery. Standard and `--all`
scans each read 281 items from all eight feeds. Their snapshots had not yet
included the finished sprint. Checked the live F1 account and outlet listings
for the user-mentioned retirements.

Read the full [The Race result](https://www.the-race.com/formula-1/f1-2026-singapore-grand-prix-sprint-race-result/),
published `2026-10-10T10:21:54.000Z`. This supports the result card.

Read the rendered [official F1 live coverage](https://www.formula1.com/en/latest/article/live-coverage-f1-sprint-in-singapore-2026.5TXFKG7uP5goYHSqUotcmZ)
through the browser, including older entries loaded by scrolling. It supports
the six incident cards. The article's original metadata date is
`2026-10-10T08:30:03.524Z`; that is the saved source publication date, not the
time of the incidents. Post-sprint and retirement entries were read between
10:22 and 10:26 UTC.

Also read Motorsport.com's complete sprint-report text available at the time,
Russell crash report and Wolff cost-cap commentary. Its early crash reports
disagreed on lap/corner details, so the cards use the official live account
without those disputed numbers. Cost-cap and Mercedes upgrade commentary
added no necessary new event card to this sweep.

The FIA document listing still ended at document 39, the final sprint grid,
when checked. The official F1 sprint-results page had no results available.
No formal post-sprint penalty or final FIA classification is claimed.
Lindblad's wrong-direction incident remains an investigation to revisit when
a decision is published; he completed the sprint and was not a retirement.

## Distribution and verification

Used `.claude/skills/publish-race-news/SKILL.md` and `docs/news-social.md`.
Publishing creates the feed/write-up cards and their normal Discord/Reddit
distribution. No news push was selected because these are result spoilers.

The seven-item production dry run passed with the expected source dates and
driver codes. Apply returned seven `created` results. Each production record
was read back and checked against its headline, body, category, sessions,
drivers, source URL/name/date and active/feed/write-up selection.

Pending X checks ran in preview and apply modes. No stale cancellations were
needed. Both earlier posts were confirmed sent; the Hadjar ledger status was
updated from scheduled to sent.

Selected three X posts in `../social/singapore-post-sprint-2026-10-10/x-selection.json`:
the result, the McLaren clash, and Russell/Hadjar/Colapinto's early retirements.
Their copy reports completed events without predicting investigation outcomes.
Preview and apply both confirmed 12:40, 13:05 and 13:30 Africa/Johannesburg,
25 minutes apart; expiry is 12:30 UTC, before Grand Prix qualifying. Buffer
creates were read back by the scheduler and recorded in the ledger:

- Result: `6aca1371d9cab260a7be33cc`, 10:40 UTC.
- McLaren: `6aca1372f91f772d458cb15e`, 11:05 UTC.
- Early retirements: `6aca1373c4de2d2b1222c8db`, 11:30 UTC.
