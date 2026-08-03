import { readFile, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';

import { initWasm, Resvg } from '@resvg/resvg-wasm';
import satori from 'satori';

import { loadFonts } from '../src/lib/og/fonts';
import { defaultBrandTemplate } from '../src/lib/og/templates';

/**
 * Renders the evergreen OG fallback into `public/og-default.png`.
 *
 * Same template as the live `/og/next` card — hook first, timing tower on the
 * right, mono strip along the bottom — without a race deadline. Built into
 * every web build so the static fallback cannot drift from the dynamic card:
 *
 *   pnpm --filter @grandprixpicks/web exec tsx scripts/render-og-default-png.mts
 */

const WIDTH = 1200;
const HEIGHT = 630;

async function main() {
  const require = createRequire(import.meta.url);
  await initWasm(
    await readFile(require.resolve('@resvg/resvg-wasm/index_bg.wasm')),
  );

  const svg = await satori(defaultBrandTemplate(), {
    width: WIDTH,
    height: HEIGHT,
    fonts: await loadFonts(),
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
