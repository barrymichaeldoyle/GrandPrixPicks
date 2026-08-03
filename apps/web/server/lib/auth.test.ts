import { beforeAll, describe, expect, it } from 'vitest';

import { buildConvexTokenIdentifier, isClerkSessionPresent } from './auth';

// `pk_test_` + base64("rare-chimp-58.clerk.accounts.dev$"), whose SHA-1 gives
// the cookie suffix Clerk's client SDK would use for this instance.
const PUBLISHABLE_KEY = 'pk_test_cmFyZS1jaGltcC01OC5jbGVyay5hY2NvdW50cy5kZXYk';
const COOKIE_SUFFIX = 'i2Gq7zuC';

beforeAll(() => {
  process.env.VITE_CLERK_PUBLISHABLE_KEY = PUBLISHABLE_KEY;
});

function requestWithCookie(cookie: string | null): Request {
  return new Request('https://grandprixpicks.com/', {
    headers: cookie === null ? {} : { cookie },
  });
}

describe('buildConvexTokenIdentifier', () => {
  it('builds the Convex token identifier from issuer and subject', () => {
    expect(
      buildConvexTokenIdentifier({
        issuer: 'https://clerk.example.com',
        subject: 'user_123',
      }),
    ).toBe('https://clerk.example.com|user_123');
  });

  it('returns null when either claim is missing', () => {
    expect(
      buildConvexTokenIdentifier({ issuer: null, subject: 'user_123' }),
    ).toBeNull();
    expect(
      buildConvexTokenIdentifier({
        issuer: 'https://clerk.example.com',
        subject: null,
      }),
    ).toBeNull();
  });
});

describe('isClerkSessionPresent', () => {
  it('is signed in when the unsuffixed __client_uat is a positive timestamp', async () => {
    await expect(
      isClerkSessionPresent(
        requestWithCookie('__client_uat=1720000000; other=x'),
      ),
    ).resolves.toBe(true);
  });

  it('is signed out when __client_uat is 0', async () => {
    await expect(
      isClerkSessionPresent(requestWithCookie('__client_uat=0')),
    ).resolves.toBe(false);
  });

  it('is signed out when the cookie is absent', async () => {
    await expect(isClerkSessionPresent(requestWithCookie(null))).resolves.toBe(
      false,
    );
    await expect(
      isClerkSessionPresent(requestWithCookie('foo=bar')),
    ).resolves.toBe(false);
  });

  it('matches this instance’s suffixed cookie (__client_uat_<suffix>)', async () => {
    await expect(
      isClerkSessionPresent(
        requestWithCookie(`__client_uat_${COOKIE_SUFFIX}=1720000000`),
      ),
    ).resolves.toBe(true);
    await expect(
      isClerkSessionPresent(
        requestWithCookie(`__client_uat_${COOKIE_SUFFIX}=0`),
      ),
    ).resolves.toBe(false);
  });

  it('ignores another Clerk instance’s stale suffixed cookie', async () => {
    // An origin that has hosted a different Clerk instance keeps its
    // `__client_uat_<other>` cookie forever, stuck at its last signed-in value.
    await expect(
      isClerkSessionPresent(
        requestWithCookie('__client_uat_cohOZbxI=1766583928'),
      ),
    ).resolves.toBe(false);
  });

  it('prefers this instance’s cookie over a stale unsuffixed one', async () => {
    await expect(
      isClerkSessionPresent(
        requestWithCookie(
          `__client_uat=1720000000; __client_uat_${COOKIE_SUFFIX}=0`,
        ),
      ),
    ).resolves.toBe(false);
    await expect(
      isClerkSessionPresent(
        requestWithCookie(
          `__client_uat=0; __client_uat_${COOKIE_SUFFIX}=1720000000`,
        ),
      ),
    ).resolves.toBe(true);
  });
});
