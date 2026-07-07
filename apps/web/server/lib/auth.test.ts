import { describe, expect, it } from 'vitest';

import { buildConvexTokenIdentifier, isClerkSessionPresent } from './auth';

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
  it('is signed in when __client_uat is a positive timestamp', () => {
    expect(
      isClerkSessionPresent(
        requestWithCookie('__client_uat=1720000000; other=x'),
      ),
    ).toBe(true);
  });

  it('is signed out when __client_uat is 0', () => {
    expect(isClerkSessionPresent(requestWithCookie('__client_uat=0'))).toBe(
      false,
    );
  });

  it('is signed out when the cookie is absent', () => {
    expect(isClerkSessionPresent(requestWithCookie(null))).toBe(false);
    expect(isClerkSessionPresent(requestWithCookie('foo=bar'))).toBe(false);
  });

  it('matches the suffixed cookie form (__client_uat_<hash>)', () => {
    expect(
      isClerkSessionPresent(
        requestWithCookie('__client_uat_abc123=1720000000'),
      ),
    ).toBe(true);
    expect(
      isClerkSessionPresent(requestWithCookie('__client_uat_abc123=0')),
    ).toBe(false);
  });
});
