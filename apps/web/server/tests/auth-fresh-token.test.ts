import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const clerk = vi.hoisted(() => ({
  verifyToken: vi.fn(),
  getToken: vi.fn(),
}));

vi.mock('@clerk/backend', () => ({
  verifyToken: clerk.verifyToken,
  createClerkClient: () => ({ sessions: { getToken: clerk.getToken } }),
}));

function encode(value: unknown) {
  return Buffer.from(JSON.stringify(value)).toString('base64url');
}

function jwtWith(payload: Record<string, unknown>) {
  return `${encode({ alg: 'RS256', kid: 'k' })}.${encode(payload)}.sig`;
}

function requestWith(sessionToken: string | null) {
  return new Request('https://grandprixpicks.com/', {
    headers: sessionToken ? { cookie: `__session=${sessionToken}` } : {},
  });
}

describe('getFreshClerkSessionToken', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-21T10:00:00Z'));
    vi.stubEnv('CLERK_SECRET_KEY', 'sk_test_fresh');
    vi.stubEnv('VITE_CLERK_PUBLISHABLE_KEY', '');
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllEnvs();
  });

  it('returns the cookie token untouched while it is live', async () => {
    const { getFreshClerkSessionToken } = await import('../lib/auth');
    const live = jwtWith({ sid: 'sess_1', exp: Date.now() / 1000 + 50 });

    expect(await getFreshClerkSessionToken(requestWith(live))).toBe(live);
    expect(clerk.verifyToken).not.toHaveBeenCalled();
    expect(clerk.getToken).not.toHaveBeenCalled();
  });

  it('mints a new token for the session an expired cookie belonged to', async () => {
    const { getFreshClerkSessionToken } = await import('../lib/auth');
    const expired = jwtWith({ sid: 'sess_1', exp: Date.now() / 1000 - 3600 });
    clerk.verifyToken.mockResolvedValue({ sid: 'sess_1' });
    clerk.getToken.mockResolvedValue({ jwt: 'fresh.jwt.value' });

    expect(await getFreshClerkSessionToken(requestWith(expired))).toBe(
      'fresh.jwt.value',
    );
    expect(clerk.verifyToken).toHaveBeenCalledWith(
      expired,
      expect.objectContaining({
        secretKey: 'sk_test_fresh',
        clockSkewInMs: 7 * 24 * 60 * 60 * 1000,
      }),
    );
    expect(clerk.getToken).toHaveBeenCalledWith('sess_1');
  });

  it('treats a token about to expire as expired', async () => {
    const { getFreshClerkSessionToken } = await import('../lib/auth');
    const nearlyOut = jwtWith({ sid: 'sess_1', exp: Date.now() / 1000 + 5 });
    clerk.verifyToken.mockResolvedValue({ sid: 'sess_1' });
    clerk.getToken.mockResolvedValue({ jwt: 'fresh.jwt.value' });

    expect(await getFreshClerkSessionToken(requestWith(nearlyOut))).toBe(
      'fresh.jwt.value',
    );
  });

  it('never trusts a session id from a token whose signature fails', async () => {
    const { getFreshClerkSessionToken } = await import('../lib/auth');
    const forged = jwtWith({ sid: 'sess_victim', exp: Date.now() / 1000 - 60 });
    clerk.verifyToken.mockRejectedValue(new Error('signature invalid'));

    expect(await getFreshClerkSessionToken(requestWith(forged))).toBeNull();
    expect(clerk.getToken).not.toHaveBeenCalled();
  });

  it('retries against the JWKS when a local key rejects the token', async () => {
    vi.stubEnv(
      'CLERK_JWT_KEY',
      '-----BEGIN PUBLIC KEY-----\\nMIIB\\n-----END PUBLIC KEY-----',
    );
    const { getFreshClerkSessionToken } = await import('../lib/auth');
    const expired = jwtWith({ sid: 'sess_1', exp: Date.now() / 1000 - 60 });
    clerk.verifyToken
      .mockRejectedValueOnce(new Error('Invalid RSA key'))
      .mockResolvedValueOnce({ sid: 'sess_1' });
    clerk.getToken.mockResolvedValue({ jwt: 'fresh.jwt.value' });

    expect(await getFreshClerkSessionToken(requestWith(expired))).toBe(
      'fresh.jwt.value',
    );
    expect(clerk.verifyToken).toHaveBeenNthCalledWith(
      1,
      expired,
      expect.objectContaining({
        jwtKey: '-----BEGIN PUBLIC KEY-----\nMIIB\n-----END PUBLIC KEY-----',
      }),
    );
    expect(clerk.verifyToken.mock.calls[1]?.[1]).not.toHaveProperty('jwtKey');
  });

  it('falls back to null when the session has ended or Clerk is down', async () => {
    const { getFreshClerkSessionToken } = await import('../lib/auth');
    const expired = jwtWith({ sid: 'sess_1', exp: Date.now() / 1000 - 60 });
    clerk.verifyToken.mockResolvedValue({ sid: 'sess_1' });
    clerk.getToken.mockRejectedValue(new Error('Session not found'));

    expect(await getFreshClerkSessionToken(requestWith(expired))).toBeNull();
  });

  it('returns null without a cookie or with one that is not a JWT', async () => {
    const { getFreshClerkSessionToken } = await import('../lib/auth');

    expect(await getFreshClerkSessionToken(requestWith(null))).toBeNull();
    expect(await getFreshClerkSessionToken(requestWith('garbage'))).toBeNull();
    expect(clerk.verifyToken).not.toHaveBeenCalled();
  });
});
