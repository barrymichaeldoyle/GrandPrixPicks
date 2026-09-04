import { afterEach, describe, expect, it } from 'vitest';

import {
  SESSION_COOKIE_NAME_GLOBAL,
  prePaintCurtainScript,
} from './pre-paint-curtain';
import {
  expireForeignClerkSessionCookies,
  hasClerkSessionCookie,
} from './session-cookie';

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

describe('expireForeignClerkSessionCookies', () => {
  const written: string[] = [];

  function withJar(cookie: string, sessionCookieName: string | null) {
    written.length = 0;
    Object.defineProperty(document, 'cookie', {
      configurable: true,
      get: () => cookie,
      set: (value: string) => written.push(value),
    });
    (window as unknown as Record<string, unknown>)[SESSION_COOKIE_NAME_GLOBAL] =
      sessionCookieName;
    return expireForeignClerkSessionCookies();
  }

  function expiredNames() {
    return [...new Set(written.map((entry) => entry.split('=')[0]))].sort();
  }

  it('expires another instance and the pre-suffix name once ours is present', () => {
    const stale = withJar(
      `${THIS_INSTANCE}=${LIVE}; ${OTHER_INSTANCE}=${LIVE}; __client_uat=${LIVE}`,
      THIS_INSTANCE,
    );

    expect(stale.sort()).toEqual(['__client_uat', OTHER_INSTANCE]);
    expect(expiredNames()).toEqual(['__client_uat', OTHER_INSTANCE]);
    expect(written.every((entry) => entry.includes('Max-Age=0'))).toBe(true);
  });

  it('never expires this instance', () => {
    withJar(
      `${THIS_INSTANCE}=${LIVE}; ${OTHER_INSTANCE}=${LIVE}`,
      THIS_INSTANCE,
    );
    expect(expiredNames()).not.toContain(THIS_INSTANCE);
  });

  /**
   * The unsuffixed cookie is a legitimate fallback until this instance has
   * written its own. Dropping it here would sign out a visitor on an app that
   * had not migrated to suffixed cookies.
   */
  it('touches nothing when this instance has no cookie on the jar', () => {
    expect(withJar(`__client_uat=${LIVE}`, THIS_INSTANCE)).toEqual([]);
    expect(written).toEqual([]);
  });

  it('touches nothing when no cookie name was published', () => {
    expect(
      withJar(`${OTHER_INSTANCE}=${LIVE}; __client_uat=${LIVE}`, null),
    ).toEqual([]);
    expect(written).toEqual([]);
  });

  it('leaves unrelated cookies alone', () => {
    withJar(
      `${THIS_INSTANCE}=${LIVE}; __session=abc; ph_phc_x=1`,
      THIS_INSTANCE,
    );
    expect(expiredNames()).toEqual([]);
  });

  /**
   * An expiry is ignored unless its domain matches how the cookie was set, and
   * that is not readable back, so every plausible spelling is written.
   */
  it('writes host and registrable-domain variants', () => {
    withJar(`${THIS_INSTANCE}=${LIVE}; __client_uat=${LIVE}`, THIS_INSTANCE);
    const domains = written
      .map((entry) => /domain=([^;]*)/.exec(entry)?.[1] ?? '(none)')
      .filter((domain, index, all) => all.indexOf(domain) === index);
    expect(domains).toContain('(none)');
    expect(domains.some((domain) => domain.startsWith('.'))).toBe(true);
  });

  /**
   * The whole point: after one visit the jar can no longer produce the
   * disagreement that stranded a signed-out visitor on the dashboard.
   */
  it('leaves a jar that reads signed out', () => {
    withJar(`${THIS_INSTANCE}=0; ${OTHER_INSTANCE}=${LIVE}`, THIS_INSTANCE);
    Object.defineProperty(document, 'cookie', {
      configurable: true,
      get: () => `${THIS_INSTANCE}=0`,
    });
    expect(hasClerkSessionCookie()).toBe(false);
  });
});
