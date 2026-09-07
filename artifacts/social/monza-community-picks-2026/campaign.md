# 2026 Italian Grand Prix community picks

Post-weekend recap of the community's P1 predictions at Monza.

Rendered by `apps/web/scripts/render-community-picks.mts`, which is the reusable
template. Add a `Campaign` entry and run
`npx tsx scripts/render-community-picks.mts` from `apps/web`.

## Status

- **Race: for posting.** Copy and assets below are ready.
- **Qualifying: DO NOT POST.** The session is too far in the past to be worth
  posting. The card was rendered to prove the template handles a zero-count
  winner, and is kept as the reference for that case. It is not a scheduled
  post, it has no copy written for it, and it should not be attached to one.
  The next qualifying card goes out after Madrid.

Nothing in this campaign is scheduled in Buffer. There is deliberately no
`buffer-schedule.json` here yet; add one only for the race post, and only for
the race assets.

## Race

Counts of players who put each driver in P1: RUS 6, LEC 2, HAM 2, ANT 2 (race
winner), VER 1, NOR 1.

### X

Post: [not yet posted]

> Madrid picks are open. Make yours and you're in the next one of these.

Asset: `monza-community-picks-race-x.png`

### Instagram

Post: [not yet posted]

> Madrid picks are open. Make yours and you're in the next one of these.
>
> Link in our profile.
>
> #F1 #ItalianGP #F1Predictions

Asset: `monza-community-picks-race-instagram.png`

### Alt text

Bar chart of Grand Prix Picks players' P1 predictions for the 2026 Italian Grand
Prix race. George Russell leads with six picks, Charles Leclerc, Lewis Hamilton
and Kimi Antonelli have two each, Max Verstappen and Lando Norris one each. Kimi
Antonelli's bar is marked as the race winner.

### Copy notes

- The copy does not restate the card. Names, counts and the result are already
  on the image, so the caption's only job is what the image cannot do: say what
  to do next.
- The nudge gives a reason to act rather than asking a rhetorical question, and
  it is literally true: every entry feeds the counts on the next card.
- Alt text is the one place that does describe the image, which is its purpose.
- Three hashtags on Instagram. `#Formula1` duplicates `#F1` and `#Monza`
  duplicates `#ItalianGP`, and a brand tag on the brand's own profile adds no
  discovery.
- Verified before writing: Madrid is the next round, qualifying locks
  12 September and the race 13 September, so picks are genuinely open.

## Qualifying (not for posting)

Kept only as the template's zero-count reference. Counts: ANT 4, RUS 3, LEC 2,
VER 1, GAS 0 (pole). No copy is written for these on purpose. Assets:
`monza-community-picks-qualifying-instagram.png`,
`monza-community-picks-qualifying-x.png`.

## Design notes

- Counts, not percentages. With a community this size the real numbers read as
  more honest than a percentage that implies a bigger sample. This reverses the
  note left on `dutch-gp-community-picks-2026`.
- One heading, no sub-labels: circuit, year and session in the accent, then what
  is being counted in the text colour. Title case, never all caps.
- The heading is the biggest thing on the card, with the country flag inline on
  the race line so the second line keeps the full column width.
- Instagram centres the heading because it wraps. The wide card stays left
  aligned on one line each.
- The heading never states the result. The accent bar and its one-word badge
  are the reveal.
- The winner is flagged per pick, not by list position. At Monza the badge sits
  on the fourth bar, and on the shortest bar in qualifying, which is the point
  of each card.
- A count of 0 draws the accent nose alone, so nothing is rounded up into a bar
  for a driver nobody picked.
- Heading is 80px on portrait rather than 88 so a sprint weekend's "Sprint
  Qualifying" still fits on one line.
- No entry total, no driver full names, no header lockup, no logo.
- `GrandPrixPicks.com` is absolutely positioned bottom right, in the corner the
  shortest bars leave empty, so the rows use the full height rather than
  reserving a footer line. It also keeps X's lower-left ALT control clear.
