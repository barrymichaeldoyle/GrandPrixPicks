import { readFileSync } from 'node:fs';
import { copyFile, mkdir, readFile, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  colors,
  fallbackTeamColor,
  teams,
} from '@grandprixpicks/shared/tokens';
import { initWasm, Resvg } from '@resvg/resvg-wasm';
import type { ReactNode } from 'react';
import { createElement as e } from 'react';
import satori from 'satori';

import { loadFonts } from '../src/lib/og/fonts';

const WIDTH = 1600;
const HEIGHT = 900;

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, '../../..');
const instagramDir = path.join(
  repoRoot,
  'artifacts/social/instagram-launch-2026/images',
);
const h2hDir = path.join(
  repoRoot,
  'artifacts/social/summer-break-team-mate-h2h-2026',
);
const outputDir = path.join(
  repoRoot,
  'artifacts/social/reddit-launch-2026/images',
);
const previewDir = path.join(outputDir, 'previews');

type DriverSummary = {
  code: string;
  displayName: string;
  nationality: string | null;
  number: number | null;
  total: number;
};

type TeamSummary = {
  team: string;
  drivers: [DriverSummary, DriverSummary];
};

type Snapshot = {
  season: number;
  throughRace: { name: string; round: number };
  teams: TeamSummary[];
};

type Gallery = {
  directory: string;
  files: Array<{ source: string; destination: string }>;
};

const galleries: Gallery[] = [
  {
    directory: '01-start-here',
    files: [
      {
        source: '01-what-is/01-cover.png',
        destination: '01-cover.png',
      },
      {
        source: '01-what-is/02-two-calls.png',
        destination: '02-two-calls.png',
      },
      {
        source: '01-what-is/03-two-tables.png',
        destination: '03-two-tables.png',
      },
    ],
  },
  {
    directory: '02-how-scoring-works',
    files: [
      {
        source: '02-how-scoring-works/01-cover.png',
        destination: '01-cover.png',
      },
      {
        source: '02-how-scoring-works/02-exact-position.png',
        destination: '02-exact-position.png',
      },
      {
        source: '02-how-scoring-works/03-one-position-away.png',
        destination: '03-one-position-away.png',
      },
      {
        source: '02-how-scoring-works/04-in-the-top-5.png',
        destination: '04-in-the-top-5.png',
      },
      {
        source: '02-how-scoring-works/05-team-mate-call.png',
        destination: '05-team-mate-call.png',
      },
    ],
  },
  {
    directory: '03-global-private',
    files: [
      {
        source: '03-global-private/01-cover.png',
        destination: '01-cover.png',
      },
      {
        source: '03-global-private/02-global-leaderboard.png',
        destination: '02-global-leaderboard.png',
      },
      {
        source: '03-global-private/03-private-leagues.png',
        destination: '03-private-leagues.png',
      },
      {
        source: '03-global-private/04-one-set-of-picks.png',
        destination: '04-one-set-of-picks.png',
      },
    ],
  },
];

const h2hFiles = [
  '01-ferrari.png',
  '02-red-bull-racing.png',
  '03-audi.png',
  '04-mclaren.png',
  '05-mercedes.png',
  '06-williams.png',
  '07-cadillac.png',
  '08-haas.png',
  '09-racing-bulls.png',
  '10-aston-martin.png',
  '11-alpine.png',
];

function frame(...children: ReactNode[]): ReactNode {
  return e(
    'div',
    {
      style: {
        display: 'flex',
        position: 'relative',
        width: WIDTH,
        height: HEIGHT,
        overflow: 'hidden',
        backgroundColor: colors.page,
        color: colors.text,
        fontFamily: 'Archivo',
      },
    },
    ...children,
  );
}

