# Baku crash archive

Four cards drawn from the crash archive on the 2026 Azerbaijan write-up.
Rendered from the page's own data on 7 September 2026.

Status: **not scheduled.** Assets exist and have been eyeballed; nothing has
been queued in Buffer and no channel has been told about it.

## Purpose

Nobody has assembled a per-corner picture of a Formula 1 circuit's crashes, and
that assembly is the only thing on this site that a stranger might link to.
Referring domains are the measured bottleneck (two, at the time of writing),
not indexation and not content, so these cards exist to earn one rather than to
drive clicks.

Post the picture and the numbers. Do not post a link into a subreddit: r/formula1
removes self-promotion, and a card that gets reposted without a URL is still
worth more than a removed thread. The watermark does the attribution.

## What these are not

**Not tips.** Nothing in the copy may suggest these numbers say who to pick.
The cars and the regulations changed under them and drivers learn from a wall.
The archive is circuit history, and the driver card names Ricciardo and
Raikkonen precisely because it is not about who is racing in 2026.

## Composition

Both frames carry the logo lockup: the app's own SVG mark from
`src/lib/og/templates.ts` with the wordmark beside it, never a redrawn
lookalike.

**The map is generated, not imported.** The Madrid lap map embeds a PNG
exported by hand from its write-up, so a change to that map is a change in two
places. This script builds the lap from `bakuCircuitGeometry` and `bakuCrashes`
and rasterises it on the way past, which means the card cannot be a picture of
an older version of the data.

The corner callouts are drawn by satori, not inside the SVG. resvg has no font
of its own and cannot parse the WOFF satori uses, so `<text>` inside the
rasterised lap vanished silently and the first render came out with unlabelled
markers. Drawing them in the layout layer fixes that and reads better anyway: a
numeral inside a small circle is unreadable at the size a card is actually seen.

The figures beside the map are deliberately not the three the callouts already
carry. Repeating them spent the row saying nothing, so it holds what the
picture cannot show: the total, the span, and how much of the lap is
implicated.

Raw counts, never percentages. Nine weekends is a small enough sample that a
share would imply a bigger one, which is the same rule the community picks
cards follow.

## Format

| Channel   | Asset                                       | Size      |
| --------- | ------------------------------------------- | --------- |
| Instagram | `baku-crash-map-2026-corners-instagram.png` | 1080x1350 |
| X         | `baku-crash-map-2026-corners-x.png`         | 1600x900  |
| Instagram | `baku-crash-map-2026-drivers-instagram.png` | 1080x1350 |
| X         | `baku-crash-map-2026-drivers-x.png`         | 1600x900  |

Regenerate with `pnpm --filter @grandprixpicks/web social-baku-crash-map`.
Buffer attaches assets by URL, so deploy and hash-verify the copies under
`public/social/` before scheduling anything.

## Draft copy

Facts below are from `tally.json` and the archive; check them against the page
before posting, because the archive is hand-maintained and moves once a year.

**Corners, X.** No hashtags, no self-tag: that is the brand account convention.

> Nine Formula 1 weekends at Baku, 57 crashes, and they are not spread evenly.
> Turn 3 has taken 11 cars. Turn 15 has taken 10. Between them that is more
> than a third of everything the circuit has collected since 2016.

**Corners, Instagram.** Hashtags belong here.

> Turn 3 has claimed 11 cars at Baku since 2016 and Turn 15 another 10. Twelve
> of the 20 corners have taken at least one. Every incident on the map is
> sourced on the site.

**Drivers, X.**

> Nobody has been caught out at Baku more than Nico Hulkenberg and Lance
> Stroll, on six apiece since 2016. Daniel Ricciardo is next on five, and he
> won there.

The Ricciardo line is the one worth keeping: he crashed in qualifying in 2017,
started tenth and won the race. That is the tone for all of this. It is a place
that catches people out, not a list of who is bad at driving.

**Drivers, Instagram.**

> Baku has caught out 31 different drivers since 2016. Two lead the list on six
> each. Full archive, every incident sourced, on the site.
