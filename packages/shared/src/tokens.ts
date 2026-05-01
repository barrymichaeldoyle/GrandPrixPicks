/**
 * Shared design tokens — dark mode palette.
 * Consumed by mobile (React Native) directly, and by web via generated CSS.
 *
 * To update web colors: edit this file, then run `pnpm generate-tokens`.
 * This is done automatically before `dev` and `build`.
 */
export const colors = {
  // Base
  page: '#0f172a',
  surface: '#1e293b',
  surfaceElevated: '#243246',
  surfaceMuted: '#334155',

  // Borders
  border: '#334155',
  borderStrong: '#475569',

  // Text
  text: '#f8fafc',
  textMuted: '#94a3b8',

  // Accent (teal)
  accent: '#14b8a6', // --accent (general use: icons, highlights)
  accentHover: '#2dd4bf', // --accent-hover
  accentMuted: '#134e4a', // --accent-muted (dark bg tint)
  buttonAccent: '#0d9488', // --button-accent (buttons in dark mode — intentionally darker)
  buttonAccentHover: '#0f766e', // --button-accent-hover

  // Semantic
  error: '#f87171',
  success: '#34d399',
  successMuted: '#064e3b',
  warning: '#fbbf24',
  warningMuted: '#78350f',
} as const;

export const radii = {
  md: 10,
  lg: 12,
  xl: 16,
  pill: 999,
} as const;

export type Colors = typeof colors;
export type Radii = typeof radii;
