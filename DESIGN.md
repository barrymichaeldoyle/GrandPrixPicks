---
name: Grand Prix Picks
description: Timing Sheet Minimal — a flat, dark, data-first F1 prediction interface where colour only ever means something.
colors:
  page: '#101113'
  surface: '#191a1d'
  surface-elevated: '#212226'
  surface-hover: '#292a2e'
  surface-sunken: '#0c0d0f'
  border: '#2c2d31'
  border-strong: '#3a3b41'
  text: '#f2f2f0'
  text-muted: '#a7a8ad'
  text-disabled: '#5c5d63'
  text-on-accent: '#101113'
  accent: '#d4ff3f'
  accent-hover: '#e2ff6e'
  accent-press: '#b8e035'
  accent-muted: '#2a3316'
  result-exact: '#d000ff'
  result-near: '#00ed46'
  result-top5: '#ffe600'
  result-miss: '#ff3b47'
  delta-up: '#4ade80'
  delta-down: '#f87171'
  delta-flat: '#5c5d63'
  sprint: '#c084fc'
  sprint-text: '#d8b4fe'
  podium-gold: '#e0b64a'
  podium-silver: '#a1a1aa'
  podium-bronze: '#b07a44'
  error: '#facc15'
  error-muted: '#3a3416'
  success: '#4ade80'
  success-muted: '#16321f'
  email-page: '#f4f4f2'
  email-surface: '#ffffff'
  email-border: '#e3e3e0'
  email-text-muted: '#62636a'
  email-sprint: '#6d28d9'
typography:
  display:
    fontFamily: "'Archivo', ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif"
    fontSize: '48px'
    fontWeight: 300
    lineHeight: 1.05
    letterSpacing: '-0.02em'
  headline:
    fontFamily: "'Archivo', ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif"
    fontSize: '32px'
    fontWeight: 400
    lineHeight: 1.25
    letterSpacing: '-0.01em'
  title:
    fontFamily: "'Archivo', ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif"
    fontSize: '22px'
    fontWeight: 500
    lineHeight: 1.25
    letterSpacing: '-0.01em'
  body:
    fontFamily: "'Archivo', ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif"
    fontSize: '16px'
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: '0'
  label:
    fontFamily: "'Archivo', ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif"
    fontSize: '12px'
    fontWeight: 500
    lineHeight: 1.25
    letterSpacing: '0.12em'
  data:
    fontFamily: "'IBM Plex Mono', ui-monospace, SFMono-Regular, Menlo, Monaco, monospace"
    fontSize: '14px'
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: '0.02em'
    fontFeature: 'tabular-nums'
rounded:
  sm: '2px'
  md: '2px'
  lg: '4px'
  xl: '4px'
  pill: '999px'
spacing:
  '1': '4px'
  '2': '8px'
  '3': '12px'
  '4': '16px'
  '6': '24px'
  '8': '32px'
components:
  button-primary:
    backgroundColor: '{colors.accent}'
    textColor: '{colors.text-on-accent}'
    typography: '{typography.body}'
    rounded: '{rounded.sm}'
    padding: '0 20px'
    height: '44px'
  button-primary-hover:
    backgroundColor: '{colors.accent-hover}'
    textColor: '{colors.text-on-accent}'
  button-primary-active:
    backgroundColor: '{colors.accent-press}'
    textColor: '{colors.text-on-accent}'
  button-primary-disabled:
    backgroundColor: '{colors.surface-elevated}'
    textColor: '{colors.text-disabled}'
  button-secondary:
    backgroundColor: 'transparent'
    textColor: '{colors.text}'
    typography: '{typography.body}'
    rounded: '{rounded.sm}'
    padding: '0 20px'
    height: '44px'
  button-secondary-hover:
    backgroundColor: '{colors.surface-elevated}'
    textColor: '{colors.text}'
  button-danger:
    backgroundColor: 'transparent'
    textColor: '{colors.error}'
    typography: '{typography.body}'
    rounded: '{rounded.sm}'
    padding: '0 20px'
    height: '44px'
  button-danger-hover:
    backgroundColor: '{colors.error}'
    textColor: '{colors.text-on-accent}'
  button-text:
    backgroundColor: 'transparent'
    textColor: '{colors.text-muted}'
    typography: '{typography.body}'
    rounded: '{rounded.sm}'
    padding: '0 20px'
    height: '44px'
  input:
    backgroundColor: '{colors.surface}'
    textColor: '{colors.text}'
    typography: '{typography.body}'
    rounded: '{rounded.lg}'
    padding: '8px 12px'
  card:
    backgroundColor: '{colors.surface}'
    textColor: '{colors.text}'
    rounded: '{rounded.lg}'
    padding: '16px'
  badge-status:
    backgroundColor: '{colors.surface-elevated}'
    textColor: '{colors.text-muted}'
    typography: '{typography.label}'
    rounded: '{rounded.sm}'
    padding: '2px 8px'
  nav-tab:
    backgroundColor: 'transparent'
    textColor: '{colors.text-muted}'
    typography: '{typography.label}'
    rounded: '{rounded.sm}'
    height: '64px'
  nav-tab-active:
    backgroundColor: 'transparent'
    textColor: '{colors.accent}'
    typography: '{typography.label}'
    height: '64px'
