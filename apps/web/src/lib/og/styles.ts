const OG_WIDTH = 1200;
const OG_HEIGHT = 630;

/** 16:9 aspect ratio (e.g. for TanStack Showcase, video thumbnails). */
const OG_WIDTH_16_9 = 1280;
const OG_HEIGHT_16_9 = 720;

export type OgImageSize = 'og' | '16:9';

export function getOgDimensions(size: OgImageSize): {
  width: number;
  height: number;
} {
  return size === '16:9'
    ? { width: OG_WIDTH_16_9, height: OG_HEIGHT_16_9 }
    : { width: OG_WIDTH, height: OG_HEIGHT };
}

// Dark-mode palette — matches .dark / [data-theme='dark'] in styles.css
export const colors = {
  bg: '#0f172a',
  surface: '#1e293b',
  accent: '#14b8a6',
  accentHover: '#2dd4bf',
  buttonAccent: '#0d9488',
  accentMuted: '#134e4a',
  text: '#f8fafc',
  textMuted: '#94a3b8',
  border: '#334155',
  gold: '#fbbf24',
  silver: '#9ca3af',
  bronze: '#d97706',
  // Race status (semantic, matches app)
  statusUpcoming: '#22c55e',
  statusLocked: '#eab308',
};
