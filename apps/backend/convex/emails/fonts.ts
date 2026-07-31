/**
 * Font stacks for transactional email.
 *
 * These used to name Orbitron, pulled in with an `@import` from Google Fonts.
 * Orbitron was deleted from the design system in the reskin, and the `@import`
 * never worked in Gmail or Outlook anyway (both strip it), so most readers were
 * already seeing the fallback. The system fonts here are what actually renders,
 * with Archivo named first for the clients that do honour a webfont link.
 *
 * Web-safe fallbacks are not optional in email: there is no bundler, no
 * self-hosting, and no guarantee any webfont loads at all.
 */
const FALLBACK =
  'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';

export const SANS = `"Archivo", ${FALLBACK}`;

/** Figures, matching the app's use of IBM Plex Mono for all numerals. */
export const MONO =
  '"IBM Plex Mono", ui-monospace, SFMono-Regular, Menlo, Consolas, monospace';
