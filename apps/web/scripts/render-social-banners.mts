import { readFile, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';

import { colors } from '@grandprixpicks/shared/tokens';
import { initWasm, Resvg } from '@resvg/resvg-wasm';
import type { ReactNode } from 'react';
import { createElement as e } from 'react';
import satori from 'satori';

import { loadFonts } from '../src/lib/og/fonts';
import { colors as ogColors } from '../src/lib/og/styles';

/**
 * Renders the @GrandPrixPicks and r/GPPicks profile art into `public/social/`.
 *
 * On demand rather than at build time: unlike `og-default.png`, nothing serves
 * these to a crawler. They are uploaded to X and Reddit by hand, so building
 * them every time would churn several large PNGs in git without changing
 * anything anybody sees. Run it when the copy or the palette changes:
 *
 *   pnpm --filter @grandprixpicks/web render-x-banner
 *   pnpm --filter @grandprixpicks/web render-reddit-banners
 *
 * Fonts come from `src/lib/og/fonts.ts`, the same loader the share cards use,
 * so the banners cannot drift onto a different typeface from the OG images.
 */

/*
 * X's three layout traps, all of which the previous banner ignored.
 *
 * 1. The avatar overlaps the lower left. It renders about 200x200 at desktop
 *    sizes and hangs below the banner's bottom edge, so the bottom-left corner
 *    is not usable space, it is a hole.
 * 2. The top and bottom bands crop by different amounts depending on viewport
 *    and whether the profile is seen in-app or on web. Anything within ~50px of
 *    a horizontal edge is not guaranteed to survive.
 * 3. The left and right edges crop on narrow mobile viewports.
 *
 * Reddit uses three different shapes here: a 1000x300 user-profile cover and
 * separate 1072x128 desktop / 1080x128 mobile community strips. Each gets its
 * own composition. The community assets render at 2x those minimum dimensions
 * so small mono type stays crisp after Reddit resamples the upload.
 */
const X_AVATAR_COLUMN = 340;

/** The shared two-line lockup; only the final phrase gets the brand accent. */
function brandHeadline(fontSize: number, align: 'left' | 'center'): ReactNode {
  const cross = align === 'center' ? 'center' : 'flex-start';
  return e(
    'div',
    {
      style: {
        display: 'flex',
        flexDirection: 'column' as const,
        alignItems: cross,
        fontSize,
        fontWeight: 300,
        letterSpacing: -fontSize / 48,
        lineHeight: 1.08,
        color: colors.text,
      },
    },
    e('div', {}, "Everyone's a strategist"),
    e(
      'div',
      { style: { display: 'flex' } },
      e('div', {}, 'on Sunday.\u00a0'),
      e('div', { style: { color: colors.accent } }, 'Prove it.'),
    ),
  );
}

function redditLabel(text: string, fontSize: number): ReactNode {
  return e(
    'div',
    {
      style: {
        display: 'flex',
        fontFamily: 'IBM Plex Mono',
        fontSize,
        fontWeight: 500,
        letterSpacing: fontSize * 0.08,
        color: colors.textMuted,
      },
    },
    text,
  );
}

/** `.com`, not the `.app` the brief quoted. See `siteConfig.url`. */
function domainLine(fontSize: number): ReactNode {
  return e(
    'div',
    {
      style: {
        display: 'flex',
        fontSize,
        fontFamily: 'IBM Plex Mono',
        color: colors.textMuted,
      },
    },
    'GrandPrixPicks.com',
  );
}

function frame(
  width: number,
  height: number,
  ...children: ReactNode[]
): ReactNode {
  return e(
    'div',
    {
      style: {
        display: 'flex',
        position: 'relative' as const,
        width,
        height,
        // Flat. The brief asked for "the same subtle texture as the OG image";
        // there isn't one. Rule 2 of the system is that backgrounds are flat
        // colour, and the OG cards render on plain `page`.
        backgroundColor: colors.page,
        fontFamily: 'Archivo',
        color: colors.text,
        overflow: 'hidden' as const,
      },
    },
    ...children,
  );
}

/**
 * X header, set on the accent like the site's brand card.
 *
 * The banner that was live was a generated illustration (car, speed streaks,
 * chequered flag, grunge) that read as AI art. Before that, a dark ground with
 * a retired headline and five empty slots, which read as an unfinished form.
 *
 * This one shows what the account posts instead of describing it: the pitch
 * in ink on the left, and on the right two cards in the feed's own editorial
 * language, a news card and a card for the two games. Both are drawn at banner
 * scale rather than scaled from the 1200x630 OG renders, which would leave
 * 10px type.
 *
 * No wordmark: X prints the account name directly under the avatar. No
 * domain: the bio carries it one line down.
 */
const X_INK = colors.textOnAccent;
const X_EDGE_SAFE = 96;

function miniTag(text: string): ReactNode {
  return e(
    'div',
    {
      style: {
        display: 'flex',
        alignSelf: 'flex-start',
        backgroundColor: colors.accent,
        borderRadius: 2,
        padding: '4px 11px',
        transform: 'skewX(-12deg)',
      },
    },
    e(
      'div',
      {
        style: {
          display: 'flex',
          fontSize: 14,
          fontWeight: 600,
          color: colors.textOnAccent,
          transform: 'skewX(12deg)',
        },
      },
      text,
    ),
  );
}

function miniMeta(text: string): ReactNode {
  return e(
    'div',
    {
      style: {
        display: 'flex',
        fontFamily: 'IBM Plex Mono',
        fontSize: 14,
        color: colors.textMuted,
      },
    },
    text,
  );
}

function miniCard(
  left: number,
  top: number,
  width: number,
  ...children: ReactNode[]
): ReactNode {
  return e(
    'div',
    {
      style: {
        display: 'flex',
        flexDirection: 'column' as const,
        position: 'absolute' as const,
        left,
        top,
        width,
        padding: '20px 22px 22px',
        backgroundColor: colors.page,
        border: `1px solid ${colors.borderStrong}`,
        borderRadius: 4,
        color: colors.text,
      },
    },
    ...children,
  );
}

/**
 * Timeless by request: no dated headline, no round number, no driver codes
 * that go stale when a seat changes. The news card names the kinds of story
 * the account posts; the picks card shows how a Top 5 scores, in the
 * how-to-play page's own words. Both are true every weekend of every season.
 */
function newsCard(left: number, top: number, width: number): ReactNode {
  return miniCard(
    left,
    top,
    width,
    e(
      'div',
      {
        style: {
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        },
      },
      miniMeta('Every race weekend'),
      miniTag('News'),
    ),
    e(
      'div',
      {
        style: {
          display: 'flex',
          marginTop: 16,
          fontSize: 25,
          fontWeight: 600,
          letterSpacing: -0.5,
          lineHeight: 1.15,
        },
      },
      'Driver moves, penalties and the form guide',
    ),
  );
}

const SCORING_ROWS = [
  { label: 'Exact position', pts: '+5', tone: 'exact' },
  { label: 'One place out', pts: '+3', tone: 'near' },
  { label: 'In the Top 5', pts: '+1', tone: 'top5' },
] as const;

const TONE = {
  exact: ogColors.resultExact,
  near: ogColors.resultNear,
  top5: ogColors.resultTop5,
} as const;

function duelChip(label: string): ReactNode {
  return e(
    'div',
    {
      style: {
        display: 'flex',
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        height: 36,
        borderRadius: 2,
        backgroundColor: colors.surface,
        border: `1px solid ${colors.border}`,
        fontSize: 19,
        fontWeight: 600,
        letterSpacing: 1,
      },
    },
    label,
  );
}

/**
 * Both games, one card: the Top 5 scoring rules and the team-mate duel. The
 * duel is the "driver A vs driver B" shape Barry asked for, with the letters
 * standing in for names so the banner never dates.
 */
function gamesCard(left: number, top: number, width: number): ReactNode {
  const header = (label: string, value: string): ReactNode =>
    e(
      'div',
      {
        style: {
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        },
      },
      miniMeta(label),
      e(
        'div',
        {
          style: {
            display: 'flex',
            fontFamily: 'IBM Plex Mono',
            fontSize: 18,
            fontWeight: 600,
          },
        },
        value,
      ),
    );
  return miniCard(
    left,
    top,
    width,
    header('Top 5 · every session', 'max 25'),
    e(
      'div',
      {
        style: {
          display: 'flex',
          flexDirection: 'column' as const,
          marginTop: 10,
        },
      },
      ...SCORING_ROWS.map((row) =>
        e(
          'div',
          {
            key: row.label,
            style: {
              display: 'flex',
              alignItems: 'center',
              height: 34,
              borderTop: `1px solid ${colors.border}`,
            },
          },
          e('div', {
            style: {
              width: 3,
              height: 20,
              marginRight: 14,
              backgroundColor: TONE[row.tone],
            },
          }),
          e(
            'div',
            {
              style: {
                display: 'flex',
                flex: 1,
                fontSize: 18,
                fontWeight: 500,
              },
            },
            row.label,
          ),
          e(
            'div',
            {
              style: {
                display: 'flex',
                fontFamily: 'IBM Plex Mono',
                fontSize: 18,
                fontWeight: 600,
                color: TONE[row.tone],
              },
            },
            row.pts,
          ),
        ),
      ),
    ),
    e('div', {
      style: {
        height: 1,
        marginTop: 2,
        marginBottom: 14,
        backgroundColor: colors.borderStrong,
      },
    }),
    header('Team-mate duel', '+1 each'),
    e(
      'div',
      {
        style: {
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          marginTop: 10,
        },
      },
      duelChip('Driver A'),
      e(
        'div',
        {
          style: {
            display: 'flex',
            fontFamily: 'IBM Plex Mono',
            fontSize: 14,
            color: colors.textMuted,
          },
        },
        'vs',
      ),
      duelChip('Driver B'),
    ),
  );
}

function xBanner(width: number, height: number): ReactNode {
  return e(
    'div',
    {
      style: {
        display: 'flex',
        position: 'relative' as const,
        width,
        height,
        backgroundColor: colors.accent,
        fontFamily: 'Archivo',
        color: X_INK,
        overflow: 'hidden' as const,
      },
    },
    e(
      'div',
      {
        style: {
          display: 'flex',
          flexDirection: 'column' as const,
          position: 'absolute' as const,
          left: X_AVATAR_COLUMN,
          top: 152,
          fontSize: 60,
          fontWeight: 600,
          letterSpacing: -2.4,
          lineHeight: 1.02,
        },
      },
      // Not the landing headline: the account is news first (see the bio),
      // and the game is the second thing it does.
      e('div', {}, 'F1 news, race previews'),
      e('div', {}, 'and a free Top 5 game.'),
    ),
    // The two cards overlap like posts in a feed. The news card sits behind
    // and above; the games card in front, pulled toward the safe right edge.
    newsCard(1004, 46, 340),
    gamesCard(width - X_EDGE_SAFE - 318, 182, 318),
  );
}

/** One-line version for Reddit's very short community banner slot. */
function compactBrandHeadline(fontSize: number): ReactNode {
  return e(
    'div',
    {
      style: {
        display: 'flex',
        fontSize,
        fontWeight: 300,
        letterSpacing: -fontSize / 48,
        lineHeight: 1.08,
        color: colors.text,
      },
    },
    e('div', {}, "Everyone's a strategist on Sunday.\u00a0"),
    e('div', { style: { color: colors.accent } }, 'Prove it.'),
  );
}

/**
 * User-profile header. The left third stays expendable for Reddit's avatar;
 * the headline occupies the vertical centre that survives mobile cropping.
 */
function redditProfileBanner(): ReactNode {
  const width = 1000;
  const height = 300;
  return frame(
    width,
    height,
    e('div', {
      style: {
        position: 'absolute' as const,
        left: 226,
        top: 52,
        bottom: 52,
        width: 2,
        backgroundColor: colors.accent,
      },
    }),
    e(
      'div',
      {
        style: {
          display: 'flex',
          flexDirection: 'column' as const,
          position: 'absolute' as const,
          left: 252,
          top: 45,
          width: 700,
        },
      },
      redditLabel('u/GrandPrixPicks', 12),
      e(
        'div',
        { style: { display: 'flex', marginTop: 13 } },
        brandHeadline(40, 'left'),
      ),
      e(
        'div',
        {
          style: {
            display: 'flex',
            flexDirection: 'column' as const,
            marginTop: 13,
            fontSize: 15,
            lineHeight: 1.45,
            color: colors.textMuted,
          },
        },
        e('div', {}, 'Free F1 prediction game.'),
        e(
          'div',
          {},
          'Climb the global leaderboard. Compete with friends in private leagues.',
        ),
      ),
      e('div', { style: { display: 'flex', marginTop: 15 } }, domainLine(14)),
    ),
  );
}

/**
 * Community desktop header. It is deliberately typographic: Reddit supplies
 * the icon and community name directly below this strip, so duplicating a logo
 * lockup inside the image would create two competing mastheads.
 */
function redditCommunityDesktopBanner(): ReactNode {
  const width = 2144;
  const height = 256;
  return frame(
    width,
    height,
    e(
      'div',
      {
        style: {
          display: 'flex',
          flexDirection: 'column' as const,
          alignItems: 'center',
          justifyContent: 'center',
          position: 'absolute' as const,
          left: 0,
          top: 0,
          width,
          height,
        },
      },
      redditLabel('r/GPPicks', 18),
      e(
        'div',
        { style: { display: 'flex', marginTop: 14 } },
        compactBrandHeadline(48),
      ),
      e(
        'div',
        {
          style: {
            display: 'flex',
            marginTop: 14,
            fontSize: 18,
            lineHeight: 1.4,
            color: colors.textMuted,
          },
        },
        'Free F1 prediction game. Climb the global leaderboard. Compete with friends in private leagues.',
      ),
      e('div', { style: { display: 'flex', marginTop: 11 } }, domainLine(16)),
    ),
  );
}

/** Mobile gets a quieter lockup with no body copy to become illegible. */
function redditCommunityMobileBanner(): ReactNode {
  const width = 2160;
  const height = 256;
  return frame(
    width,
    height,
    e(
      'div',
      {
        style: {
          display: 'flex',
          flexDirection: 'column' as const,
          alignItems: 'center',
          justifyContent: 'center',
          position: 'absolute' as const,
          left: 0,
          top: 0,
          width,
          height,
        },
      },
      redditLabel('r/GPPicks', 18),
      e(
        'div',
        { style: { display: 'flex', marginTop: 18 } },
        compactBrandHeadline(42),
      ),
      e(
        'div',
        {
          style: {
            display: 'flex',
            marginTop: 16,
            fontSize: 17,
            lineHeight: 1.4,
            color: colors.textMuted,
          },
        },
        'Free F1 prediction game. Climb the global leaderboard. Compete with friends in private leagues.',
      ),
      e('div', { style: { display: 'flex', marginTop: 12 } }, domainLine(16)),
    ),
  );
}

async function renderPng(
  element: ReactNode,
  width: number,
  height: number,
  outPath: string,
) {
  const svg = await satori(element, {
    width,
    height,
    fonts: await loadFonts(),
  });
  const png = new Resvg(svg, { fitTo: { mode: 'width', value: width } })
    .render()
    .asPng();
  await writeFile(outPath, png);
  console.log('Wrote %s (%d x %d)', outPath, width, height);
}

async function main() {
  const require = createRequire(import.meta.url);
  await initWasm(
    await readFile(require.resolve('@resvg/resvg-wasm/index_bg.wasm')),
  );

  const xOnly = process.argv.includes('--x-only');
  const redditOnly = process.argv.includes('--reddit-only');

  if (!redditOnly) {
    await renderPng(
      xBanner(1500, 500),
      1500,
      500,
      'public/social/x-banner.png',
    );
  }

  if (!xOnly) {
    await renderPng(
      redditProfileBanner(),
      1000,
      300,
      'public/social/reddit/profile-banner.png',
    );
    await renderPng(
      redditCommunityDesktopBanner(),
      2144,
      256,
      'public/social/reddit/banner-desktop.png',
    );
    await renderPng(
      redditCommunityMobileBanner(),
      2160,
      256,
      'public/social/reddit/banner-mobile.png',
    );
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
