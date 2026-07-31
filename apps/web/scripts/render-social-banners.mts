import { copyFile, readFile, writeFile } from 'node:fs/promises';
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
 *   pnpm --filter @grandprixpicks/web render-social
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
 * Reddit's trap is different and worse: the desktop banner is an extremely wide
 * strip and mobile crops hard to the centre. The old set handled that by
 * spreading artwork across the full width and shipping three crops of it, which
 * is how `banner-desktop.png` came to ship with its own URL sliced in half at
 * the bottom edge. Here the content block is identical and centred in every
 * Reddit variant, compact enough to survive the mobile crop; only the
 * expendable edge decoration differs between them.
 */
const EDGE_SAFE = 90;
const X_AVATAR_COLUMN = 340;

/**
 * The tagline. "Accent is rare" is easiest to break on a strip like this, so
 * the words stay ink and only the two separators are chartreuse — enough to
 * make the rhythm read as deliberate rather than as three unrelated words.
 */
function taglineStrip(fontSize: number, gap: number): ReactNode {
  const words = ['PICK', 'PREDICT', 'PROVE'];
  const children: ReactNode[] = [];
  words.forEach((word, index) => {
    if (index > 0) {
      children.push(
        e(
          'div',
          {
            key: `sep-${index}`,
            style: {
              margin: `0 ${gap}px`,
              fontSize,
              fontWeight: 600,
              fontFamily: 'IBM Plex Mono',
              color: colors.accent,
            },
          },
          '·',
        ),
      );
    }
    children.push(
      e(
        'div',
        {
          key: word,
          style: {
            fontSize,
            fontWeight: 600,
            fontFamily: 'IBM Plex Mono',
            letterSpacing: fontSize / 4.5,
            color: colors.textMuted,
          },
        },
        word,
      ),
    );
  });
  return e(
    'div',
    { style: { display: 'flex', alignItems: 'center' } },
    ...children,
  );
}

/**
 * A timing tower bleeding off the right edge: positions over gap bars, fading
 * as they descend.
 *
 * This is where the brief asked for a circuit outline. There is no circuit
 * artwork in this repo — the old banner's track was baked into a PNG with no
 * vector source — and a silhouette authored freehand was tried and rejected:
 * it rendered as a generic blob, and the audience is F1 fans who know these
 * shapes cold. A real licensed path dropped in here would replace this
 * wholesale. The timing tower is the motif the rest of the system already
 * uses, it needs no asset, and it says "live session" rather than "some track".
 */
function timingTower(): ReactNode {
  const ROWS = 7;
  return e(
    'div',
    {
      style: {
        display: 'flex',
        flexDirection: 'column' as const,
        position: 'absolute' as const,
        // Overhangs the frame so the longest bars run off the edge: the tower
        // should read as a slice of a screen, not a widget parked in a corner.
        // Cropping here is intended, so it ignores the safe margin.
        right: -44,
        top: 88,
        width: 474,
      },
    },
    ...Array.from({ length: ROWS }, (_, index) => {
      // Fades down the column so the tower reads as continuing past the frame
      // rather than stopping, and so it never competes with the headline.
      const opacity = 1 - index / (ROWS + 1);
      return e(
        'div',
        {
          key: String(index),
          style: {
            display: 'flex',
            alignItems: 'center',
            height: 40,
            opacity,
          },
        },
        e('div', {
          style: {
            width: index === 0 ? 3 : 2,
            height: 22,
            marginRight: 18,
            backgroundColor: index === 0 ? colors.accent : colors.borderStrong,
          },
        }),
        e(
          'div',
          {
            style: {
              width: 46,
              fontSize: 20,
              fontWeight: 600,
              fontFamily: 'IBM Plex Mono',
              color: index === 0 ? colors.text : colors.textMuted,
            },
          },
          `P${index + 1}`,
        ),
        // Varying lengths read as gaps on a timing screen. Deliberately not
        // real driver codes or lap times: a banner is not updated weekly, and
        // stale figures would date it the moment the grid changes.
        e('div', {
          style: {
            width: 190 + ((index * 61) % 230),
            height: 1,
            backgroundColor: colors.borderStrong,
          },
        }),
      );
    }),
  );
}

/**
 * The short-strip counterpart of the timing tower: a run of vertical ticks at
 * varying heights, like a telemetry trace. A seven-row tower does not fit in
 * 256px, and this keeps the same instrument register in a shape that does.
 *
 * Purely decorative and positioned outside the content band, so it is free to
 * be cropped away entirely on mobile.
 */
function edgeTicks(side: 'left' | 'right'): ReactNode {
  const TICKS = 22;
  return e(
    'div',
    {
      style: {
        display: 'flex',
        alignItems: 'center',
        position: 'absolute' as const,
        [side]: 56,
        top: 0,
        bottom: 0,
        gap: 9,
        // Reversed on the right so both runs fade outward from the content.
        flexDirection: (side === 'left' ? 'row' : 'row-reverse') as const,
      },
    },
    ...Array.from({ length: TICKS }, (_, index) => {
      const t = index / (TICKS - 1);
      return e('div', {
        key: String(index),
        style: {
          width: 2,
          height: 14 + Math.round(56 * Math.abs(Math.sin(index * 1.9))),
          opacity: 0.2 + 0.55 * t,
          backgroundColor:
            index === TICKS - 1 ? colors.accent : colors.borderStrong,
        },
      });
    }),
  );
}

