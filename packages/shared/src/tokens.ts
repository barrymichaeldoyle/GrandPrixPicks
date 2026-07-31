/**
 * Design tokens — the single source of truth for the Grand Prix Picks look.
 *
 * Creative direction: **Timing Sheet Minimal**. Clean, premium, calm. The
 * racing personality comes from data typography, semantic colour and one
 * signature stripe motif, never from decoration. Dark theme only.
 *
 * The web app is the reference implementation: these values are what
 * apps/web renders, and this file is the only place they are authored.
 * Mobile consumes the same values via `@grandprixpicks/shared/tokens`.
 *
 * Web never redefines a token locally. Editing a value here changes both
 * apps. Run `pnpm generate-tokens` to regenerate apps/web/src/tokens.generated.css
 * (done automatically before web dev/build).
 *
 * Three rules this file exists to enforce:
 *   1. There are no shadows. Elevation is a lighter surface + a 1px hairline.
 *   2. Backgrounds are flat colour. No gradients, textures, noise or glow.
 *   3. Accent is for CTAs, active states and the stripe. Never body text.
 */
export const colors = {
  /*
   * Base — a warm near-black, never pure black.
   *
   * The ramp climbs in even steps (+9, then +8 per channel) so "one surface
   * step lighter" means the same amount of change wherever you are on it:
   *
   *   page      #101113   the canvas
   *   surface   #191a1d   cards, panels
   *   elevated  #212226   selected, or hovering a card
   *   hover     #292a2e   hovering something already elevated
   *
   * `surfaceHover` is a real fourth step rather than an alias of `elevated`.
   * When all three of elevated/muted/hover shared one value, anything already
   * sitting on the raised surface had nowhere to hover to — the 22 driver
   * chips on the picks screen changed only their border, and the fill stayed
   * put. `surfaceMuted` stays level with `elevated` on purpose: it means "a
   * quiet fill at the raised level", not another step.
   */
  page: '#101113',
  surface: '#191a1d',
  surfaceElevated: '#212226',
  surfaceMuted: '#212226',
  surfaceHover: '#292a2e',
  surfaceSunken: '#0c0d0f',

  // Borders — the only elevation mechanism the system has.
  border: '#2c2d31',
  borderStrong: '#3a3b41',

  // Text. Muted copy clears 7:1 on both page and surface backgrounds so
  // long-form public content remains comfortable rather than merely passing.
  text: '#f2f2f0',
  textMuted: '#a7a8ad',
  textDisabled: '#5c5d63',
  textOnAccent: '#101113',

  // Accent (chartreuse) — CTAs, active states, the current user, the stripe.
  // Never body text, never a large fill except a primary button.
  accent: '#d4ff3f',
  accentHover: '#e2ff6e',
  accentPress: '#b8e035',
  // Kept under the old names so existing `bg-accent-muted` utilities land on
  // the quiet tint rather than breaking.
  accentMuted: '#2a3316',

  // Primary action. In this system the CTA *is* the accent — there is no
  // separate red button colour, and nothing is raised, so there is no
  // pressed bottom edge either.
  buttonAccent: '#d4ff3f',
  buttonAccentHover: '#e2ff6e',
  buttonAccentShadow: '#b8e035',

  // Prediction result semantics, F1 sector-colour inspired. Fixed meanings:
  // a miss is grey, never red. The only red in the system is `deltaDown`.
  //
  // Named for the scoring bands in lib/scoring.ts, richest to quietest. The
  // previous names (perfect / beat / close) described a game that does not
  // exist: nothing in the engine "beats" a prediction, and "close" read as
  // off-by-one when it actually means in-the-top-five-but-off-by-two-or-more.
  resultExact: '#c084fc', // exact position, driver finished <= P5 — 5 pts
  resultNear: '#4ade80', // off by exactly one, incl. P5 -> P6 — 3 pts (also H2H correct — 1 pt)
  resultTop5: '#facc15', // in the actual top five but off by 2+ — 1 pt
  resultMiss: '#71717a', // no points

  // Position delta, for batch leaderboard updates. Movement is *labelled*
  // (▲2 / ▼1 / –), never animated.
  deltaUp: '#4ade80',
  deltaDown: '#f87171',
  deltaFlat: '#5c5d63',

  // Brand — retained names, retuned to the new palette. `racingRed` is now
  // only the delta-down red; nothing uses it as atmosphere any more.
  racingRed: '#f87171',
  racingRedMuted: '#3a1f22',
  racingAmber: '#facc15',

  // Sprint weekends — the one domain concept with its own colour. Reuses the
  // violet result semantic so the palette stays at one accent plus four
  // meanings rather than growing a sixth hue.
  sprint: '#c084fc',
  sprintBorder: '#c084fc',
  sprintText: '#d8b4fe',

  // Podium — leaderboard ranks 1/2/3 and the OG share cards. Flat data
  // colours in the manner of team colours: no gradient, no bevel, no metal.
  podiumGold: '#e0b64a',
  podiumSilver: '#a1a1aa',
  podiumBronze: '#b07a44',

  // Semantic. Errors are amber and instructive, not red and alarming.
  error: '#facc15',
  errorMuted: '#3a3416',
  success: '#4ade80',
  successMuted: '#16321f',
  warning: '#facc15',
  warningMuted: '#3a3416',
} as const;

