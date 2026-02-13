import { initWasm, Resvg } from '@resvg/resvg-wasm';
import type { ReactNode } from 'react';
import satori from 'satori';

import { loadFonts } from './fonts';
import type { OgImageSize } from './styles';
import { getOgDimensions } from './styles';

let wasmReady: Promise<void> | null = null;

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
    // @ts-expect-error — wasm import resolved by unwasm bundler plugin
    await initWasm(import('@resvg/resvg-wasm/index_bg.wasm'));
  } catch (err) {
    if (err instanceof Error && err.message.includes('Already initialized')) {
      return;
    }
    throw err;
  }
}

export async function renderOgImage(
  element: ReactNode,
  size: OgImageSize = 'og',
): Promise<Uint8Array> {
  const [fonts] = await Promise.all([loadFonts(), ensureWasm()]);
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