---

# Design System: Grand Prix Picks

## Overview

**Creative North Star: "The Timing Sheet"**

The FIA timing sheet is the reference object: monospace figures in columns, sector colours with fixed meanings, hairline rules, and nothing on the page that is not a fact. It is a document designed to be read at a glance by someone who is busy, in the dark, and about to run out of time. That is also the person using this product, on a phone, minutes before the lights go out.

The whole system follows from three refusals. There are no shadows: depth is a lighter surface plus a 1px hairline, and the `shadow-*` scale is mapped to `none` so a stray utility compiles to nothing. Backgrounds are flat colour: no gradients, grain, glow, or grid. And colour is never decoration: one accent for what needs action, four fixed hues for scoring outcomes, team livery confined to 3px. Personality does not come from ornament. It comes from the two-speed density (generous page chrome, compact data rows), from type that runs one weight step lighter than usual because light-on-dark reads bolder, and from a single skewed accent stripe pinned to whatever matters most on the screen.

The system is dark-only, and that is a decision about the use scene rather than a category default: this is watched alongside a race, often at night, usually on a phone. The one exception is transactional email, which is light because Outlook drops dark backgrounds outright and Gmail force-inverts what it keeps, so a dark shell would render as a different email for a large share of readers.

**Key Characteristics:**

- Flat by construction. No shadows anywhere, enforced by a lint ratchet.
- Warm near-black base on an even four-step surface ramp; never pure black.
- One accent (chartreuse), rationed to CTAs, active states, the current user, and the stripe.
- Two typefaces with a hard division of labour: Archivo for what you read, IBM Plex Mono for what you compare.
- Colour carries fixed meaning. A hue is never chosen for looks.
- Sharp corners: 2px on controls, 4px on containers, pill only for the team dot and avatars.
- Two-speed density: 36px data rows, 44px touch targets, generous page frame.
- Motion only on hover, selection, drag, and one entrance fade. Leaderboard positions never animate.

## Colors

A warm near-black canvas carrying one high-visibility accent and a small set of hues that each mean exactly one thing.

### Primary

- **Pit Lane Chartreuse** (`#d4ff3f`): The single accent, named for the high-vis yellow-green of marshal bibs and pit lane safety gear. It marks the primary action, the active nav tab, the selected slot, the current user's leaderboard row, and the signature stripe. It is the one colour allowed to be a large fill, and only as a primary button, where the label sits in near-black on top. It is never body text, never a link colour by default, and never atmosphere.

### Secondary

- **Sprint Violet** (`#c084fc`, text `#d8b4fe`): Sprint weekends are the one domain concept with their own colour. It deliberately reuses the violet already present as a result semantic rather than introducing a sixth hue.

### Tertiary

The scoring bands. These are the sector colours of the system, and their meanings are fixed by `lib/scoring.ts`:

