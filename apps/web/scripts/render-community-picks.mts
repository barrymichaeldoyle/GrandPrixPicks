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

/**
 * Community P1 picks, as a poster.
 *
 * One fact per card: who the players backed for P1, and who actually took it.
 * Everything that is not a driver code, a percentage or the headline has been
 * left off on purpose — see artifacts/social/<campaign>/campaign.md.
 *
 * To add a round, append a `Campaign` below and run:
 *   npx tsx scripts/render-community-picks.mts        (renders every campaign)
 *   npx tsx scripts/render-community-picks.mts monza  (renders one)
 *
 * Values are raw counts, not percentages: with a community this size the real
 * numbers are more credible than a percentage that implies a bigger sample.
 * No totals, no sub-labels: the bars carry the sample and the accent bar
 * carries the result.
 */

type Pick = {
  code: string;
  team: keyof typeof teams;
  /** How many players put this driver in P1. */
  count: number;
  /** The driver who actually took P1. Marked, wherever they placed. */
  winner?: true;
};

type Card = {
  /** Race-weekend country, as an ISO-3166-1 alpha-2 code in public/flags. */
  flag: string;
  /** Filename segment: <campaign>-<slug>-instagram.png */
  slug: string;
  /** Heading, first part: circuit, year and session. Set in the accent. */
  titleLead: string;
  /** Heading, second part: what is being counted. Set in the text colour. */
  titleRest: string;
  /** One word on the accent block. Sentence case. */
  badge: string;
  picks: readonly Pick[];
};

type Campaign = {
  /** Directory under artifacts/social/ and public/social/. */
  dir: string;
  cards: readonly Card[];
};

const campaigns: readonly Campaign[] = [
  {
    dir: 'monza-community-picks-2026',
    cards: [
      {
        slug: 'race',
        flag: 'it',
        titleLead: 'Monza 2026 Race',
        titleRest: 'P1 Predictions vs Reality',
        badge: 'Won',
        picks: [
          { code: 'RUS', team: 'Mercedes', count: 6 },
          { code: 'LEC', team: 'Ferrari', count: 2 },
          { code: 'HAM', team: 'Ferrari', count: 2 },
          { code: 'ANT', team: 'Mercedes', count: 2, winner: true },
          { code: 'VER', team: 'Red Bull Racing', count: 1 },
          { code: 'NOR', team: 'McLaren', count: 1 },
        ],
      },
      {
        // Not for posting: the session was too far in the past by the time the
        // card existed. Kept as the reference for a zero-count winner, which
        // is the one case the layout has to handle specially. See campaign.md.
        slug: 'qualifying',
        flag: 'it',
        titleLead: 'Monza 2026 Qualifying',
        titleRest: 'P1 Predictions vs Reality',
        badge: 'Pole',
        picks: [
          { code: 'ANT', team: 'Mercedes', count: 4 },
          { code: 'RUS', team: 'Mercedes', count: 3 },
          { code: 'LEC', team: 'Ferrari', count: 2 },
          { code: 'VER', team: 'Red Bull Racing', count: 1 },
          { code: 'GAS', team: 'Alpine', count: 0, winner: true },
        ],
      },
    ],
  },
];

const flags = Object.fromEntries(
  [...new Set(campaigns.flatMap((c) => c.cards.map((card) => card.flag)))].map(
    (countryCode) => [
      countryCode,
      `data:image/svg+xml;base64,${readFileSync(
        new URL(`../public/flags/${countryCode}.svg`, import.meta.url),
      ).toString('base64')}`,
    ],
  ),
) as Record<string, string>;

