import type { FontStyle, FontWeight } from 'satori';

interface SatoriFont {
  name: string;
  data: ArrayBuffer;
  weight: FontWeight;
  style: FontStyle;
}

let fontsCache: Array<SatoriFont> | null = null;

// Older Firefox UA triggers Google Fonts to serve a single non-subset woff file.
// Satori's opentype.js only supports woff/ttf — NOT woff2.
const WOFF_USER_AGENT =
  'Mozilla/5.0 (Windows NT 6.1; WOW64; rv:27.0) Gecko/20100101 Firefox/27.0';

async function resolveFontUrl(weight: number): Promise<string> {
  const cssUrl = `https://fonts.googleapis.com/css2?family=Inter:wght@${weight}`;
  const res = await fetch(cssUrl, {
    headers: { 'User-Agent': WOFF_USER_AGENT },
  });
  if (!res.ok) throw new Error(`Failed to fetch font CSS: ${res.statusText}`);
  const css = await res.text();

  const urlMatch = css.match(/url\(([^)]+)\)/);
  if (!urlMatch?.[1]) throw new Error('Could not extract font URL from CSS');

  return urlMatch[1];
}

export async function loadFonts(): Promise<Array<SatoriFont>> {
  if (fontsCache) return fontsCache;

  const [regularUrl, boldUrl] = await Promise.all([
    resolveFontUrl(400),
    resolveFontUrl(700),
  ]);

  const [regular, bold] = await Promise.all([
    fetch(regularUrl).then((r) => r.arrayBuffer()),
    fetch(boldUrl).then((r) => r.arrayBuffer()),
  ]);

  fontsCache = [
    { name: 'Inter', data: regular, weight: 400, style: 'normal' },
    { name: 'Inter', data: bold, weight: 700, style: 'normal' },
  ];

  return fontsCache;
}
