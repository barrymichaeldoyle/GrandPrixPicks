import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

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
 * Renders a single-post campaign's assets: one 1080x1350 for Instagram and one
 * 1600x900 for X.
 *
 *   pnpm --filter @grandprixpicks/web social-card norris-mclaren-2030
 *
 * Follows the layout every campaign in `artifacts/social/` uses. Output goes to
 * both `artifacts/social/<slug>/` (the campaign record, next to its
 * `campaign.md`) and `apps/web/public/social/<slug>/` (committed and served
 * from the site), the same pair `render-monza-news-roundup.mts` writes.
 *
 * Serving them matters beyond tidiness: Buffer attaches media by URL and has no
 * upload mutation at all — `ImageAssetInput` is `{ url, thumbnailUrl,
 * metadata }` and the schema exposes nothing to POST bytes to. A card that only
 * exists on a laptop cannot be scheduled.
 *
 * **This is the design-system route, not the editorial one.** The Monza roundup
 * composes copy over hand-made collage art in `source-art/`; this renders
 * entirely from tokens. Use this for a card whose subject is facts and figures,
 * the way the Dutch GP community picks card was, and the collage pipeline when
 * a story wants illustration.
 *
 * The copy lives here rather than in the arguments so a re-run reproduces the
 * same card, and so a fact that came from a source is reviewable in a diff
 * instead of retyped into a shell.
 */
const STORIES: Record<string, SocialNewsCard> = {
  'norris-mclaren-2030': {
    eyebrow: 'Contract news',
    kicker: 'McLaren',
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

const SIZES: SocialCardSize[] = ['instagram', 'x'];

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

  const artifactDir = fileURLToPath(
    new URL(`../../../artifacts/social/${slug}/`, import.meta.url),
  );
  const publicDir = fileURLToPath(
    new URL(`../public/social/${slug}/`, import.meta.url),
  );
  await mkdir(artifactDir, { recursive: true });
  await mkdir(publicDir, { recursive: true });

  for (const size of SIZES) {
    const { width, height } = getSocialCardDimensions(size);
    const svg = await satori(socialNewsCard(story, size), {
      width,
      height,
      fonts,
    });
    const png = new Resvg(svg, { fitTo: { mode: 'width', value: width } })
      .render()
      .asPng();
    const filename = `${slug}-${size}.png`;
    for (const dir of [artifactDir, publicDir]) {
      await writeFile(path.join(dir, filename), png);
    }
    console.log(`Wrote ${filename} (${width}x${height})`);
  }
}

main();
