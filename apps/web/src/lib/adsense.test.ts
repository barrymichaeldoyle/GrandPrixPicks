import { afterEach, describe, expect, it } from 'vitest';

import {
  ADSENSE_CLIENT,
  ensureAdSenseLoaded,
  resetAdSenseLoaderForTests,
} from './adsense';

function scripts() {
  return [...document.querySelectorAll('#gpp-adsense-script')];
}

/** The tag is appended synchronously, so it is there to fire an event at. */
function lastScript() {
  const script = scripts().at(-1);
  if (!script) {
    throw new Error('no adsense script was appended');
  }
  return script;
}

afterEach(() => {
  resetAdSenseLoaderForTests();
  for (const script of scripts()) {
    script.remove();
  }
});

describe('ensureAdSenseLoaded', () => {
  it('appends one script naming our publisher', async () => {
    const pending = ensureAdSenseLoaded();
    const script = lastScript() as HTMLScriptElement;

    expect(script.src).toContain(ADSENSE_CLIENT);
    expect(script.async).toBe(true);
    expect(script.crossOrigin).toBe('anonymous');

    script.dispatchEvent(new Event('load'));
    await expect(pending).resolves.toBeUndefined();
  });

  it('loads once however many slots ask', async () => {
    // The whole point of the shared entry: the root and every slot on the page
    // call this, and only the first may create a tag.
    const first = ensureAdSenseLoaded();
    const second = ensureAdSenseLoaded();
    const third = ensureAdSenseLoaded();

    expect(scripts()).toHaveLength(1);

    lastScript().dispatchEvent(new Event('load'));
    await Promise.all([first, second, third]);
    expect(scripts()).toHaveLength(1);
  });

  it('resolves immediately once loaded, without a second tag', async () => {
    const first = ensureAdSenseLoaded();
    lastScript().dispatchEvent(new Event('load'));
    await first;

    await expect(ensureAdSenseLoaded()).resolves.toBeUndefined();
    expect(scripts()).toHaveLength(1);
  });

  it('rejects rather than hanging when the script is blocked', async () => {
    // The common case, not the rare one: an ad blocker fires `error`. A caller
    // that awaited forever would leave a reserved gap on the page.
    const pending = ensureAdSenseLoaded();
    lastScript().dispatchEvent(new Event('error'));

    await expect(pending).rejects.toThrow(/failed to load/i);
  });

  it('lets a later slot retry after a failure', async () => {
    const first = ensureAdSenseLoaded();
    lastScript().dispatchEvent(new Event('error'));
    await expect(first).rejects.toThrow();

    // The failed tag is gone, so the retry is a real attempt rather than a
    // cached rejection for the life of the page.
    expect(scripts()).toHaveLength(0);

    const second = ensureAdSenseLoaded();
    expect(scripts()).toHaveLength(1);
    lastScript().dispatchEvent(new Event('load'));
    await expect(second).resolves.toBeUndefined();
  });
});
