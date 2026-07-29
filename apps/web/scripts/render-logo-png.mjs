/**
 * Renders public/favicon.svg (the three-bar brand mark) to public/logo-storefront.png
 * at 512x512 so it stays pixel-perfect and consistent with the favicon.
 *
 * Run from apps/web: node scripts/render-logo-png.mjs
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
  const VIEWBOX = 32;
  const mid = VIEWBOX / 2;
  const scale = 0.78; // keeps the bars clear of a circular crop
  svg = svg.replace(
    /(<svg[^>]*>)([\s\S]*)(<\/svg>)/,
    (_match, open, body, close) =>
      `${open}<g transform="translate(${mid},${mid}) scale(${scale}) translate(-${mid},-${mid})">${body}</g>${close}`,
  );

  // Force output size: same graphic at 512x512. Strip any width/height the
  // source already declares first — resvg rejects a duplicated attribute, and
  // the mark carries its own intrinsic size where the old Lucide icon did not.
  svg = svg.replace(
    /<svg([^>]*)>/,
    (_match, attrs) =>
      `<svg${attrs.replace(/\s(?:width|height)="[^"]*"/g, '')} width="${SIZE}" height="${SIZE}">`,
  );

  const resvg = new Resvg(svg);
  const pngData = resvg.render();
  const png = pngData.asPng();

  const outPath = join(ROOT, 'public', 'logo-storefront.png');
  await writeFile(outPath, png);
  console.log('Wrote %s (%d x %d)', outPath, SIZE, SIZE);

  // Also output small PNG for email (SVG not supported in most clients)
  const emailSize = 64;
  const emailSvg = svg.replace(
    /width="\d+" height="\d+"/,
    `width="${emailSize}" height="${emailSize}"`,
  );
  const emailResvg = new Resvg(emailSvg);
  const emailPng = emailResvg.render().asPng();
  const emailPath = join(ROOT, 'public', 'logo-email.png');
  await writeFile(emailPath, emailPng);
  console.log('Wrote %s (%d x %d)', emailPath, emailSize, emailSize);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