- **Sector Violet** (`#d000ff`): Exact position, driver finished P5 or better. 5 points. The richest outcome gets the richest hue, exactly as a purple sector reads on a timing screen.
- **Sector Green** (`#00ed46`): Off by exactly one position, including the predicted-P5-finished-P6 case. 3 points. Also a correct head-to-head call, worth 1 point.
- **Sector Yellow** (`#ffe600`): In the actual top five but off by two or more. 1 point.
- **Miss Red** (`#ff3b47`): No points. Red is available for this because errors in this system are amber, so nothing else claims it. It replaced a grey (`#71717a`) that read as "no data" rather than "you got this wrong", and which fell to 3.3:1 on elevated surfaces. This value clears 4.5:1 on all three surface steps.

Position movement is separate and quieter, because it is a comparison rather than an outcome: **Delta Up** (`#4ade80`), **Delta Down** (`#f87171`, a softer and oranger coral than Miss Red on purpose), **Delta Flat** (`#5c5d63`).

Podium ranks are flat data colours in the manner of team colours, with no gradient, bevel, or metal: **Gold** (`#e0b64a`), **Silver** (`#a1a1aa`), **Bronze** (`#b07a44`).

### Neutral

**Warm Carbon**, a ramp that climbs in even steps (+9, then +8 per channel) so that "one surface step lighter" means the same amount of change wherever you are on it:

- **Carbon Page** (`#101113`): The canvas. A warm near-black, never `#000`.
- **Carbon Surface** (`#191a1d`): Cards, panels, table bodies.
- **Carbon Elevated** (`#212226`): Selected state, or hovering a card. `surface-muted` sits level with this on purpose: it means "a quiet fill at the raised level", not another step.
- **Carbon Hover** (`#292a2e`): Hovering something already elevated. A real fourth step, not an alias, because the 22 driver chips on the picks screen had nowhere to hover to when elevated/muted/hover shared one value.
- **Carbon Sunken** (`#0c0d0f`): Wells and inset areas.
- **Hairline** (`#2c2d31`) and **Hairline Strong** (`#3a3b41`): The only elevation mechanism the system has.
- **Ink** (`#f2f2f0`) / **Ink Muted** (`#a7a8ad`) / **Ink Disabled** (`#5c5d63`): Muted copy clears 7:1 on both page and surface so long-form public content is comfortable rather than merely passing.

Semantic states are deliberately unalarming: **Amber** (`#facc15`) covers error, warning, and destructive intent, and **Success Green** (`#4ade80`) confirms.

Team colours are **data, not theme**. They live in a separate export because they change every season, and they appear in exactly two forms: a 3px full-height bar on the left edge of a driver row or chip, and a 5px dot before a team name.

### Named Rules

**The One Voice Rule.** There is exactly one accent. It marks action and identity, nothing else. If two things on a screen are chartreuse and only one of them is the thing to do, the accent has failed. A global `a { color: var(--accent) }` was removed for precisely this reason: it lit all 29 player names on the leaderboard and buried the one row that mattered.

**The Fixed Meaning Rule.** Every hue outside the neutral ramp has one job. The four scoring bands mean scoring bands; reuse them elsewhere only where the sector-colour reading genuinely holds, never as a general status palette. A red in this system means "you got this wrong", an amber means "attention", and neither is ever swapped for the other.

**The Three Pixel Rule.** Team livery is confined to a 3px bar or a 5px dot. Never a background, never text colour, never a card border. Eleven teams in one list stays calm only because the colour is rationed.

**The Two Palette Rule.** Colour comes from the design tokens, never from Tailwind's stock palette. Two palettes is how the app once shipped share cards in colours it had abandoned, and how a `destructive` class matching no token sat on the cancelled-race badge rendering nothing at all. `apps/web/scripts/check-design-tokens.mjs` enforces this as a downward-only ratchet.

## Typography

**Display Font:** Archivo (variable, 300–600, self-hosted from `/public/fonts`)
**Body Font:** Archivo. The display face _is_ the UI face.
**Label/Mono Font:** IBM Plex Mono (400/500/600, self-hosted)

**Character:** Archivo is a grotesque with slightly compressed proportions and open apertures, which lets it hold a headline at weight 300 and still be legible at 12px in a tracked micro label. IBM Plex Mono carries every figure. The pairing is a working document, not a brand statement: personality comes from weight and tracking, never from a second display face.

