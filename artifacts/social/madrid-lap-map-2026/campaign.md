# The Madring lap map

A race-week post built on the lap map drawn for the 2026 Madrid write-up. Facts
were checked against the write-up on 3 September 2026.

Status: scheduled on both channels for Monday 7 September, 18:30 SAST.
Post ids and verification are in `buffer-schedule.json`.

## Purpose

The Madring is the one round this season with no result to look back on, and
the map is the only picture of it anybody has. This post shows the lap, states
the three numbers that describe it, and sends readers to the guide that says
what the corners do.

## Schedule

Monday, 7 September at 18:30 SAST, on both channels. Race week starts the
following Thursday, so this is the lead-in rather than the weekend post.

## Composition

Both cards carry the logo lockup: the app's own SVG mark from
`src/lib/og/templates.ts` with the wordmark beside it, never a redrawn
lookalike.

On X the map is the whole frame and the type sits in the ground the lap does
not reach, bottom right, aligned to the same gutter the logo sits on. Type
dropped into the middle of the lap reads as part of the diagram, and it landed
a badge's width from Turn 18.

Instagram stacks: headline, map, numbers, then a full-width accent bar carrying
the call to action. The bar is the one loud element and it follows the system's
own rule, that the accent is the call to action. Without it the card was four
shades of near-black in a feed of photographs, and the only bright thing on it
was a 15px domain in the corner. The standfirst came off at the same time: a
second paragraph goes unread in a feed, and the caption is directly below.

## Format

| Channel   | Asset                               | Size      |
| --------- | ----------------------------------- | --------- |
| Instagram | `madrid-lap-map-2026-instagram.png` | 1080x1350 |
| X         | `madrid-lap-map-2026-x.png`         | 1600x900  |

Rendered by:

`pnpm --filter @grandprixpicks/web social-madrid-lap-map`

The art is the write-up's own map, kept as a PNG in `source-art/` because
satori cannot decode the WebP the site serves. Re-export it whenever the map
changes, or the post and the page drift apart.

The map is an illustration of a circuit layout, drawn and recoloured onto the
design tokens by the scripts in this repo. It is a diagram, not a photograph
and not a depiction of anybody.

## X

> Formula 1 has never raced at the Madring.
>
> 22 corners, 5.416 km, and a 550 m banked right at Turn 12: the longest banked
> corner on the calendar, estimated at 250 kph and about 4G.
>
> The Madrid guide:
> https://grandprixpicks.com/f1-2026-madrid-grand-prix-predictions?utm_source=x&utm_medium=organic&utm_campaign=madrid_lap_map_2026

No hashtags.

## Instagram

> Formula 1 has never raced at the Madring.
>
> 22 corners, 5.416 km, 57 laps. Turn 12 is a 550 m banked right, the longest
> banked corner on the calendar, estimated at 250 kph and about 4G for a couple
> of seconds.
>
> The full Madrid guide is linked from our profile.
>
> #MadridGP #SpanishGP #Madring

Use the write-up as the profile link while this post is current.

## Facts and where they come from

| Fact                       | Source                                       |
| -------------------------- | -------------------------------------------- |
| 5.416 km, 22 corners       | Madrid write-up layout table, from Formula 1 |
| 57 laps                    | Madrid write-up layout table                 |
| Turn 12, 550 m, 24 percent | Madrid write-up, sourced to The Race         |
| 250 kph and about 4G       | The Race, carried as an estimate on the page |
| No previous F1 race        | Madrid write-up: the circuit debuts in 2026  |

The map's straight-mode zones and Overtake points are the artwork's own and are
not sourced from FIA event notes, which do not exist for a circuit that has
never held a Grand Prix. Neither post's copy claims them.