/**
 * Team colours are DATA, not theme — they change every season, which is why
 * they sit apart from the palette above rather than inside it.
 *
 * They appear in exactly two forms: a 3px full-height bar on the left edge of
 * a driver row or chip (`.gpp-team-bar`), and a 5px dot before a team name
 * (`.gpp-team-dot`). Never a background, never text colour, never a card
 * border. Eleven teams in one list stays calm only because the colour is
 * confined to 3px.
 *
 * This lived in two hand-maintained copies (`apps/web/src/lib/teamColors.ts`
 * and `apps/mobile/src/lib/teamColors.ts`) that happened to still agree. Both
 * now re-export from here, so the 2027 grid is one edit.
 */
export const teams = {
  Mercedes: '#00d7b6',
  McLaren: '#f47600',
  Ferrari: '#ed1131',
  'Red Bull Racing': '#4781d7',
  Williams: '#1868db',
  Alpine: '#00a1e8',
  Audi: '#f50537',
  'Racing Bulls': '#6c98ff',
  Haas: '#9c9fa2',
  'Aston Martin': '#229971',
  Cadillac: '#909090',
} as const;

/**
 * Shown for a driver whose team is unknown or not on the current grid.
 *
 * Deliberately darker than every real livery: Haas `#9c9fa2` and Cadillac
 * `#909090` are both silver, so a mid grey here reads as a team rather than as
 * missing data.
 */
export const fallbackTeamColor = '#3f4147';

/**
 * Corner radii in px. Sharp and precise: 2px on anything you interact with,
 * 4px on anything that contains something, pill only for the small team dot
 * and for avatars, which stay circular.
 *
 * Names match the Tailwind radius scale so `rounded-lg` on web and `radii.lg`
 * on mobile mean the same thing. The scale is deliberately flat — `md`
 * through `2xl` collapse onto the two real values, so the ~300 existing
 * `rounded-*` utilities land on-system without a rename pass.
 */
export const radii = {
  sm: 2, // inputs, buttons, chips
  md: 2,
  lg: 4, // cards, panels, tables
  xl: 4,
  '2xl': 4,
  pill: 999,
} as const;

/**
 * The base unit every numeric spacing utility multiplies: `p-4` is
 * `spacing * 4`, `gap-3` is `spacing * 3`, and so on across ~2,400 usages.
 *
 * This is the app's density dial. Changing it retunes every margin, padding and
 * gap at once without touching a component. It is here rather than left to the
 * framework default precisely so a redesign has that lever.
 */
export const spacingBase = 4; // px

/**
 * Deliberate two-speed density. Page chrome is generous while data is
 * compact — that contrast *is* the timing-sheet feel, and it is the one
 * thing to preserve when tuning anything else here.
 */
export const density = {
  rowHeightCompact: 36, // timing sheet rows
  rowHeight: 44, // touch target minimum
  controlHeight: 36,
  controlHeightLg: 44,
} as const;

/** Page frame. Full-bleed nav, 1200px content, 32px gutters. */
export const layout = {
  pageMax: 1200,
  pageGutter: 32,
  navHeight: 64,
  mobileNavHeight: 60,
} as const;

/**
 * Type scale, in px.
 *
 * Weights run one step lighter than usual because light type on dark reads
 * bolder: display and h1 at 300, h2 at 400, h3 and labels at 500, primary
 * buttons at 600. See `weights` below.
 *
 * Names match the Tailwind scale, so `text-sm` in a component and `sm` here
 * are the same thing and the ~850 existing usages need no edit.
 * `lineHeight: null` means 1.
 */
export const typeScale = {
  xs: { size: 12, lineHeight: 17 }, // micro / eyebrow — always uppercase + tracked
  sm: { size: 14, lineHeight: 21 }, // metadata, controls and dense data
  base: { size: 16, lineHeight: 24 }, // minimum default reading size
  lg: { size: 18, lineHeight: 28 }, // marketing and introductory copy
  xl: { size: 22, lineHeight: 29 },
  '2xl': { size: 28, lineHeight: 35 },
  '3xl': { size: 32, lineHeight: 40 },
  '4xl': { size: 40, lineHeight: 45 },
  '5xl': { size: 48, lineHeight: 53 }, // page hero, race name
  '6xl': { size: 60, lineHeight: 64 },
} as const;

