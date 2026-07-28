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

export type Colors = typeof colors;
export type Radii = typeof radii;
