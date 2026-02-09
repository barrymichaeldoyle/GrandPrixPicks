/**
 * Renders public/favicon.svg (Lucide-style icon) to public/logo-storefront.png
 * at 512x512 so it stays pixel-perfect and consistent with the favicon.
 *
 * Run from project root: node scripts/render-logo-png.mjs
 */

import { readFile, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);

const SIZE = 512;
const ROOT = join(__dirname, '..');

async function main() {
  const { initWasm, Resvg } = await import('@resvg/resvg-wasm');

  const wasmPath = require.resolve('@resvg/resvg-wasm/index_bg.wasm');
  const wasmBuffer = await readFile(wasmPath);
  await initWasm(wasmBuffer);

  const svgPath = join(ROOT, 'public', 'favicon.svg');
  let svg = await readFile(svgPath, 'utf-8');
  // Storefront: scale and center the flag so it fits inside a circular crop (app store, Lemon Squeezy)
  const scale = 0.82; // fits inside circle radius ~10.5 in 24x24 viewBox
  svg = svg.replace(
    /<path[\s\S]*?\/>/,
    (path) =>
      `<g transform="translate(12,12) scale(${scale}) translate(-12,-12)">${path}</g>`,
  );
  // Force output size: same Lucide-style graphic at 512x512
  svg = svg.replace(
    /<svg\s/,
    `<svg width="${SIZE}" height="${SIZE}" `,
  );

  const resvg = new Resvg(svg);
  const pngData = resvg.render();
  const png = pngData.asPng();

  const outPath = join(ROOT, 'public', 'logo-storefront.png');
  await writeFile(outPath, png);
  console.log('Wrote %s (%d x %d)', outPath, SIZE, SIZE);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
