# Display register

Timing Sheet Minimal (`packages/shared/src/tokens.ts`, `apps/web/src/styles.css`)
is the **product register**: flat surfaces, hairlines, one rare chartreuse
accent, team colour confined to a 3px bar, Archivo 300–600 and IBM Plex Mono
for figures. It is right for every screen where someone reads data or makes a
pick, and it stays the default.

The **display register** is its loud counterpart, for the few surfaces where
the race weekend itself is the content and the page has to be an event rather
than a table. It was introduced on 2026-11-17 with the landing hero, after
three hero concepts built inside the product register were all judged boring:
the register's quiet was the cause, not the copy.

## Where it may be used

A short, fixed list. Adding a surface is a decision, not a styling choice.

- The landing hero: `apps/web/src/routes/-home/LandingHero.tsx`.
- The landing scoring bands: `ScoringBands variant="field"`
  (`apps/web/src/components/ScoringBands.tsx`).
- Race write-up heroes: `apps/web/src/components/race-writeups/RaceWriteupHero.tsx`
  (display title, lap outline) and the chartreuse store card
  (`RaceWriteupStoreLink.tsx`).
- How to play: `apps/web/src/routes/how-to-play.tsx` (since 2026-11-18). It is
  read by people deciding whether to play, so it teaches with the game's own
  colours instead of describing them:
  - a display h1 (`.gpp-display .gpp-display-writeup`, light second line) and
    `.gpp-display-h2` section headings;
  - the four scoring outcomes as fields of their result colour
    (`bg-result-*`, near-black ink), each with an example pick;
  - example drivers as team-colour chips and a duel drawn as the picker
    draws it (`.gpp-team-fill` + `teamFillStyle`, the picked-driver rule
    below);
  - the weekend's sessions as a strip, scored sessions filled.

  Its icons and links stay quiet (muted, ink with an underline): chartreuse is
  still only the page's one primary action.

- Candidates, not yet built: OG and social cards, the season recap.

Never in game UI (the picker, pick rows, standings, results, leagues,
settings), with one exception below.

## Picked drivers (product register, since 2026-11-17)

A driver the player has picked wears their team's colour as a fill, everywhere
a pick is drawn: the pool card (`DriverPool`), the pick row's number block
(`PickRows`), the phone summary strip (`MobilePickSummary`), the called duel
card (`H2HDuelQuestion`) and the called cell in the team-mate bar
(`H2HPicksBar`). Unpicked drivers keep the 3px bar, so the pool stays quiet and
the five a player chose stand out. Chartreuse still marks the active cell.

The mobile app follows the same rule (since 2026-11-18): `DraggableTop5`,
`TopFivePicksBar`, `H2HPicksBar`, `H2HDuelQuestion`, and the saved rows in
`Top5Section` and `H2HSection`, through `getTeamFill` in
`apps/mobile/src/lib/teamColors.ts`. The contrast maths is shared:
`packages/shared/src/teamFill.ts`.

An open battle in either app's team-mate bar shows the team's three-letter
code (`teamCode`, `packages/shared/src/teamCode.ts`), so the bar reads as one
row of codes: a filled cell is a call, a dashed one is still open.

Fills go through `teamFillStyle` / `readableTeamFill` in
`apps/web/src/lib/teamColors.ts` (the latter shared from `packages/shared/src/teamFill.ts`): the ink is whichever of near-black and
near-white reads better, and a livery that reaches neither at 4.5:1 (Ferrari
and Audi red) is darkened in small steps until white does. A test holds every
team on the grid to 4.5:1.

## What it allows

| Rule in the product register                   | Display register                                                                                                                                                                       |
| ---------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Archivo 300–600                                | Archivo 900 for one display line per page (`.gpp-display`). The variable font file already covers 300–900, so this costs no bytes. 300 is the companion weight (`.gpp-display-light`). |
| Type scale tops out at page headings           | Display sizes: `.gpp-display` (up to 8rem) and `.gpp-hero-digits` (up to 4rem mono).                                                                                                   |
| Team colour is a 3px bar or 5px dot            | Team colour may fill a block that is _about that team_: the hero's news bands. Text on it is whichever of `textOnAccent` and `text` has more contrast (`inkForFill`).                  |
| Nothing moves except hover, selection and drag | One draw-in on load: a lap outline drawn with `stroke-dashoffset`, one car running one lap, staggered slide-ins. Each plays once. Nothing loops.                                       |
| No illustration                                | Circuit outlines from licensed geometry (OpenStreetMap, ODbL, credited in the source file).                                                                                            |
| Flags are a plain 4:3 box                      | The race's flag cut to the brand mark's -12deg shear (`<Flag shear>`, `.gpp-flag-shear`) beside the hero eyebrow, sliding in once (`.gpp-hero-flag`).                                  |

## What still holds

- No shadows, gradients, glow, noise or textures. Depth is still a surface
  step and a hairline.
- Chartreuse still marks the one action and the active state (the next session
  to lock). It does not become decoration.
- Motion is transform, opacity and `stroke-dashoffset` only, and
  `prefers-reduced-motion` shows the finished state.
- The h1 is never hidden or faded in: it is the page's LCP element.
- Copy follows `docs/product-voice.md` unchanged. Loud type is not licence for
  louder words.

## Classes

All in the "Display register" block at the end of `apps/web/src/styles.css`:
`.gpp-display`, `.gpp-display-light`, `.gpp-hero-digits`, `.gpp-hero-lap*`,
`.gpp-hero-session-*`, `.gpp-hero-band*`.
