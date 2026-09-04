import { afterEach, describe, expect, it } from 'vitest';

import {
  SESSION_COOKIE_NAME_GLOBAL,
  prePaintCurtainScript,
} from './pre-paint-curtain';
import { hasClerkSessionCookie } from './session-cookie';

const THIS_INSTANCE = '__client_uat_ghhmdBz_';
const OTHER_INSTANCE = '__client_uat_i2Gq7zuC';
const LIVE = '1788516240';

function withCookies(cookie: string, sessionCookieName: string | null) {
  Object.defineProperty(document, 'cookie', {
    configurable: true,
    get: () => cookie,
  });
  (window as unknown as Record<string, unknown>)[SESSION_COOKIE_NAME_GLOBAL] =
    sessionCookieName;
  return hasClerkSessionCookie();
}

afterEach(() => {
  delete (window as unknown as Record<string, unknown>)[
    SESSION_COOKIE_NAME_GLOBAL
  ];
});

describe('hasClerkSessionCookie', () => {
  it('reports a live session on this instance', () => {
    expect(withCookies(`${THIS_INSTANCE}=${LIVE}`, THIS_INSTANCE)).toBe(true);
  });

  it('reports signed out when this instance says so', () => {
    expect(withCookies(`${THIS_INSTANCE}=0`, THIS_INSTANCE)).toBe(false);
  });

  /**
   * The production bug: a browser that had visited an earlier Clerk instance
   * kept its cookie at a live timestamp forever, so a genuinely signed-out
   * visitor was read as holding a session the SSR render had missed. That put
   * "Signing you in" over the authenticated dashboard, whose viewer queries
   * never resolved.
   */
  it('ignores a live cookie left behind by another Clerk instance', () => {
    expect(
      withCookies(
        `${THIS_INSTANCE}=0; ${OTHER_INSTANCE}=${LIVE}`,
        THIS_INSTANCE,
      ),
    ).toBe(false);
  });

  it('ignores a live pre-suffix cookie when this instance says signed out', () => {
    expect(
      withCookies(`${THIS_INSTANCE}=0; __client_uat=${LIVE}`, THIS_INSTANCE),
    ).toBe(false);
  });

  it('falls back to the pre-suffix cookie when this instance has none', () => {
    expect(withCookies(`__client_uat=${LIVE}`, THIS_INSTANCE)).toBe(true);
    expect(withCookies(`__client_uat=0`, THIS_INSTANCE)).toBe(false);
  });

  it('uses only the pre-suffix cookie when no name was published', () => {
    expect(withCookies(`${OTHER_INSTANCE}=${LIVE}`, null)).toBe(false);
    expect(withCookies(`__client_uat=${LIVE}`, null)).toBe(true);
  });

  it('reports signed out with no cookies at all', () => {
    expect(withCookies('', THIS_INSTANCE)).toBe(false);
  });

  /**
   * The two readers must agree, or the pre-paint curtain and React's curtain
   * disagree about whether a handoff is happening at all.
   */
  it('agrees with the pre-paint script it takes the name from', () => {
    const cases: [string, string | null][] = [
      [`${THIS_INSTANCE}=${LIVE}`, THIS_INSTANCE],
      [`${THIS_INSTANCE}=0; ${OTHER_INSTANCE}=${LIVE}`, THIS_INSTANCE],
      [`${THIS_INSTANCE}=0; __client_uat=${LIVE}`, THIS_INSTANCE],
      [`__client_uat=${LIVE}`, THIS_INSTANCE],
      [`${OTHER_INSTANCE}=${LIVE}`, null],
      ['', THIS_INSTANCE],
    ];

    for (const [cookie, name] of cases) {
      document.documentElement.removeAttribute('data-auth-handoff');
      Object.defineProperty(document, 'cookie', {
        configurable: true,
        get: () => cookie,
      });
      // eslint-disable-next-line no-eval -- running the shipped source is the point
      (0, eval)(prePaintCurtainScript(name));
      const prePaint =
        document.documentElement.hasAttribute('data-auth-handoff');
      document.documentElement.removeAttribute('data-auth-handoff');

      expect(hasClerkSessionCookie(), cookie).toBe(prePaint);
    }
  });
});
