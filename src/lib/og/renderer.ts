import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';

import { initWasm, Resvg } from '@resvg/resvg-wasm';
import type { ReactNode } from 'react';
import satori from 'satori';

import { loadFonts } from './fonts';
import { OG_HEIGHT, OG_WIDTH } from './styles';

let wasmReady: Promise<void> | null = null;

function ensureWasm(): Promise<void> {
  if (!wasmReady) {
    wasmReady = doInitWasm();
  }
  return wasmReady;
}

async function doInitWasm() {
  try {
    const require = createRequire(import.meta.url);
    const wasmPath = require.resolve('@resvg/resvg-wasm/index_bg.wasm');
    const wasmBuffer = await readFile(wasmPath);
    await initWasm(wasmBuffer);
  } catch (err) {
    // If already initialized (race condition or HMR reload), that's fine.
    if (err instanceof Error && err.message.includes('Already initialized')) {
      return;
    }
    throw err;
  }
}

export async function renderOgImage(element: ReactNode): Promise<Uint8Array> {
  const [fonts] = await Promise.all([loadFonts(), ensureWasm()]);

  const svg = await satori(element, {
    width: OG_WIDTH,
    height: OG_HEIGHT,
    fonts,
  });

  const resvg = new Resvg(svg, {
    fitTo: { mode: 'width', value: OG_WIDTH },
  });
  const pngData = resvg.render();
  return pngData.asPng();
}
