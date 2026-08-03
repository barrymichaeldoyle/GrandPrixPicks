import { readFile, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';

import { colors } from '@grandprixpicks/shared/tokens';
import { initWasm, Resvg } from '@resvg/resvg-wasm';
import type { ReactNode } from 'react';
import { createElement as e } from 'react';
import satori from 'satori';

import { loadFonts } from '../src/lib/og/fonts';

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

/**
 * The real product motif from the landing page: an empty Top 5 pick sheet.
 *
 * It stays intentionally schematic. Driver names or race data would make the
 * profile art stale; speed streaks, chequered flags and a mystery car would
 * make it look like every other motorsport banner. Five quiet position slots
 * say what the product does without pretending the banner is live telemetry.
 */
function topFiveSheet(): ReactNode {
  const ROWS = 5;
  return e(
    'div',
    {
      style: {
        display: 'flex',
        flexDirection: 'column' as const,
        position: 'absolute' as const,
        right: 68,
        top: 88,
        width: 388,
        paddingLeft: 30,
        borderLeft: `2px solid ${colors.accent}`,
      },
    },
    e(
      'div',
      {
        style: {
          display: 'flex',
          alignItems: 'center',
          height: 30,
          marginBottom: 10,
          fontFamily: 'IBM Plex Mono',
          fontSize: 15,
          fontWeight: 500,
          letterSpacing: 3.2,
          color: colors.textMuted,
        },
      },
      'TOP 5',
    ),
    ...Array.from({ length: ROWS }, (_, index) => {
      return e(
        'div',
        {
          key: String(index),
          style: {
            display: 'flex',
            alignItems: 'center',
            height: 54,
            borderBottom: `1px solid ${colors.border}`,
          },
        },
        e(
          'div',
          {
            style: {
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 42,
              height: 28,
              marginRight: 18,
              border: `1px solid ${
                index === 0 ? colors.accent : colors.borderStrong
              }`,
              borderRadius: 2,
              backgroundColor: index === 0 ? colors.accent : 'transparent',
              fontSize: 14,
              fontWeight: 600,
              fontFamily: 'IBM Plex Mono',
              color: index === 0 ? colors.textOnAccent : colors.textMuted,
            },
          },
          `P${index + 1}`,
        ),
        e(
          'div',
          {
            style: {
              display: 'flex',
              flex: 1,
              height: 1,
              borderBottom: `1px solid ${colors.borderStrong}`,
            },
          },
          '',
        ),
      );
    }),
  );
}

/** The landing hero's exact editorial hierarchy, adapted to X's safe area. */
function xHeroBlock(): ReactNode {
  return e(
    'div',
    {
      style: {
        display: 'flex',
        flexDirection: 'column' as const,
        position: 'absolute' as const,
        left: X_AVATAR_COLUMN,
        top: 82,
        width: 650,
      },
    },
    e(
      'div',
      {
        style: {
          display: 'flex',
          fontFamily: 'IBM Plex Mono',
          fontSize: 15,
          fontWeight: 500,
          letterSpacing: 3.4,
          color: colors.textMuted,
        },
      },
      'FREE F1 PREDICTION GAME',
    ),
    e(
      'div',
      {
        style: {
          display: 'flex',
          flexDirection: 'column' as const,
          marginTop: 20,
          fontSize: 58,
          fontWeight: 300,
          letterSpacing: -1.2,
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
    ),
    e(
      'div',
      {
        style: {
          display: 'flex',
          width: 600,
          marginTop: 24,
          fontSize: 19,
          lineHeight: 1.5,
          color: colors.textMuted,
        },
      },
      'Climb the global leaderboard. Compete with friends in private leagues.',
    ),
  );
}

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

/** X header: the landing hero, compacted into the avatar-safe band. */
function xBanner(width: number, height: number): ReactNode {
  return frame(
    width,
    height,
    topFiveSheet(),
    xHeroBlock(),
    e(
      'div',
      {
        style: {
          display: 'flex',
          position: 'absolute' as const,
          right: 68,
          bottom: 52,
        },
      },
      domainLine(18),
    ),
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
