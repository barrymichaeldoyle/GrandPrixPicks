import type { FontStyle, FontWeight } from 'satori';

interface SatoriFont {
  name: string;
  data: ArrayBuffer;
  weight: FontWeight;
  style: FontStyle;
}

let fontsCache: SatoriFont[] | null = null;

// Older Firefox UA triggers Google Fonts to serve a single non-subset woff file.
// Satori's opentype.js only supports woff/ttf — NOT woff2.
const WOFF_USER_AGENT =
  'Mozilla/5.0 (Windows NT 6.1; WOW64; rv:27.0) Gecko/20100101 Firefox/27.0';

async function resolveFontUrlForFamily(
  family: string,
  weight: number,
): Promise<string> {
  const encodedFamily = encodeURIComponent(family);
  const cssUrl = `https://fonts.googleapis.com/css2?family=${encodedFamily}:wght@${weight}`;
  const res = await fetch(cssUrl, {
    headers: { 'User-Agent': WOFF_USER_AGENT },
  });
  if (!res.ok) {
    throw new Error(`Failed to fetch font CSS: ${res.statusText}`);
  }
  const css = await res.text();

  const urlMatch = css.match(/url\(([^)]+)\)/);
  if (!urlMatch?.[1]) {
    throw new Error('Could not extract font URL from CSS');
  }

  return urlMatch[1];
}

/**
 * Archivo for text, IBM Plex Mono for figures — the same pairing the site
 * uses, so a card posted to X reads as the same product as the page it links
 * to. Inter and Orbitron are gone along with the rest of the old identity.
 *
 * Weights stop at 600: Archivo's UI range in this system is 300–600, and
 * nothing on a card should be heavier than a primary button.
 */
export async function loadFonts(): Promise<SatoriFont[]> {
  if (fontsCache) {
    return fontsCache;
  }

  const [lightUrl, regularUrl, semiboldUrl, monoUrl, monoSemiboldUrl] =
    await Promise.all([
      resolveFontUrlForFamily('Archivo', 300),
      resolveFontUrlForFamily('Archivo', 400),
      resolveFontUrlForFamily('Archivo', 600),
      resolveFontUrlForFamily('IBM Plex Mono', 400),
      resolveFontUrlForFamily('IBM Plex Mono', 600),
    ]);

  const [light, regular, semibold, mono, monoSemibold] = await Promise.all([
    fetch(lightUrl).then((r) => r.arrayBuffer()),
    fetch(regularUrl).then((r) => r.arrayBuffer()),
    fetch(semiboldUrl).then((r) => r.arrayBuffer()),
    fetch(monoUrl).then((r) => r.arrayBuffer()),
    fetch(monoSemiboldUrl).then((r) => r.arrayBuffer()),
  ]);

  fontsCache = [
    { name: 'Archivo', data: light, weight: 300, style: 'normal' },
    { name: 'Archivo', data: regular, weight: 400, style: 'normal' },
    { name: 'Archivo', data: semibold, weight: 600, style: 'normal' },
    { name: 'IBM Plex Mono', data: mono, weight: 400, style: 'normal' },
    {
      name: 'IBM Plex Mono',
      data: monoSemibold,
      weight: 600,
      style: 'normal',
    },
  ];

  return fontsCache;
}
