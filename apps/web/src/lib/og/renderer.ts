import { initWasm, Resvg } from '@resvg/resvg-wasm';
import type { ReactNode } from 'react';
import satori, { init as initSatori } from 'satori/standalone';

/*
 * satori is pinned to 0.29.0. Do not bump it without reading this.
 *
 * 0.30+ shapes text with harfbuzzjs, whose Emscripten wrapper cannot start on
 * the Workers runtime. It decides its environment with
 * `typeof WorkerGlobalScope != "undefined"`, which workerd satisfies, and then
 * reads `self.location.href`, which workerd does not define. That throws at
 * *module evaluation*, so importing anything that reaches satori takes the
 * route down before its handler runs. Get past that (by defining `location`)
 * and the next call fetches `hb.wasm` relative to the script directory, which
 * we do not host, and its sync fallback needs `XMLHttpRequest`.
 *
 * A bump to 0.33.4 shipped in 99ec750 on 2026-08-26 and did exactly that. It
 * looked like nothing: every OG route catches its own errors and falls back to
 * the static `og-default.png`, so no request 500'd and no preview was visibly
 * broken. The site just served the evergreen card for every link preview and
 * every player's share for three days, and the only symptom was that a Grand
 * Prix card never named the Grand Prix.
 *
 * Node keeps `__filename`, so the Node path never takes the failing branch:
 * `pnpm dev`, `vite preview` and every unit test render these cards perfectly
 * on a broken build. The only thing that reproduces it is the Workers runtime:
 *
 *     pnpm --filter @grandprixpicks/web build:cf
 *     npx wrangler pages dev dist   # then request /og/next
 *
 * Upgrading needs harfbuzz's wasm hosted as a static asset and `location`
 * polyfilled to point at it, which buys us complex-script shaping we do not
 * use on cards that are Latin text and driver codes. 0.29.0 is the last
 * release that runs on Workers unaided.
 */

import { loadFonts } from './fonts';
import type { OgImageSize } from './styles';
import { getOgDimensions } from './styles';

let wasmReady: Promise<void> | null = null;
let yogaReady: Promise<void> | null = null;

function ensureWasm(): Promise<void> {
  if (!wasmReady) {
    wasmReady = doInitWasm();
  }
  return wasmReady;
}

async function doInitWasm() {
  // Try Node.js fs first (works in dev with node-server preset).
  // Uses dynamic import() so the module still loads on Cloudflare Workers
  // where node:fs/node:module don't exist.
  try {
    const { readFile } = await import('node:fs/promises');
    const { createRequire } = await import('node:module');
    const require = createRequire(import.meta.url);
    const wasmPath = require.resolve('@resvg/resvg-wasm/index_bg.wasm');
    const wasmBuffer = await readFile(wasmPath);
    await initWasm(wasmBuffer);
    return;
  } catch (err) {
    if (err instanceof Error && err.message.includes('Already initialized')) {
      return;
    }
    // Node.js approach failed (expected on Cloudflare Workers) — fall through
  }

  // Production fallback: Nitro's unwasm plugin bundles the WASM and
  // makes this dynamic import resolve to the bundled module.
  try {
    const wasmModule = await import('@resvg/resvg-wasm/index_bg.wasm');
    await initWasm(wasmModule.default);
  } catch (err) {
    if (err instanceof Error && err.message.includes('Already initialized')) {
      return;
    }
    throw err;
  }
}

function ensureYoga(): Promise<void> {
  if (!yogaReady) {
    yogaReady = doInitYoga();
  }
  return yogaReady;
}

async function doInitYoga() {
  try {
    const { readFile } = await import('node:fs/promises');
    const { createRequire } = await import('node:module');
    const require = createRequire(import.meta.url);
    const wasmPath = require.resolve('satori/yoga.wasm');
    const wasmBuffer = await readFile(wasmPath);
    await initSatori(wasmBuffer);
    return;
  } catch {
    // Node.js approach failed (expected on Cloudflare Workers).
  }

  const yogaModule = await import('satori/yoga.wasm');
  await initSatori(yogaModule.default);
}

export async function renderOgImage(
  element: ReactNode,
  size: OgImageSize = 'og',
): Promise<Uint8Array> {
  const [fonts] = await Promise.all([loadFonts(), ensureYoga(), ensureWasm()]);
  const { width, height } = getOgDimensions(size);

  const svg = await satori(element, {
    width,
    height,
    fonts,
  });

  const resvg = new Resvg(svg, {
    fitTo: { mode: 'width', value: width },
  });
  const pngData = resvg.render();
  return pngData.asPng();
}
