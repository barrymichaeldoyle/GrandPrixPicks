import { describe, expect, it } from 'vitest';

import { clerkFrontendApiOrigin } from './clerkOrigin';

/** `pk_<env>_` + base64('<host>$') is the shape Clerk publishes. */
function key(env: 'test' | 'live', host: string) {
  return `pk_${env}_${btoa(`${host}$`)}`;
}

describe('clerkFrontendApiOrigin', () => {
  it('decodes the frontend API host from a test key', () => {
    expect(
      clerkFrontendApiOrigin(key('test', 'rare-chimp-58.clerk.accounts.dev')),
    ).toBe('https://rare-chimp-58.clerk.accounts.dev');
  });

  it('decodes the frontend API host from a live key', () => {
    expect(
      clerkFrontendApiOrigin(key('live', 'clerk.grandprixpicks.com')),
    ).toBe('https://clerk.grandprixpicks.com');
  });

  it('returns null when the key is missing', () => {
    expect(clerkFrontendApiOrigin(undefined)).toBeNull();
    expect(clerkFrontendApiOrigin('')).toBeNull();
  });

  it('returns null for a key without the publishable prefix', () => {
    expect(clerkFrontendApiOrigin('sk_test_something')).toBeNull();
  });

  it('returns null when the payload is not base64', () => {
    expect(clerkFrontendApiOrigin('pk_test_!!!not base64!!!')).toBeNull();
  });

  it('returns null when the decoded value is not a bare host', () => {
    expect(
      clerkFrontendApiOrigin(key('test', 'https://example.com/path')),
    ).toBeNull();
    expect(clerkFrontendApiOrigin(key('test', 'localhost'))).toBeNull();
  });
});