### Hierarchy

- **Display** (300, 48px, 1.05, -0.02em): Page heroes and race names. Light because light type on dark reads bolder than its weight suggests.
- **Headline** (400, 32px, 1.25, -0.01em): Section headings.
- **Title** (500, 22px, 1.25, -0.01em): Card and panel headings.
- **Body** (400, 16px, 1.5): The minimum default reading size. Public and marketing prose uses the reading roles (`.gpp-reading-copy` at 16px/1.65, `.gpp-reading-copy-lg` at 18px/1.6) rather than inheriting product density.
- **Label** (500, 12px, 0.12em, uppercase): The micro label that opens a card or heads a column.
- **Data** (IBM Plex Mono, 14px, tabular-nums, 0.02em): Everything a person compares.

### Named Rules

**The Compare-In-Mono Rule.** Anything a person compares is monospace with `tabular-nums`: lap times, points, positions, deltas, race numbers, countdown digits. Digits then line up down a column, which is the entire reason the timing sheet works. Numbers are always numerals, never spelled out. Corollary: mono is for measurement, never a costume for "technical".

**The One Weight Down Rule.** Every type role sits one weight step below where it would normally land, because light-on-dark reads bolder: display and h1 at 300, h2 at 400, h3 and labels at 500, primary buttons at 600. Nothing is heavier than 600.

**The Uppercase Rule.** Uppercase appears in exactly one form: the tracked micro label (`.gpp-label`, 12px, 0.12em). Headings and buttons are sentence case, always. The label does three jobs and no others: it opens a card, it heads a column, and it sits above a section heading as an eyebrow (`F1 PREDICTION GAME`, `HOW SCORING WORKS`, `STEP 1 OF 2`). The eyebrow is a deliberate part of this system, not a generic habit: on a timing sheet the column head names what the figures below are, and that is exactly what it does here. It carries the accent when the section is a step in the flow and muted ink when it is not.

## Layout

The page frame is full-bleed navigation over a 1280px content column with 16px gutters. The header and the page containers share that frame so nav tabs line up with the columns underneath them; neither widens without the other. Header height is 64px on desktop, and the mobile tab bar is 60px.

Spacing is a 4px base unit that every numeric utility multiplies, across roughly 2,400 usages. This is the density dial: changing the base retunes every margin, padding, and gap at once without touching a component, which is deliberately left as a lever for a future redesign.

Density is two-speed, and that contrast _is_ the timing-sheet feel. Data rows are 36px, controls are 36px, and both grow to 44px where a thumb is involved. The growth keys off `pointer: coarse`, not viewport width, so a narrow window on a laptop stays compact while a large tablet does not. Page chrome stays generous while the data stays tight.

The document is the scroll container. Scrolling is never moved into an inner element, because nested scrollers stop mobile browsers from collapsing the URL bar and break pull-to-refresh and native scroll restoration. The header uses `position: sticky` instead.

## Elevation & Depth

**This system has no shadows at all.** Depth is a lighter surface plus a 1px hairline, and nothing more. The `shadow-sm` through `shadow-2xl` scale exists but every step is mapped to `none`, so the roughly 40 legacy `shadow-*` utilities compile to nothing rather than falling through to Tailwind's stock shadows and quietly reintroducing the look this direction removed.

Because the surface ramp climbs in even steps, "one step up" is a reliable unit: a card is `surface` on `page`, selected or hovered it is `surface-elevated`, and something already elevated hovers to `surface-hover`. Beyond that there is nowhere to go, which is the point.

An empty or awaiting-input container is a **dashed** hairline instead of a solid one (`.gpp-empty`). That is the system's only structural variation on the border, and it means "nothing here yet" without needing a colour or an illustration.

### Named Rules

**The No Shadow Rule.** Not softened, not "subtle", not on hover. Zero. If something needs to come forward, it takes the next surface step and keeps its hairline. Enforced by the `elevation` lint ratchet, which catches `shadow-*` utilities and raw `box-shadow` in inline styles.