function mark(scale = 1): ReactNode {
  return e(
    'div',
    {
      style: {
        display: 'flex',
        alignItems: 'flex-end',
        gap: 7 * scale,
        width: 82 * scale,
        height: 64 * scale,
      },
    },
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

function flagSource(nationality: string | null): string | null {
  if (!nationality) return null;
  const flagPath = path.join(
    repoRoot,
    'apps/web/public/flags',
    `${nationality.toLowerCase()}.svg`,
  );
  try {
    return `data:image/svg+xml;base64,${readFileSync(flagPath).toString('base64')}`;
  } catch {
    return null;
  }
}

function driverCell(driver: DriverSummary, isLeader: boolean): ReactNode {
  const source = flagSource(driver.nationality);
  return e(
    'div',
    {
      style: {
        display: 'flex',
        alignItems: 'center',
        flex: 1,
        minWidth: 0,
      },
    },
    source
      ? e('img', {
          src: source,
          width: 25,
          height: 17,
          style: {
            objectFit: 'cover',
            border: `1px solid ${colors.borderStrong}`,
          },
        })
      : '',
    e(
      'div',
      {
        style: {
          display: 'flex',
          marginLeft: 9,
          fontFamily: 'IBM Plex Mono',
          fontSize: 12,
          color: colors.textMuted,
        },
      },
      `#${driver.number ?? '?'} ${driver.code}`,
    ),
    e(
      'div',
      {
        style: {
          display: 'flex',
          marginLeft: 'auto',
          fontFamily: 'IBM Plex Mono',
          fontSize: 24,
          fontWeight: 600,
          color: isLeader ? colors.accent : colors.text,
        },
      },
      driver.total,
    ),
  );
}

function teamSummaryCard(summary: TeamSummary): ReactNode {
  const [left, right] = summary.drivers;
  const colour = teams[summary.team as keyof typeof teams] ?? fallbackTeamColor;
  return e(
    'div',
    {
      style: {
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        width: 408,
        height: 86,
        padding: '14px 16px 13px 20px',
        border: `1px solid ${colors.borderStrong}`,
        backgroundColor: colors.surface,
      },
    },
    e('div', {
      style: {
        position: 'absolute',
        left: 0,
        top: 0,
        bottom: 0,
        width: 5,
        backgroundColor: colour,
      },
    }),
    e(
      'div',
      {
        style: {
          display: 'flex',
          fontFamily: 'IBM Plex Mono',
          fontSize: 11,
          fontWeight: 600,
          letterSpacing: 1.5,
          color: colors.textMuted,
          textTransform: 'uppercase',
        },
      },
      summary.team,
    ),
    e(
      'div',
      {
        style: {
          display: 'flex',
          alignItems: 'center',
          width: '100%',
          marginTop: 8,
        },
      },
      driverCell(left, left.total >= right.total),
      e(
        'div',
        {
          style: {
            display: 'flex',
            justifyContent: 'center',
            width: 38,
            fontFamily: 'IBM Plex Mono',
            fontSize: 12,
            color: colors.textDisabled,
          },
        },
        ':',
      ),
      driverCell(right, right.total >= left.total),
    ),
  );
}

function h2hCover(snapshot: Snapshot): ReactNode {
  return frame(
    e(
      'div',
      {
        style: {
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          position: 'absolute',
          left: 72,
          right: 72,
          top: 46,
          height: 52,
        },
      },
      e(
        'div',
        {
          style: {
            display: 'flex',
            fontFamily: 'IBM Plex Mono',
            fontSize: 16,
            fontWeight: 600,
            letterSpacing: 2.8,
            color: colors.textMuted,
          },
        },
        'GRAND PRIX PICKS',
      ),
      mark(0.55),
    ),
    e(
      'div',
      {
        style: {
          display: 'flex',
          flexDirection: 'column',
          position: 'absolute',
          left: 72,
          top: 190,
          width: 505,
        },
      },
      e(
        'div',
        {
          style: {
            display: 'flex',
            fontFamily: 'IBM Plex Mono',
            fontSize: 17,
            fontWeight: 600,
            letterSpacing: 3,
            color: colors.textMuted,
          },
        },
        `${snapshot.season} SUMMER BREAK`,
      ),
      e(
        'div',
        {
          style: {
            display: 'flex',
            flexDirection: 'column',
            marginTop: 25,
            fontSize: 75,
            fontWeight: 300,
            letterSpacing: -2.2,
            lineHeight: 1.03,
          },
        },
        e('div', { style: { display: 'flex' } }, 'Every'),
        e('div', { style: { display: 'flex' } }, 'team-mate'),
        e(
          'div',
          { style: { display: 'flex', color: colors.accent } },
          'battle.',
        ),
      ),
      e(
        'div',
        {
          style: {
            display: 'flex',
            width: 455,
            marginTop: 30,
            fontSize: 23,
            lineHeight: 1.45,
            color: colors.textMuted,
          },
        },
        `Races, qualifying, sprints and sprint qualifying through the ${snapshot.throughRace.name}.`,
      ),
      e(
        'div',
        {
          style: {
            display: 'flex',
            marginTop: 38,
            fontFamily: 'IBM Plex Mono',
            fontSize: 14,
            fontWeight: 600,
            letterSpacing: 1.7,
            color: colors.accent,
          },
        },
        '11 TEAMS  /  ONE SCORECARD',
      ),
    ),
    e(
      'div',
      {
        style: {
          display: 'flex',
          flexWrap: 'wrap',
          position: 'absolute',
          left: 650,
          right: 72,
          top: 150,
          gap: 12,
        },
      },
      ...snapshot.teams.map((summary) => teamSummaryCard(summary)),
    ),
    e(
      'div',
      {
        style: {
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          position: 'absolute',
          left: 72,
          right: 72,
          bottom: 38,
          paddingTop: 18,
          borderTop: `1px solid ${colors.borderStrong}`,
          fontFamily: 'IBM Plex Mono',
          fontSize: 14,
          letterSpacing: 1.7,
          color: colors.textMuted,
        },
      },
      e(
        'div',
        { style: { display: 'flex' } },
        'FULL BREAKDOWN  /  SWIPE THROUGH',
      ),
      e(
        'div',
        { style: { display: 'flex', color: colors.accent } },
        'GrandPrixPicks.com/reddit',
      ),
    ),
  );
}

async function renderPng(
  artwork: ReactNode,
  width: number,
  height: number,
  outputPath: string,
): Promise<void> {
  const svg = await satori(artwork, {
    width,
    height,
    fonts: await loadFonts(),
  });
  const png = new Resvg(svg, { fitTo: { mode: 'width', value: width } })
    .render()
    .asPng();
  await writeFile(outputPath, png);
}

async function contactSheet(
  title: string,
  files: string[],
  outputPath: string,
  aspect: 'portrait' | 'landscape',
): Promise<void> {
  const columns = 3;
  const thumbWidth = aspect === 'portrait' ? 270 : 336;
  const thumbHeight = aspect === 'portrait' ? 338 : 189;
  const cellHeight = thumbHeight + 46;
  const rows = Math.ceil(files.length / columns);
  const width = 1120;
  const height = 112 + rows * cellHeight + 40;
  const images = await Promise.all(
    files.map(async (file) => ({
      file,
      source: `data:image/png;base64,${(await readFile(file)).toString('base64')}`,
    })),
  );
  const artwork = e(
    'div',
    {
      style: {
        display: 'flex',
        flexDirection: 'column',
        width,
        height,
        padding: '36px 44px',
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
          fontFamily: 'IBM Plex Mono',
          fontSize: 18,
          fontWeight: 600,
          letterSpacing: 2.2,
          color: colors.textMuted,
        },
      },
      title,
    ),
    e(
      'div',
      {
        style: {
          display: 'flex',
          flexWrap: 'wrap',
          gap: '24px 28px',
          marginTop: 28,
        },
      },
      ...images.map(({ file, source }, index) =>
        e(
          'div',
          {
            key: file,
            style: {
              display: 'flex',
              flexDirection: 'column',
              width: thumbWidth,
            },
          },
          e('img', {
            src: source,
            width: thumbWidth,
            height: thumbHeight,
            style: {
              objectFit: 'cover',
              border: `1px solid ${colors.borderStrong}`,
            },
          }),
          e(
            'div',
            {
              style: {
                display: 'flex',
                marginTop: 10,
                fontFamily: 'IBM Plex Mono',
                fontSize: 12,
                color: colors.textMuted,
              },
            },
            `${String(index + 1).padStart(2, '0')}  ${path.basename(file)}`,
          ),
        ),
      ),
    ),
  );
  await renderPng(artwork, width, height, outputPath);
}

async function main(): Promise<void> {
  const require = createRequire(import.meta.url);
  await initWasm(
    await readFile(require.resolve('@resvg/resvg-wasm/index_bg.wasm')),
  );
  await mkdir(previewDir, { recursive: true });

  for (const gallery of galleries) {
    const galleryDir = path.join(outputDir, gallery.directory);
    await mkdir(galleryDir, { recursive: true });
    for (const file of gallery.files) {
      await copyFile(
        path.join(instagramDir, file.source),
        path.join(galleryDir, file.destination),
      );
    }
    await contactSheet(
      gallery.directory.replaceAll('-', ' ').toUpperCase(),
      gallery.files.map((file) => path.join(galleryDir, file.destination)),
      path.join(previewDir, `${gallery.directory}.png`),
      'portrait',
    );
  }

  const snapshot = JSON.parse(
    await readFile(path.join(h2hDir, 'source.json'), 'utf8'),
  ) as Snapshot;
  const h2hOutputDir = path.join(outputDir, '04-summer-break-h2h');
  await mkdir(h2hOutputDir, { recursive: true });
  await renderPng(
    h2hCover(snapshot),
    WIDTH,
    HEIGHT,
    path.join(h2hOutputDir, '01-cover.png'),
  );
  for (const [index, filename] of h2hFiles.entries()) {
    await copyFile(
      path.join(h2hDir, 'images', filename),
      path.join(
        h2hOutputDir,
        `${String(index + 2).padStart(2, '0')}-${filename.replace(/^\d+-/, '')}`,
      ),
    );
  }
  const h2hGalleryFiles = [
    path.join(h2hOutputDir, '01-cover.png'),
    ...(await Promise.all(
      h2hFiles.map(async (filename, index) =>
        path.join(
          h2hOutputDir,
          `${String(index + 2).padStart(2, '0')}-${filename.replace(/^\d+-/, '')}`,
        ),
      ),
    )),
  ];
  await contactSheet(
    '2026 SUMMER BREAK H2H',
    h2hGalleryFiles,
    path.join(previewDir, '04-summer-break-h2h.png'),
    'landscape',
  );

  console.log(`Wrote Reddit launch galleries to ${outputDir}`);
}

await main();
