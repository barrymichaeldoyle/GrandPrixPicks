import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';

import { initWasm, Resvg } from '@resvg/resvg-wasm';
import satori from 'satori';

import { loadFonts } from '../src/lib/og/fonts';
import type { SocialCardSize, SocialNewsCard } from '../src/lib/og/socialCards';
import {
  getSocialCardDimensions,
  socialNewsCard,
} from '../src/lib/og/socialCards';
import { FALLBACK_TEAM_COLOR, TEAM_COLORS } from '../src/lib/teamColors';

/**
 * Renders a branded social card to a PNG for posting as the brand account.
 *
 *   pnpm --filter @grandprixpicks/web social-card norris-mclaren-2030
 *
 * Writes `<slug>-square.png` (Instagram) and `<slug>-wide.png` (X) into
 * `public/social/`, so they are committed and served from the site.
 *
 * That is not just for tidiness. Buffer's API attaches media by URL and has no
 * upload mutation at all — `ImageAssetInput` is `{ url, thumbnailUrl,
 * metadata }` and the schema exposes nothing to POST bytes to. So a card that
 * only exists on a laptop cannot be scheduled; it has to be somewhere public
 * first. `public/` is the plain-static answer, with none of an OG route's
 * machinery: no Convex read, no satori at request time, no fallback to guard.
 *
 * The copy lives here rather than in the arguments so a re-run reproduces the
 * same card, and so a fact that came from a source is reviewable in a diff
 * instead of being retyped into a shell each time.
 */
const STORIES: Record<string, SocialNewsCard> = {
  'norris-mclaren-2030': {
    eyebrow: 'Contract news',
    headline: 'Norris re-signs with McLaren to 2030',
    standfirst:
      'A new deal keeps Lando Norris at McLaren until at least the end of 2030, with a multi-year option beyond it.',
    driver: {
      code: 'NOR',
      color: TEAM_COLORS.McLaren ?? FALLBACK_TEAM_COLOR,
    },
    facts: [
      { label: 'Signed until', value: 'End of 2030' },
      { label: 'Piastri until', value: 'End of 2028' },
      { label: 'At McLaren since', value: '2017' },
    ],
  },
};

const OUT_DIR = 'public/social';

async function main() {
  const slug = process.argv[2];
  const story = slug ? STORIES[slug] : undefined;
  if (!story) {
    console.error(
      `Usage: social-card <slug>\n  known: ${Object.keys(STORIES).join(', ')}`,
    );
    process.exitCode = 1;
    return;
  }

  const require = createRequire(import.meta.url);
  await initWasm(
    await readFile(require.resolve('@resvg/resvg-wasm/index_bg.wasm')),
  );
  const fonts = await loadFonts();
  await mkdir(OUT_DIR, { recursive: true });

  for (const size of ['square', 'wide'] as SocialCardSize[]) {
    const { width, height } = getSocialCardDimensions(size);
    const svg = await satori(socialNewsCard(story, size), {
      width,
      height,
      fonts,
    });
    const png = new Resvg(svg, { fitTo: { mode: 'width', value: width } })
      .render()
      .asPng();
    const path = `${OUT_DIR}/${slug}-${size}.png`;
    await writeFile(path, png);
    console.log(`Wrote ${path} (${width}x${height})`);
  }
}

main();