/** Headline over tagline: the block every banner is built around. */
function contentBlock({
  headlineSize,
  taglineSize,
  align,
}: {
  headlineSize: number;
  taglineSize: number;
  align: 'left' | 'center';
}): ReactNode {
  const cross = align === 'center' ? 'center' : 'flex-start';
  return e(
    'div',
    {
      style: {
        display: 'flex',
        flexDirection: 'column' as const,
        alignItems: cross,
      },
    },
    // The same two-line break as the landing page and the OG card. A visitor
    // who arrives from a shared link and then opens the profile should meet one
    // sentence, not three variations on it.
    e(
      'div',
      {
        style: {
          display: 'flex',
          flexDirection: 'column' as const,
          alignItems: cross,
          fontSize: headlineSize,
          fontWeight: 300,
          letterSpacing: -headlineSize / 48,
          lineHeight: 1.16,
        },
      },
      e('div', {}, "Everyone's a strategist"),
      e('div', {}, 'on Sunday. Prove it.'),
    ),
    e(
      'div',
      { style: { display: 'flex', marginTop: headlineSize * 0.5 } },
      taglineStrip(taglineSize, taglineSize * 0.85),
    ),
  );
}

/** `.com`, not the `.app` the brief quoted — see `siteConfig.url`. */
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
    'grandprixpicks.com',
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

/** X header: headline pushed clear of the avatar, tower on the right. */
function xBanner(width: number, height: number): ReactNode {
  return frame(
    width,
    height,
    timingTower(),
    e(
      'div',
      {
        style: {
          display: 'flex',
          flexDirection: 'column' as const,
          justifyContent: 'center',
          position: 'absolute' as const,
          left: X_AVATAR_COLUMN,
          top: 0,
          bottom: 0,
        },
      },
      contentBlock({ headlineSize: 58, taglineSize: 26, align: 'left' }),
    ),
    // Bottom right, inside the horizontal safe band. Banners are not clickable,
    // but the domain still gets read and typed.
    e(
      'div',
      {
        style: {
          display: 'flex',
          position: 'absolute' as const,
          right: EDGE_SAFE,
          bottom: 78,
        },
      },
      domainLine(21),
    ),
  );
}

/**
 * Reddit. Centred rather than offset, because Reddit overlays the subreddit
 * icon and name on the lower left of the banner on desktop and crops to the
 * centre on mobile — the two constraints only agree in the middle.
 */
function redditBanner({
  width,
  height,
  headlineSize,
  taglineSize,
  urlSize,
  withEdgeTicks,
}: {
  width: number;
  height: number;
  headlineSize: number;
  taglineSize: number;
  urlSize: number;
  withEdgeTicks: boolean;
}): ReactNode {
  return frame(
    width,
    height,
    ...(withEdgeTicks ? [edgeTicks('left'), edgeTicks('right')] : []),
    e(
      'div',
      {
        style: {
          display: 'flex',
          flexDirection: 'column' as const,
          alignItems: 'center',
          justifyContent: 'center',
          position: 'absolute' as const,
          inset: 0,
        },
      },
      contentBlock({ headlineSize, taglineSize, align: 'center' }),
      e(
        'div',
        { style: { display: 'flex', marginTop: headlineSize * 0.42 } },
        domainLine(urlSize),
      ),
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

const REDDIT_STRIP = {
  headlineSize: 40,
  taglineSize: 19,
  urlSize: 16,
} as const;

async function main() {
  const require = createRequire(import.meta.url);
  await initWasm(
    await readFile(require.resolve('@resvg/resvg-wasm/index_bg.wasm')),
  );

  await renderPng(xBanner(1500, 500), 1500, 500, 'public/social/x-banner.png');

  // Sizes match the files they replace, so nothing downstream has to change.
  // `master` is the 3:1 hero; the three 256-tall strips are what Reddit
  // actually displays.
  await renderPng(
    redditBanner({
      width: 2172,
      height: 724,
      headlineSize: 76,
      taglineSize: 32,
      urlSize: 26,
      withEdgeTicks: true,
    }),
    2172,
    724,
    'public/social/reddit/banner-master.png',
  );

  await renderPng(
    redditBanner({
      width: 2144,
      height: 256,
      ...REDDIT_STRIP,
      withEdgeTicks: true,
    }),
    2144,
    256,
    'public/social/reddit/banner-desktop.png',
  );

  // The "safe" strips drop the edge decoration: if a crop can eat it, better
  // that there was never anything there to notice missing.
  await renderPng(
    redditBanner({
      width: 2144,
      height: 256,
      ...REDDIT_STRIP,
      withEdgeTicks: false,
    }),
    2144,
    256,
    'public/social/reddit/banner-desktop-safe.png',
  );

  await renderPng(
    redditBanner({
      width: 2160,
      height: 256,
      ...REDDIT_STRIP,
      withEdgeTicks: false,
    }),
    2160,
    256,
    'public/social/reddit/banner-mobile-safe.png',
  );

  /*
   * The avatar. Not re-rendered here: `logo-storefront.png` is already the
   * current mark inset for a circular crop, produced by render-logo-png.mjs
   * from the same favicon.svg. Copying guarantees the two can never disagree,
   * which the previous pair did — the profile picture was still a teal Lucide
   * flag on navy, a mark the reskin had already deleted.
   */
  await copyFile(
    'public/logo-storefront.png',
    'public/social/reddit/profile-picture.png',
  );
  console.log('Copied public/social/reddit/profile-picture.png');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
