import { readFile, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

import { colors } from '@grandprixpicks/shared/tokens';
import { initWasm, Resvg } from '@resvg/resvg-wasm';
import { createElement as h } from 'react';
import satori from 'satori';

/**
 * This is TypeScript rather than plain .mjs purely so it can import the design
 * tokens. It used to hand-copy hex values and three of them went stale.
 */
function rgba(hex: string, alpha: number): string {
  const int = Number.parseInt(hex.slice(1), 16);
  return `rgba(${(int >> 16) & 255},${(int >> 8) & 255},${int & 255},${alpha})`;
}

const WIDTH = 1200;
const HEIGHT = 630;
const ARCHIVO_FONT_PATHS = {
  300: fileURLToPath(
    new URL('../public/fonts/archivo-300-latin.ttf', import.meta.url),
  ),
  400: fileURLToPath(
    new URL('../public/fonts/archivo-400-latin.ttf', import.meta.url),
  ),
  600: fileURLToPath(
    new URL('../public/fonts/archivo-600-latin.ttf', import.meta.url),
  ),
  900: fileURLToPath(
    new URL('../public/fonts/archivo-900-latin.ttf', import.meta.url),
  ),
} as const;
async function main() {
  const require = createRequire(import.meta.url);
  const wasmPath = require.resolve('@resvg/resvg-wasm/index_bg.wasm');
  await initWasm(await readFile(wasmPath));

  const [archivoLight, archivoRegular, archivoSemibold, archivoBlack] =
    await Promise.all([
      readFile(ARCHIVO_FONT_PATHS[300]),
      readFile(ARCHIVO_FONT_PATHS[400]),
      readFile(ARCHIVO_FONT_PATHS[600]),
      readFile(ARCHIVO_FONT_PATHS[900]),
    ]);

  // The brand mark: three bars descending like a timing tower, sheared to echo
  // the signature stripe. Was a Lucide flag, which was never the brand.
  const markSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 40" width="60" height="40"><g fill="${colors.accent}" transform="translate(28 20) skewX(-12) translate(-28 -20)"><rect x="7" y="14" width="12" height="24"/><rect x="24" y="2" width="12" height="36"/><rect x="41" y="20" width="12" height="18"/></g></svg>`;
  const markDataUri = `data:image/svg+xml;base64,${Buffer.from(
    markSvg,
  ).toString('base64')}`;

  const element = h(
    'div',
    {
      style: {
        width: `${WIDTH}px`,
        height: `${HEIGHT}px`,
        display: 'flex',
        position: 'relative',
        backgroundColor: colors.page,
        color: colors.text,
        fontFamily: 'Archivo',
      },
    },
    h('div', {
      style: {
        position: 'absolute',
        inset: 0,
        backgroundColor: colors.page,
      },
    }),
    h('div', {
      style: {
        position: 'absolute',
        top: '132px',
        left: '96px',
        width: '3px',
        height: '300px',
        backgroundColor: colors.accent,
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
              borderRadius: '4px',
              backgroundColor: rgba(colors.accent, 0.12),
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            },
          },
          h('img', { src: markDataUri, width: 46, height: 31 }),
        ),
        h(
          'div',
          {
            style: {
              display: 'flex',
              fontFamily: 'Archivo',
              fontSize: '84px',
              fontWeight: 900,
              letterSpacing: '-1.8px',
              lineHeight: 1,
              color: colors.text,
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
            color: colors.textMuted,
            fontSize: '36px',
            lineHeight: 1.18,
            fontWeight: 400,
            marginBottom: '34px',
          },
        },
        h('div', {}, 'The F1 prediction game for'),
        h('div', {}, 'every race weekend.'),
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
            borderRadius: '2px',
            backgroundColor: colors.accent,
            color: colors.textOnAccent,
            fontSize: '30px',
            fontWeight: 600,
            letterSpacing: '0.2px',
            marginBottom: '24px',
          },
        },
        'Make your picks',
      ),
      h(
        'div',
        {
          style: {
            color: colors.accent,
            fontSize: '40px',
            fontWeight: 600,
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
      {
        name: 'Archivo',
        data: archivoLight,
        weight: 300,
        style: 'normal',
      },
      {
        name: 'Archivo',
        data: archivoRegular,
        weight: 400,
        style: 'normal',
      },
      {
        name: 'Archivo',
        data: archivoSemibold,
        weight: 600,
        style: 'normal',
      },
      {
        name: 'Archivo',
        data: archivoBlack,
        weight: 900,
        style: 'normal',
      },
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
