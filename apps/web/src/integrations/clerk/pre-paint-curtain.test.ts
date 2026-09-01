import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  AUTH_HANDOFF_ATTRIBUTE,
  prePaintCurtainScript,
} from './pre-paint-curtain';

/**
 * The script is a string that runs before anything else on the page, so these
 * tests run the real emitted source rather than a re-implementation of it — a
 * copy would be free to be correct while the shipped string was not.
 */
function runScript(
  cookie: string,
  sessionCookieName: string | null = '__client_uat_i2Gq7zuC',
) {
  document.documentElement.removeAttribute(AUTH_HANDOFF_ATTRIBUTE);
  document.getElementById('gpp-pre-paint-curtain')?.remove();
  Object.defineProperty(document, 'cookie', {
    configurable: true,
    get: () => cookie,
  });
  // eslint-disable-next-line no-eval -- running the shipped source is the point
  (0, eval)(prePaintCurtainScript(sessionCookieName));
  return {
    handoff: document.documentElement.hasAttribute(AUTH_HANDOFF_ATTRIBUTE),
    curtain: document.getElementById('gpp-pre-paint-curtain'),
  };
}

afterEach(() => {
  document.documentElement.removeAttribute(AUTH_HANDOFF_ATTRIBUTE);
  document.getElementById('gpp-pre-paint-curtain')?.remove();
  vi.useRealTimers();
});

describe('prePaintCurtainScript', () => {
  it('raises the curtain when this instance has a live session', () => {
    const result = runScript('__client_uat_i2Gq7zuC=1787759969');
    expect(result.handoff).toBe(true);
    expect(result.curtain?.textContent).toContain('Signing you in');
  });

  it('leaves a signed-out visitor alone', () => {
    // The landing page is the product's whole conversion surface. A false
    // positive here hides it behind a loader for eight seconds.
    expect(runScript('__client_uat_i2Gq7zuC=0').handoff).toBe(false);
    expect(runScript('__client_uat_i2Gq7zuC=0').curtain).toBeNull();
    expect(runScript('').handoff).toBe(false);
    expect(runScript('').curtain).toBeNull();
  });

  it('ignores a cookie left behind by another Clerk instance', () => {
    // A browser that once visited the app under a different Clerk instance
    // keeps that instance's cookie indefinitely, and nothing on the page ever
    // resets it to `0`. The server refuses to read it (`isClerkSessionPresent`)
    // and so must this, or the two disagree about who is signed in — which is
    // the exact disagreement this script exists to detect.
    expect(runScript('__client_uat_someoneelse=1787759969').handoff).toBe(false);
  });

  it('prefers this instance over the pre-suffix cookie', () => {
    expect(
      runScript('__client_uat=1787759969; __client_uat_i2Gq7zuC=0').handoff,
    ).toBe(false);
    expect(
      runScript('__client_uat=0; __client_uat_i2Gq7zuC=1787759969').handoff,
    ).toBe(true);
  });

  it('falls back to the unsuffixed cookie when the key has no suffix', () => {
    expect(runScript('__client_uat=1787759969', null).handoff).toBe(true);
  });

  it('takes itself down if the app never boots', () => {
    vi.useFakeTimers();
    expect(runScript('__client_uat_i2Gq7zuC=1787759969').handoff).toBe(true);
    vi.advanceTimersByTime(8_000);
    // A failed chunk must not leave a visitor staring at a loader over a page
    // that rendered perfectly well underneath it.
    expect(document.documentElement.hasAttribute(AUTH_HANDOFF_ATTRIBUTE)).toBe(
      false,
    );
    expect(document.getElementById('gpp-pre-paint-curtain')).toBeNull();
  });
});
