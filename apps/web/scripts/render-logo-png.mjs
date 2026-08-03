/**
 * Renders every raster logo from public/favicon.svg (the three-bar brand
 * mark), so browser, install, email and storefront surfaces cannot drift.
 *
 * Run from apps/web: node scripts/render-logo-png.mjs
 */

import { readFile, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);

const ROOT = join(__dirname, '..');

function atSize(svg, size) {
  return svg.replace(
    /<svg([^>]*)>/,
    (_match, attrs) =>
      `<svg${attrs.replace(/\s(?:width|height)="[^"]*"/g, '')} width="${size}" height="${size}">`,
  );
}

function insetForCircularCrop(svg) {
  const VIEWBOX = 32;
  const mid = VIEWBOX / 2;
  const scale = 0.78;

  return svg.replace(
    /(<svg[^>]*>)([\s\S]*)(<\/svg>)/,
    (_match, open, body, close) =>
      `${open}<g transform="translate(${mid},${mid}) scale(${scale}) translate(-${mid},-${mid})">${body}</g>${close}`,
  );
}

async function renderTarget(Resvg, sourceSvg, filename, size) {
  const png = new Resvg(atSize(sourceSvg, size)).render().asPng();
  const outputPath = join(ROOT, 'public', filename);
  await writeFile(outputPath, png);
  console.log('Wrote %s (%d x %d)', outputPath, size, size);
}

async function main() {
  const { initWasm, Resvg } = await import('@resvg/resvg-wasm');

  const wasmPath = require.resolve('@resvg/resvg-wasm/index_bg.wasm');
  const wasmBuffer = await readFile(wasmPath);
  await initWasm(wasmBuffer);

  const svgPath = join(ROOT, 'public', 'favicon.svg');
  const svg = await readFile(svgPath, 'utf-8');

  /*
   * Storefront targets (app stores, Lemon Squeezy) crop to a circle, so the
   * mark is scaled down about its centre to sit inside the inscribed circle.
   *
   * This used to regex out the Lucide `<path>` and wrap that. The mark is now
   * three `<rect>`s in a `<g>`, so that pattern matches nothing — it would
   * have silently emitted an uncropped, unscaled logo rather than failing.
   * Scaling the whole 32x32 viewBox is also simply more robust: it does not
   * care what the artwork is made of.
   */
  const cropSafeSvg = insetForCircularCrop(svg);

  await Promise.all([
    renderTarget(Resvg, svg, 'favicon-16x16.png', 16),
    renderTarget(Resvg, svg, 'favicon-32x32.png', 32),
    renderTarget(Resvg, svg, 'apple-touch-icon.png', 180),
    renderTarget(Resvg, svg, 'android-chrome-192x192.png', 192),
    renderTarget(Resvg, svg, 'android-chrome-512x512.png', 512),
    renderTarget(Resvg, cropSafeSvg, 'logo-storefront.png', 512),
    // SVG is not supported in most email clients.
    renderTarget(Resvg, cropSafeSvg, 'logo-email.png', 64),
  ]);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
