import type { PropsWithChildren } from 'react';

/**
 * Tommo's colours, sampled from his own form, not ours.
 *
 * This page is the one place in the app that deliberately ignores Timing Sheet
 * Minimal. It is built to sit on his site under his branding, and a dark
 * chartreuse-accented page would read as our product wearing his name. The
 * palette below is lifted pixel-for-pixel from the Google Form it replaces:
 * pale pink page, coral banners, crimson submit, near-black ink.
 *
 * Scoped as custom properties on a wrapper so nothing here can reach the rest
 * of the app, and so a second creator would be a second constant rather than a
 * second stylesheet. Do not promote any of these into `tokens.ts`.
 */
const THEME = {
  '--chinwag-page': '#fdeded',
  '--chinwag-card': '#ffffff',
  '--chinwag-coral': '#f78786',
  '--chinwag-rule': '#f48888',
  '--chinwag-cta': '#da3b3b',
  '--chinwag-cta-press': '#c02f2f',
  '--chinwag-ink': '#303030',
  '--chinwag-ink-muted': '#6d6060',
  '--chinwag-border': '#dadada',
} as React.CSSProperties;

/**
 * `color-scheme: light` is load-bearing: the app runs `<html class="dark">`, so
 * without it the browser paints native select controls dark on a page that is
 * otherwise entirely light.
 */
export function ChinwagShell({ children }: PropsWithChildren) {
  return (
    <div
      className="min-h-screen bg-[var(--chinwag-page)] px-4 py-6 text-[var(--chinwag-ink)] [color-scheme:light]"
      style={THEME}
    >
      {children}
    </div>
  );
}