function artwork(card: Card, width: number, height: number): ReactNode {
  const portrait = height > width;
  const pad = portrait ? 64 : 72;
  const codeCol = portrait ? 200 : 190;
  const valueCol = portrait ? 150 : 130;
  const gap = portrait ? 30 : 28;
  const barHeight = portrait ? 88 : 68;
  const barLean = portrait ? 16 : 13;
  const maxBar = width - pad * 2 - codeCol - gap * 2 - valueCol;
  const top = Math.max(...card.picks.map((pick) => pick.count));

  return e(
    'div',
    {
      style: {
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        width,
        height,
        padding: pad,
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
          flexDirection: 'column',
          // Centred as a block on both formats, with the flag inline on the
          // race line.
          alignItems: 'center',
          textAlign: 'center',
          fontSize: portrait ? 80 : 72,
          lineHeight: 1.08,
          fontWeight: 600,
          letterSpacing: portrait ? -4 : -3,
        },
      },
      e(
        'div',
        {
          style: {
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          },
        },
        e('img', {
          src: flags[card.flag],
          width: portrait ? 92 : 82,
          height: portrait ? 69 : 62,
          style: {
            marginRight: portrait ? 30 : 26,
            border: `1px solid ${colors.borderStrong}`,
          },
        }),
        e(
          'div',
          { style: { display: 'flex', color: colors.accent } },
          card.titleLead,
        ),
      ),
      e(
        'div',
        { style: { display: 'flex', marginTop: portrait ? 16 : 12 } },
        card.titleRest,
      ),
    ),
    e(
      'div',
      {
        style: {
          display: 'flex',
          flexDirection: 'column',
          flexGrow: 1,
          marginTop: portrait ? 48 : 44,
        },
      },
      ...card.picks.map((pick) => {
        // A zero share draws the accent nose alone, so nothing is rounded up
        // into a bar for a driver nobody picked.
        const barWidth =
          pick.count === 0 ? 46 : Math.max(58, (pick.count / top) * maxBar);
        const noseWidth = Math.min(46, barWidth);
        const ink = pick.winner ? colors.accent : colors.text;
        return e(
          'div',
          {
            key: pick.code,
            style: { display: 'flex', alignItems: 'center', flexGrow: 1 },
          },
          e(
            'div',
            {
              style: {
                display: 'flex',
                width: codeCol,
                fontFamily: 'IBM Plex Mono',
                fontWeight: 600,
                fontSize: portrait ? 80 : 72,
                letterSpacing: -3,
                color: ink,
              },
            },
            pick.code,
          ),
          e(
            'svg',
            {
              width: barWidth,
              height: barHeight,
              viewBox: `0 0 ${barWidth} ${barHeight}`,
              style: { display: 'flex' },
            },
            e('polygon', {
              points: `0,0 ${barWidth},0 ${barWidth - barLean},${barHeight} 0,${barHeight}`,
              fill: teams[pick.team],
            }),
            pick.winner
              ? e('polygon', {
                  points: `0,0 ${noseWidth},0 ${noseWidth - barLean},${barHeight} 0,${barHeight}`,
                  fill: colors.accent,
                })
              : null,
          ),
          e(
            'div',
            {
              style: {
                display: 'flex',
                alignItems: 'center',
                marginLeft: gap,
                fontFamily: 'IBM Plex Mono',
                fontWeight: 600,
                fontSize: portrait ? 62 : 52,
                letterSpacing: -2,
                color: ink,
              },
            },
            String(pick.count),
            pick.winner
              ? e(
                  'div',
                  {
                    style: {
                      display: 'flex',
                      marginLeft: gap,
                      paddingTop: portrait ? 12 : 10,
                      paddingBottom: portrait ? 12 : 10,
                      paddingLeft: portrait ? 20 : 16,
                      paddingRight: portrait ? 20 : 16,
                      backgroundColor: colors.accent,
                      color: colors.page,
                      fontSize: portrait ? 40 : 34,
                      lineHeight: 1,
                      letterSpacing: 0,
                    },
                  },
                  card.badge,
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
          // Sits in the corner the shortest bars leave empty, so the rows can
          // use the full height instead of reserving a footer line.
          position: 'absolute',
          right: pad,
          bottom: pad,
          fontSize: portrait ? 38 : 32,
          fontWeight: 600,
          letterSpacing: -1,
          color: colors.accent,
        },
      },
      'GrandPrixPicks.com',
    ),
  );
}

const only = process.argv[2];
const require = createRequire(import.meta.url);
await initWasm(
  await import('node:fs/promises').then(({ readFile }) =>
    readFile(require.resolve('@resvg/resvg-wasm/index_bg.wasm')),
  ),
);
const fonts = await loadFonts();

for (const campaign of campaigns) {
  if (only && !campaign.dir.includes(only)) {continue;}
  const outputDir = fileURLToPath(
    new URL(`../../../artifacts/social/${campaign.dir}/`, import.meta.url),
  );
  const publicOutputDir = fileURLToPath(
    new URL(`../public/social/${campaign.dir}/`, import.meta.url),
  );
  await mkdir(outputDir, { recursive: true });
  await mkdir(publicOutputDir, { recursive: true });

  for (const card of campaign.cards) {
    for (const [suffix, width, height] of [
      ['instagram', 1080, 1350],
      ['x', 1600, 900],
    ] as const) {
      const svg = await satori(artwork(card, width, height), {
        width,
        height,
        fonts,
      });
      const png = new Resvg(svg, { fitTo: { mode: 'width', value: width } })
        .render()
        .asPng();
      const filename = `${campaign.dir.replace(/-\d{4}$/, '')}-${card.slug}-${suffix}.png`;
      await writeFile(path.join(outputDir, filename), png);
      await writeFile(path.join(publicOutputDir, filename), png);
    }
  }
  console.log(`Wrote ${campaign.dir}`);
}