**The Flat Fill Rule.** Backgrounds are flat colour. No gradients, textures, noise, or glow. This is the rule most likely to be broken by someone reaching for "just a subtle gradient", which is exactly how the previous design accumulated an atmosphere field, a grain overlay, and three separate grid backgrounds. Enforced by the `flat` lint ratchet. If photography is ever introduced it goes inside a 4px-radius container as content, never behind the page.

## Shapes

Corners are sharp and precise: **2px on anything you interact with** (buttons, inputs, chips, badges) and **4px on anything that contains something** (cards, panels, tables). The radius scale is deliberately flat, with `md` collapsing onto 2px and `xl`/`2xl` onto 4px, so the roughly 300 existing `rounded-*` utilities land on-system without a rename pass. Pill radius is reserved for exactly two things: the 5px team dot and avatars, which stay circular.

Every edge in the system is a 1px hairline. Borders do structural work here that shadows do elsewhere, so weight and colour on a border are meaningful, not stylistic.

A border above 1px is always a signal, never a decoration, and it lives on exactly one edge of three named patterns: the 2px underline on an active nav tab, the 2px top edge on the active mobile bar tab, and the 8px bottom rule on a scoring band card, which carries that band's sector colour. The bottom rule is the system's substitute for a shadow on a card that needs to declare a category: it reads as the coloured underscore on a timing sheet column rather than as a decorative accent. The one place a thick coloured border is wrong is the left or right edge of a card, list item, or callout: that is the side-tab pattern, and it appears nowhere in this system by design.

Country flags are pinned to a fixed **4:3 ratio, cropped to fill**, regardless of the asset's own proportions. Real flags run from Belgium at 1.15:1 to Qatar at 4.17:1, so at a shared height Qatar rendered 3.6× wider than Belgium and pushed every row containing a flag around from race to race. A fixed ratio is the only way a flag can be a predictable box. Each carries a 1px inset outline at 10% ink so white-heavy flags (Japan, Canada) do not bleed into the surface.

## Components

### Buttons

**Character:** calm under pressure. Legible and unhurried even though the deadline is not.

- **Shape:** near-square (2px radius). Heights come from the density tokens: 36px compact, 44px standard, and compact grows to 44px on coarse pointers.
- **Primary:** accent fill with near-black label at weight 600. This is the one place the accent is allowed to be a large fill. Hover lightens to `accent-hover`, press darkens to `accent-press`. Disabled drops to `surface-elevated` with disabled ink.
- **Secondary:** transparent with a hairline border; hover strengthens the border and fills to `surface-elevated`.
- **Danger:** amber, outlined at rest so a delete never outweighs the primary action beside it, filling solid only once the pointer has committed. Never red: red means a scoring miss.
- **Text / Tab:** transparent with muted ink, filling to `surface` on hover.
- **Press behaviour:** colour change only. Nothing scales, nothing translates, nothing lifts. There is no elevation to transition.

### Chips

Driver chips and status badges share the control language: 2px radius, hairline border, `surface-elevated` fill when raised. A status badge is a micro label (uppercase, 12px, 0.12em, three words maximum). Selection is a raised surface plus an accent hairline, which is the system's one selection treatment; on rows and slots the same meaning is carried by the stripe instead.

### Cards / Containers

- **Corner Style:** 4px.
- **Background:** `surface` on the `page` canvas.
- **Shadow Strategy:** none. See Elevation & Depth.
- **Border:** 1px hairline, always. Dashed when the container is empty or awaiting input.
- **Internal Padding:** 16px standard, 12px for dense rows.
- **Nesting:** don't. A card inside a card is the failure mode this flat ramp is designed to prevent; use a hairline divider or a surface step instead.

### Inputs / Fields

- **Style:** `surface` fill, 1px hairline, 4px radius, 8px/12px padding, muted placeholder.
- **Focus:** border shifts to the accent plus a 1px accent ring. Globally, `:focus-visible` is a 2px outline at 55% accent with a 2px offset.
- **Error:** amber border and amber message text. Errors are instructive, not alarming.

### Navigation

Icon over uppercase micro label, full bar height, accent underline when selected. The icon fills solid and drops its stroke when active, so selection reads without colour alone. The header uses a 2px bottom border; the mobile tab bar flips to a 2px top border, because a bottom border there would sit off-screen behind the home indicator. Active and inactive class strings are mutually exclusive and never concatenated.

