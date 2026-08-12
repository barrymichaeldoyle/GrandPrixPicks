/**
 * Renders every raster logo from public/favicon.svg (the three-bar brand
 * mark), so browser, install, email, storefront and mobile surfaces cannot
 * drift.
 *
 * The mobile app icons are emitted here rather than from apps/mobile because
 * this is where the mark lives and where resvg is already a dependency. A
 * second generator would be a second thing to forget at the next rebrand,
 * which is exactly how the mobile app ended up shipping a retired teal flag.
 *
 * Run from apps/web: node scripts/render-logo-png.mjs
 */

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);

const ROOT = join(__dirname, '..');
const MOBILE_ASSETS = join(ROOT, '..', 'mobile', 'assets');

function mobileAsset(filename) {
  return join(MOBILE_ASSETS, filename);
}

function atSize(svg, size) {
  return svg.replace(
    /<svg([^>]*)>/,
    (_match, attrs) =>
      `<svg${attrs.replace(/\s(?:width|height)="[^"]*"/g, '')} width="${size}" height="${size}">`,
  );
}

/**
 * iOS applies its own rounded mask, so a baked corner radius leaves dark
 * corners poking outside it. Square the plate and let the platform crop.
 */
function squarePlate(svg) {
  return svg.replace(/(<rect[^>]*width="32"[^>]*)\srx="6"/, '$1');
}

/** Drops the plate entirely, for surfaces that supply their own background. */
function withoutPlate(svg) {
  return svg.replace(/<rect[^>]*width="32"[^>]*rx="6"[^>]*\/>/, '');
}

/** Android status-bar icons are a silhouette: white on transparent. */
function asSilhouette(svg) {
  return withoutPlate(svg).replace(/fill="#D4FF3F"/i, 'fill="#FFFFFF"');
}

/**
 * Android masks an adaptive icon's foreground to roughly the middle two
 * thirds, so the mark is scaled about its centre to survive every mask shape
 * the launcher might apply.
 */
function insetForAdaptiveIcon(svg) {
  const VIEWBOX = 32;
  const mid = VIEWBOX / 2;
  const scale = 0.6;

  return withoutPlate(svg).replace(
    /(<svg[^>]*>)([\s\S]*)(<\/svg>)/,
    (_match, open, body, close) =>
      `${open}<g transform="translate(${mid},${mid}) scale(${scale}) translate(-${mid},-${mid})">${body}</g>${close}`,
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
  await renderTo(Resvg, sourceSvg, join(ROOT, 'public', filename), size);
}

async function renderTo(Resvg, sourceSvg, outputPath, size) {
  const png = new Resvg(atSize(sourceSvg, size)).render().asPng();
  await mkdir(dirname(outputPath), { recursive: true });
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

    /*
     * Mobile. iOS wants an opaque square it can mask itself; Android wants a
     * transparent foreground inset for its own mask, plus a white silhouette
     * for the status bar. The splash reuses the circular-crop inset because it
     * renders as a centred mark on a flat background.
     */
    renderTo(Resvg, squarePlate(svg), mobileAsset('icon.png'), 1024),
    renderTo(
      Resvg,
      insetForAdaptiveIcon(svg),
      mobileAsset('adaptive-icon.png'),
      1024,
    ),
    renderTo(Resvg, cropSafeSvg, mobileAsset('splash-icon.png'), 512),
    renderTo(
      Resvg,
      asSilhouette(svg),
      mobileAsset('notification-icon.png'),
      96,
    ),
  ]);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
