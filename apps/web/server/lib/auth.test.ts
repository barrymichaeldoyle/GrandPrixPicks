import { describe, expect, it } from 'vitest';

import { buildConvexTokenIdentifier } from './auth';

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