### The Stripe

The signature motif: a 3px accent bar with a 5px lean, pinned to the left edge of the single most important thing on screen. The active card, the selected slot, the current user's leaderboard row, the active nav item. **One stripe per container.** Never two, never on more than one side, never as a flourish in empty space.

It is drawn with a `clip-path`, not `transform: skewX()`. A skew leans the bar proportionally to container height, so a crisp -12deg on a 44px row travelled roughly 76px on a 360px hero card and was clipped away entirely by the `overflow: hidden` the class requires, leaving a nub in the corner and nothing else. The lean is therefore a fixed pixel offset, and the outer edge stays flush from top to bottom with the cant on the inner edge only.

### The Driver Row

The recurring unit of the whole product, and the clearest expression of the North Star: a 3px team-colour bar on the left edge, a mono race number, a three-letter code, a name in Archivo, and a mono figure right-aligned in a tabular column. Team colour identifies without decorating; every number aligns with the number above it.

## Do's and Don'ts

### Do:

- **Do** put every figure a person compares in IBM Plex Mono with `tabular-nums`: times, points, positions, deltas, race numbers.
- **Do** convey depth with the next surface step plus a 1px hairline. The ramp is even, so one step means the same everywhere.
- **Do** ration the accent. Audit test: on any screen, count the chartreuse elements. If more than one is not the action, the current user, or the active state, remove some.
- **Do** use a dashed hairline for empty or awaiting-input containers, and a solid one once filled.
- **Do** keep team colour to the 3px bar or the 5px dot, and nothing else.
- **Do** use amber for errors, warnings, and destructive intent. Errors here are instructive, not alarming.
- **Do** label movement instead of animating it. A leaderboard position change is `▲2` / `▼1` / `–`, never a transition.
- **Do** pull every value from `packages/shared/src/tokens.ts`. It is the only place they are authored, and both CSS layers are generated from it (`pnpm generate-tokens`).
- **Do** grow compact controls to 44px on `pointer: coarse`, keyed off the input device rather than the viewport.
- **Do** render every flag at 4:3, cropped to fill, with the 10% inset outline.

### Don't:

- **Don't** add a shadow. Not on hover, not "subtle", not anywhere. The scale is mapped to `none` and the lint ratchet will catch it.
- **Don't** put a gradient, texture, noise, or glow behind anything. Flat colour only.
- **Don't** reach for Tailwind's stock palette (`bg-slate-900`, `text-red-500`). Use a token. The one accepted exception is `/admin`, which is internal operator tooling with its own visual language and is explicitly exempt from the ratchet; do not let its slate-and-teal leak into a player-facing surface.
- **Don't** use red for an error or a warning. Red means a scoring miss. Amber means attention.
- **Don't** put the accent on body text, on links by default, or on a large fill other than a primary button.
- **Don't** nest a card inside a card. Use a hairline divider or a surface step.
- **Don't** set anything in uppercase except the tracked micro label. Headings and buttons stay sentence case, including when the label directly above them is uppercase.
- **Don't** introduce a second display typeface. The display face is the UI face; personality comes from weight and tracking.
- **Don't** animate anything outside hover, selection, drag, and the one-time row entrance fade. In particular, leaderboard positions never move.
- **Don't** put a thick coloured border on the left or right edge of a card, list item, or callout. Above 1px, colour belongs on a bottom or top edge (the nav underline, the mobile bar tab, the 8px scoring-band rule) where it reads as a column marker rather than a tab.
- **Don't** write a raw `a { color: … }` or any other unlayered base rule. Unlayered CSS beats all layered CSS regardless of specificity and will silently override every Tailwind utility; wrap base styles in `@layer base`.
- **Don't** move scrolling into an inner element. The document is the scroll container.
- **Don't** use a dark shell for transactional email. Email is the one light surface, and the accent there is a background only, never ink: chartreuse on white is about 1.4:1.
- **Don't** redefine a token in `styles.css` or in a component. Edit `tokens.ts` and regenerate, or web and mobile drift apart.
