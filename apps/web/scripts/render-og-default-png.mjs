import { access, readFile, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';

import { initWasm, Resvg } from '@resvg/resvg-wasm';
import { createElement as h } from 'react';
import satori from 'satori';

const WIDTH = 1200;
const HEIGHT = 630;
const FONT_USER_AGENT =
  'Mozilla/5.0 (Windows NT 6.1; WOW64; rv:27.0) Gecko/20100101 Firefox/27.0';
const LOCAL_SANS_FONT_CANDIDATES = [
  process.env.OG_FONT_PATH,
  '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',
  '/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf',
  '/usr/share/fonts/truetype/liberation2/LiberationSans-Regular.ttf',
  '/System/Library/Fonts/Supplemental/Arial.ttf',
  '/System/Library/Fonts/Supplemental/Helvetica.ttf',
].filter(Boolean);

async function resolveGoogleFontUrl(family, weight) {
  const encodedFamily = encodeURIComponent(family);
  const cssUrl = `https://fonts.googleapis.com/css2?family=${encodedFamily}:wght@${weight}`;
  const res = await fetch(cssUrl, {
    headers: { 'User-Agent': FONT_USER_AGENT },
  });
  if (!res.ok) {
    throw new Error(`Failed to fetch ${family} CSS: ${res.status}`);
  }
  const css = await res.text();
  const urlMatch = css.match(/url\(([^)]+)\)\s+format\('(woff2|woff)'\)/);
  if (!urlMatch?.[1]) {
    throw new Error(`Could not extract ${family} font URL`);
  }
  return urlMatch[1].replace(/^["']|["']$/g, '');
}

async function loadGoogleFont(family, weight) {
  const fontUrl = await resolveGoogleFontUrl(family, weight);
  const fontRes = await fetch(fontUrl);
  if (!fontRes.ok) {
    throw new Error(`Failed to fetch ${family} font: ${fontRes.status}`);
  }
  return Buffer.from(await fontRes.arrayBuffer());
}

async function loadOrbitronBold() {
  try {
    return await loadGoogleFont('Orbitron', 700);
  } catch (err) {
    console.warn(
      'Orbitron could not be loaded for OG generation, falling back to base sans font.',
      err instanceof Error ? err.message : err,
    );
    return null;
  }
}

async function findLocalSansFontPath() {
  for (const candidate of LOCAL_SANS_FONT_CANDIDATES) {
    try {
      await access(candidate);
      return candidate;
    } catch {}
  }
  return null;
}

async function main() {
  const require = createRequire(import.meta.url);
  const wasmPath = require.resolve('@resvg/resvg-wasm/index_bg.wasm');
  await initWasm(await readFile(wasmPath));

  const sansPath = await findLocalSansFontPath();
  if (!sansPath) {
    throw new Error(
      'Could not find a local sans font. Set OG_FONT_PATH to a .ttf/.otf/.woff font file.',
    );
  }
  const sans = await readFile(sansPath);
  const orbitronBold = await loadOrbitronBold();
  const titleFontFamily = orbitronBold ? 'Orbitron' : 'Sans';
  if (!orbitronBold) {
    console.warn(
      'Using base sans font for title because Orbitron download was unavailable.',
    );
  }

  const flagGlyphSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M4 22V4a1 1 0 0 1 .4-.8A6 6 0 0 1 8 2c3 0 5 2 7.333 2q2 0 3.067-.8A1 1 0 0 1 20 4v10a1 1 0 0 1-.4.8A6 6 0 0 1 16 16c-3 0-5-2-8-2a6 6 0 0 0-4 1.528" fill="none" stroke="#2dd4bf" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
  const flagGlyphDataUri = `data:image/svg+xml;base64,${Buffer.from(
    flagGlyphSvg,
  ).toString('base64')}`;

  const element = h(
    'div',
    {
      style: {
        width: `${WIDTH}px`,
        height: `${HEIGHT}px`,
        display: 'flex',
        position: 'relative',
        backgroundColor: '#0f172a',
        color: '#f8fafc',
        fontFamily: 'Sans',
      },
    },
    h('div', {
      style: {
        position: 'absolute',
        inset: 0,
        background:
          'radial-gradient(ellipse 520px 300px at 50% -20px, rgba(20,184,166,0.2), transparent 70%), radial-gradient(ellipse 260px 240px at 88% 36%, rgba(20,184,166,0.12), transparent 75%), radial-gradient(ellipse 220px 180px at 13% 42%, rgba(251,191,36,0.09), transparent 80%)',
      },
    }),
    h('div', {
      style: {
        position: 'absolute',
        top: '48px',
        left: '120px',
        width: '960px',
        height: '6px',
        borderRadius: '3px',
        background: 'linear-gradient(90deg, #0d9488 0%, #2dd4bf 100%)',
      },
    }),
    h(
      'div',
      {
        style: {
          display: 'flex',
          flexDirection: 'column',
          marginLeft: '136px',
          marginTop: '132px',
          width: '900px',
        },
      },
      h(
        'div',
        {
          style: {
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            marginBottom: '20px',
          },
        },
        h(
          'div',
          {
            style: {
              width: '76px',
              height: '76px',
              borderRadius: '38px',
              backgroundColor: 'rgba(20,184,166,0.14)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            },
          },
          h('img', { src: flagGlyphDataUri, width: 50, height: 50 }),
        ),
        h(
          'div',
          {
            style: {
              display: 'flex',
              fontFamily: titleFontFamily,
              fontSize: '84px',
              fontWeight: 900,
              letterSpacing: '-1.8px',
              lineHeight: 1,
              color: '#f8fafc',
            },
          },
          'Grand Prix Picks',
        ),
      ),
      h(
        'div',
        {
          style: {
            display: 'flex',
            flexDirection: 'column',
            maxWidth: '760px',
            color: '#9fb0c8',
            fontSize: '36px',
            lineHeight: 1.18,
            fontWeight: 500,
            marginBottom: '34px',
          },
        },
        h('div', {}, 'Top-5 picks. Teammate H2H battles.'),
        h('div', {}, 'Every race weekend.'),
      ),
      h(
        'div',
        {
          style: {
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '260px',
            height: '64px',
            borderRadius: '14px',
            backgroundColor: '#0d9488',
            color: '#ffffff',
            fontSize: '30px',
            fontWeight: 900,
            letterSpacing: '0.2px',
            marginBottom: '24px',
          },
        },
        'Play free',
      ),
      h(
        'div',
        {
          style: {
            color: '#2dd4bf',
            fontSize: '40px',
            fontWeight: 800,
            letterSpacing: '-0.4px',
          },
        },
        'grandprixpicks.com',
      ),
    ),
  );

  const svg = await satori(element, {
    width: WIDTH,
    height: HEIGHT,
    fonts: [
      { name: 'Sans', data: sans, weight: 400, style: 'normal' },
      { name: 'Sans', data: sans, weight: 700, style: 'normal' },
      { name: 'Sans', data: sans, weight: 900, style: 'normal' },
      ...(orbitronBold
        ? [
            {
              name: 'Orbitron',
              data: orbitronBold,
              weight: 700,
              style: 'normal',
            },
          ]
        : []),
    ],
  });

  const png = new Resvg(svg, { fitTo: { mode: 'width', value: WIDTH } })
    .render()
    .asPng();
  await writeFile('public/og-default.png', png);
  console.log('Wrote public/og-default.png');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
