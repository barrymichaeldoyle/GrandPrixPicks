/**
 * Design tokens — the single source of truth for the Grand Prix Picks palette.
 *
 * The web app is the reference implementation: these values are what
 * apps/web renders, and this file is the only place they are authored.
 * Mobile consumes the same values via `@grandprixpicks/shared/tokens`.
 *
 * Web never redefines a token locally. Editing a colour here changes both
 * apps. Run `pnpm generate-tokens` to regenerate apps/web/src/tokens.generated.css
 * (done automatically before web dev/build).
 *
 * Dark mode is currently the only theme; `.dark` is hard-coded on <html>.
 */
export const colors = {
  // Base — a near-black night-race canvas.
  page: '#0a0e17',
  surface: '#131a27',
  surfaceElevated: '#192231',
  surfaceMuted: '#222d3e',
  surfaceHover: '#273349',

  // Borders
  border: '#2b3749',
  borderStrong: '#46546a',

  // Text
  text: '#f8fafc',
  textMuted: '#a4adbb',

  // Accent (teal) — navigation, icons, highlights.
  accent: '#31b8ab',
  accentHover: '#50c9bd',
  accentMuted: '#143f3d', // dark background tint

  // Action (warm red) — primary buttons. Dark enough for 4.5:1 white text.
  buttonAccent: '#c0263a',
  buttonAccentHover: '#d72d42',
  buttonAccentShadow: '#761827', // the pressed/bottom edge on raised buttons

  // Brand — motorsport livery accents used for emphasis and atmosphere.
  racingRed: '#f04455',
  racingRedMuted: '#5f1726',
  racingAmber: '#ffb020',

  // Sprint weekends — the one domain concept with its own colour.
  sprint: '#7e22ce', // badge background, used as a low-alpha wash
  sprintBorder: '#a78bfa',
  sprintText: '#c4b5fd',

  // Podium — leaderboard ranks 1/2/3 and the OG share cards.
  podiumGold: '#fbbf24',
  podiumSilver: '#9ca3af',
  podiumBronze: '#d97706',

  // Semantic
  error: '#f87171',
  errorMuted: '#7f1d1d',
  success: '#34d399',
  successMuted: '#064e3b',
  warning: '#fbbf24',
  warningMuted: '#78350f',
} as const;

/**
 * Corner radii in px. Deliberately tighter than the framework defaults: the
 * racing/technical geometry stays crisp without every control looking cut from
 * the same sheet of metal. Identity and status elements (avatars, rank badges)
 * use `pill` and keep their full circle shape.
 *
 * Names match the Tailwind radius scale so `rounded-lg` on web and `radii.lg`
 * on mobile mean the same thing.
 */
export const radii = {
  md: 4,
  lg: 6,
  xl: 8,
  '2xl': 10,
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
 * Type scale, in px. `lineHeight: null` means 1 (used by display sizes, where a
 * ratio reads better than a fixed leading).
 *
 * Names match the Tailwind scale, so `text-sm` in a component and `sm` here are
 * the same thing and the ~850 existing usages need no edit when this changes.
 */
export const typeScale = {
  xs: { size: 12, lineHeight: 16 },
  sm: { size: 14, lineHeight: 20 },
  base: { size: 16, lineHeight: 24 },
  lg: { size: 18, lineHeight: 28 },
  xl: { size: 20, lineHeight: 28 },
  '2xl': { size: 24, lineHeight: 32 },
  '3xl': { size: 30, lineHeight: 36 },
  '4xl': { size: 36, lineHeight: 40 },
  '5xl': { size: 48, lineHeight: null },
  '6xl': { size: 60, lineHeight: null },
} as const;

/**
 * Elevation. Deliberately neutral black rather than a tinted shadow: the app
 * sits on a near-black canvas where a coloured shadow reads as a glow. Glows are
 * done explicitly (see the accent ring on RaceScoreCard), not via this scale.
 */
export const elevation = {
  sm: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
  md: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
  lg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
  xl: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
  '2xl': '0 25px 50px -12px rgb(0 0 0 / 0.25)',
} as const;

export type Colors = typeof colors;
export type Radii = typeof radii;
export type TypeScale = typeof typeScale;
export type Elevation = typeof elevation;