/**
 * Monospace data scale. Everything a person *compares* is mono with
 * tabular-nums: lap times, points, positions, deltas, race numbers.
 * Numbers are always numerals, never spelled out.
 */
export const dataScale = {
  xs: 12, // race numbers, deltas
  sm: 14, // lap times, row points
  md: 18, // points totals
  lg: 26, // slot position numbers
  xl: 40, // countdown digits
} as const;

/** Light-on-dark reads bolder, so every role sits one step down. */
export const weights = {
  light: 300, // display, h1
  regular: 400, // body, h2
  medium: 500, // h3, labels, secondary buttons
  semibold: 600, // primary buttons only
} as const;

/** Letter spacing. Display goes negative; micro labels go wide. */
export const tracking = {
  display: '-0.02em',
  tight: '-0.01em',
  normal: '0',
  label: '0.12em', // uppercase micro labels
  data: '0.02em',
} as const;

export const lineHeights = {
  tight: 1.05,
  snug: 1.25,
  body: 1.5,
} as const;

/**
 * Font stacks. Archivo for everything a person reads, IBM Plex Mono for
 * everything a person compares. Both are self-hosted from
 * apps/web/public/fonts — see the @font-face rules in styles.css.
 */
export const fonts = {
  ui: "'Archivo', ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
  data: "'IBM Plex Mono', ui-monospace, SFMono-Regular, Menlo, Monaco, monospace",
} as const;

/**
 * Motion. Applied only to hover, selection and drag. Rows fade in once on
 * load with a small stagger; the countdown ticks. Nothing else moves —
 * in particular, leaderboard positions never animate, because movement is
 * labelled with a delta instead.
 */
export const motion = {
  easeOut: 'cubic-bezier(0.2, 0.8, 0.3, 1)',
  durFast: '150ms',
  dur: '180ms',
  durSlow: '200ms',
  staggerStep: '28ms',
} as const;

/**
 * The signature motif: a 3px vertical bar in the accent, skewed -12deg,
 * pinned to the left edge of the thing that matters — the active card, the
 * selected slot, the current user's row, the active nav item.
 *
 * One stripe per container. Never two, never on all sides, never as a
 * flourish in empty space.
 */
export const motif = {
  stripeWidth: 3,
  /**
   * How far the bottom of the stripe sits left of its top, in px. A fixed
   * offset rather than an angle: see the note on `.gpp-stripe` in styles.css
   * for why a proportional skew cannot work on a container of arbitrary height.
   */
  stripeLean: 5,
  /** Team colour appears only as this bar, or as a 5px dot. Never a fill. */
  teamBarWidth: 3,
  teamDotSize: 5,
  /**
   * Every country flag renders in this ratio, cropped to fill, regardless of
   * the asset's own proportions.
   *
   * Real flags vary enormously — in this set Belgium is 1.15:1 and Qatar is
   * 4.17:1, so at a shared height Qatar rendered 3.6x wider than Belgium.
   * Anywhere a flag sat beside text, that difference pushed the layout around
   * by round. A fixed ratio is the only way a flag can be a predictable box.
   *
   * 4:3 because the fixed size ramp was already built on it (16x12, 24x18,
   * 40x30...), so adopting it changed nothing that was already consistent.
   */
  flagAspect: '4 / 3',
} as const;

/**
 * Elevation is intentionally empty of shadows.
 *
 * This system has none: depth is a lighter surface plus a 1px hairline, and
 * an empty or awaiting-input container uses a dashed hairline instead of a
 * solid one. The scale is kept — mapped to `none` — so that the ~40 existing
 * `shadow-*` utilities compile to nothing rather than to Tailwind's stock
 * shadows, which would quietly reintroduce the look this direction removes.
 *
 * `apps/web/scripts/check-design-tokens.mjs` stops new ones being added.
 */
export const elevation = {
  sm: 'none',
  md: 'none',
  lg: 'none',
  xl: 'none',
  '2xl': 'none',
} as const;

export type Colors = typeof colors;
export type Teams = typeof teams;
export type Radii = typeof radii;
export type TypeScale = typeof typeScale;
export type DataScale = typeof dataScale;
export type Elevation = typeof elevation;
export type Density = typeof density;
export type Layout = typeof layout;
export type Weights = typeof weights;
export type Tracking = typeof tracking;
export type Fonts = typeof fonts;
export type Motion = typeof motion;
export type Motif = typeof motif;
