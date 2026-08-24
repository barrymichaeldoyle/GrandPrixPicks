import { readFileSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { colors, teams } from '@grandprixpicks/shared/tokens';
import { initWasm, Resvg } from '@resvg/resvg-wasm';
import type { ReactNode } from 'react';
import { createElement as e } from 'react';
import satori from 'satori';

import { loadFonts } from '../src/lib/og/fonts';

const picks = [
  { code: 'NOR', flag: 'gb', name: 'Lando Norris', team: 'McLaren', pct: 35.7 },
  {
    code: 'ANT',
    flag: 'it',
    name: 'Kimi Antonelli',
    team: 'Mercedes',
    pct: 28.6,
  },
  {
    code: 'RUS',
    flag: 'gb',
    name: 'George Russell',
    team: 'Mercedes',
    pct: 21.4,
  },
  {
    code: 'LEC',
    flag: 'mc',
    name: 'Charles Leclerc',
    team: 'Ferrari',
    pct: 7.1,
  },
  {
    code: 'VER',
    flag: 'nl',
    name: 'Max Verstappen',
    team: 'Red Bull Racing',
    pct: 7.1,
  },
] as const;

const flags = Object.fromEntries(
  ['gb', 'it', 'mc', 'nl'].map((countryCode) => [
    countryCode,
    `data:image/svg+xml;base64,${readFileSync(
      new URL(`../public/flags/${countryCode}.svg`, import.meta.url),
    ).toString('base64')}`,
  ]),
) as Record<(typeof picks)[number]['flag'], string>;

const outputDir = fileURLToPath(
  new URL(
    '../../../artifacts/social/dutch-gp-community-picks-2026/',
    import.meta.url,
  ),
);
const publicOutputDir = fileURLToPath(
  new URL('../public/social/dutch-gp-community-picks-2026/', import.meta.url),
);

function mark(scale = 1): ReactNode {
  return e(
    'div',
    { style: { display: 'flex', alignItems: 'flex-end', gap: 7 * scale } },
    ...[39, 60, 32].map((height, index) =>
      e('div', {
        key: String(index),
        style: {
          width: 20 * scale,
          height: height * scale,
          backgroundColor: colors.accent,
          transform: 'skew(-12deg)',
        },
      }),
    ),
  );
}

function artwork(width: number, height: number): ReactNode {
  const portrait = height > width;
  const side = portrait ? 66 : 84;
  const maxBar = portrait ? 390 : 820;
  const rowHeight = portrait ? 120 : 88;
  const headingSize = portrait ? 76 : 68;
  const startY = portrait ? 410 : 275;

  return e(
    'div',
    {
      style: {
        display: 'flex',
        position: 'relative',
        width,
        height,
        overflow: 'hidden',
        backgroundColor: colors.page,
        color: colors.text,
        fontFamily: 'Archivo',
      },
    },
    e(
      'div',
      {
        style: {
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          position: 'absolute',
          left: side,
          right: side,
          top: portrait ? 54 : 42,
        },
      },
      e(
        'div',
        {
          style: {
            display: 'flex',
            fontFamily: 'IBM Plex Mono',
            fontWeight: 600,
            fontSize: portrait ? 18 : 17,
            letterSpacing: 3,
            color: colors.textMuted,
          },
        },
        'GRAND PRIX PICKS  /  ',
        e(
          'span',
          { style: { display: 'flex', color: colors.accent } },
          'COMMUNITY CALL',
        ),
      ),
      mark(portrait ? 0.62 : 0.56),
    ),
    e(
      'div',
      {
        style: {
          display: 'flex',
          flexDirection: 'column',
          position: 'absolute',
          left: side,
          right: side,
          top: portrait ? 142 : 115,
        },
      },
      e(
        'div',
        {
          style: {
            display: 'flex',
            alignItems: 'center',
            fontFamily: 'IBM Plex Mono',
            color: colors.text,
            fontWeight: 600,
            fontSize: portrait ? 28 : 25,
          },
        },
        e('img', {
          src: flags.nl,
          width: portrait ? 32 : 28,
          height: portrait ? 24 : 21,
          style: {
            marginRight: 14,
            border: `1px solid ${colors.borderStrong}`,
          },
        }),
        '2026 Dutch Grand Prix',
      ),
      e(
        'div',
        {
          style: {
            display: 'flex',
            maxWidth: portrait ? 900 : 1180,
            marginTop: 14,
            fontSize: headingSize,
            lineHeight: 0.98,
            fontWeight: 600,
            letterSpacing: -3,
          },
        },
        'Who did the community pick to win?',
      ),
      e(
        'div',
        {
          style: {
            display: 'flex',
            marginTop: 16,
            fontSize: portrait ? 26 : 22,
            color: colors.textMuted,
          },
        },
        'Pre-race winner predictions',
      ),
    ),
    e(
      'div',
      {
        style: {
          display: 'flex',
          flexDirection: 'column',
          position: 'absolute',
          left: side,
          right: side,
          top: startY,
          gap: portrait ? 20 : 8,
        },
      },
      ...picks.map((pick, index) => {
        const team = teams[pick.team as keyof typeof teams];
        const teamLabel =
          pick.team === 'Red Bull Racing' ? 'Red Bull' : pick.team;
        const barWidth = Math.max(92, (pick.pct / 40) * maxBar);
        const barHeight = portrait ? 58 : 48;
        const barLean = 12;
        return e(
          'div',
          {
            key: pick.code,
            style: { display: 'flex', alignItems: 'center', height: rowHeight },
          },
          e(
            'div',
            {
              style: {
                display: 'flex',
                flexDirection: 'column',
                width: portrait ? 270 : 300,
              },
            },
            e(
              'div',
              {
                style: {
                  display: 'flex',
                  fontSize: portrait ? 28 : 26,
                  fontWeight: 600,
                },
              },
              pick.name,
            ),
            e(
              'div',
              {
                style: {
                  display: 'flex',
                  alignItems: 'center',
                  marginTop: 5,
                  fontFamily: 'IBM Plex Mono',
                  fontSize: portrait ? 19 : 18,
                  color: colors.textMuted,
                },
              },
              e('img', {
                src: flags[pick.flag],
                width: portrait ? 28 : 24,
                height: portrait ? 21 : 18,
                style: {
                  marginRight: 10,
                  border: `1px solid ${colors.borderStrong}`,
                },
              }),
              `${pick.code} · ${teamLabel.toUpperCase()}`,
            ),
          ),
          e(
            'svg',
            {
              width: barWidth,
              height: barHeight,
              viewBox: `0 0 ${barWidth} ${barHeight}`,
              style: {
                display: 'flex',
                marginLeft: portrait ? 24 : 16,
              },
            },
            e('polygon', {
              points: `0,0 ${barWidth},0 ${barWidth - barLean},${barHeight} 0,${barHeight}`,
              fill: team ?? colors.textMuted,
            }),
            index === 0
              ? e('polygon', {
                  points: `0,0 36,0 ${36 - barLean},${barHeight} 0,${barHeight}`,
                  fill: colors.accent,
                })
              : null,
          ),
          e(
            'div',
            {
              style: {
                display: 'flex',
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'flex-start',
                width: portrait ? 240 : 220,
                height: portrait ? 58 : 48,
                marginLeft: 18,
                color: colors.text,
                fontFamily: 'IBM Plex Mono',
                fontSize: portrait ? 27 : 24,
                fontWeight: 600,
              },
            },
            e('span', { style: { display: 'flex' } }, `${pick.pct}%`),
            index === 0
              ? e(
                  'span',
                  {
                    style: {
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      alignSelf: 'center',
                      marginLeft: 16,
                      padding: portrait ? 10 : 9,
                      backgroundColor: colors.accent,
                      color: colors.page,
                      fontSize: portrait ? 16 : 15,
                      fontWeight: 600,
                      lineHeight: 1,
                      letterSpacing: 0.7,
                      whiteSpace: 'nowrap',
                      flexShrink: 0,
                    },
                  },
                  'RACE WINNER',
                )
              : null,
          ),
        );
      }),
    ),
    e(
      'div',
      {
        style: {
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-start',
          position: 'absolute',
          left: side,
          right: side,
          bottom: portrait ? 62 : 42,
          paddingTop: 22,
          borderTop: `1px solid ${colors.borderStrong}`,
        },
      },
      e(
        'div',
        {
          style: {
            display: 'flex',
            fontSize: portrait ? 24 : 20,
            fontWeight: 600,
          },
        },
        'Make your next picks at ',
        e(
          'span',
          {
            style: {
              display: 'flex',
              marginLeft: 5,
              color: colors.accent,
            },
          },
          'GrandPrixPicks.com',
        ),
      ),
    ),
  );
}

async function render(filename: string, width: number, height: number) {
  const fonts = await loadFonts();
  const svg = await satori(artwork(width, height), { width, height, fonts });
  const png = new Resvg(svg, { fitTo: { mode: 'width', value: width } })
    .render()
    .asPng();
  await writeFile(path.join(outputDir, filename), png);
  await writeFile(path.join(publicOutputDir, filename), png);
}

await mkdir(outputDir, { recursive: true });
await mkdir(publicOutputDir, { recursive: true });
const require = createRequire(import.meta.url);
await initWasm(
  await import('node:fs/promises').then(({ readFile }) =>
    readFile(require.resolve('@resvg/resvg-wasm/index_bg.wasm')),
  ),
);
await render('dutch-gp-community-picks-x.png', 1600, 900);
await render('dutch-gp-community-picks-instagram.png', 1080, 1350);
console.log(`Wrote Dutch GP community-picks artwork to ${outputDir}`);
