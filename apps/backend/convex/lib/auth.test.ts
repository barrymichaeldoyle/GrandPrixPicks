import { describe, expect, it, vi } from 'vitest';

import {
  deriveClerkSubjectFromStoredId,
  findUserByClerkIdentity,
  getIdentityKeys,
} from './auth';

describe('getIdentityKeys', () => {
  it('prefers tokenIdentifier and keeps subject as legacy when they differ', () => {
    expect(
      getIdentityKeys({
        tokenIdentifier: 'token|123',
        subject: 'user_123',
      }),
    ).toEqual({
      primary: 'token|123',
      legacy: 'user_123',
    });
  });

  it('uses subject when tokenIdentifier is absent', () => {
    expect(
      getIdentityKeys({
        subject: 'user_456',
      }),
    ).toEqual({
      primary: 'user_456',
      legacy: null,
    });
  });

  it('does not emit a legacy key when subject matches tokenIdentifier', () => {
    expect(
      getIdentityKeys({
        tokenIdentifier: 'same',
        subject: 'same',
      }),
    ).toEqual({
      primary: 'same',
      legacy: null,
    });
  });

  it('returns null when no stable identity key exists', () => {
    expect(getIdentityKeys({})).toBeNull();
  });
});

describe('deriveClerkSubjectFromStoredId', () => {
  it('returns the legacy Clerk user id when no issuer prefix exists', () => {
    expect(deriveClerkSubjectFromStoredId('user_123')).toBe('user_123');
  });

  it('extracts the subject from a canonical token identifier', () => {
    expect(
      deriveClerkSubjectFromStoredId('https://clerk.example.com|user_123'),
    ).toBe('user_123');
  });
});

describe('findUserByClerkIdentity', () => {
  it('falls back to clerkSubject when token lookups miss', async () => {
    const user = { _id: 'u1', clerkUserId: 'issuer|user_123' };
    const unique = vi.fn(
      async ({ indexName, value }: { indexName: string; value: string }) => {
        if (indexName === 'by_clerkSubject' && value === 'user_123') {
          return user;
        }
        return null;
      },
    );

    const ctx = {
      db: {
        query: vi.fn(() => ({
          withIndex: (
            indexName: string,
            builder: (q: {
              eq: (field: string, value: string) => unknown;
            }) => unknown,
          ) => {
            let value = '';
            builder({
              eq: (_field, nextValue) => {
                value = nextValue;
                return null;
              },
            });

            return {
              unique: () => unique({ indexName, value }),
            };
          },
        })),
      },
    };

    await expect(
      findUserByClerkIdentity(ctx as never, {
        tokenIdentifier: 'https://clerk.example.com|user_123',
      }),
    ).resolves.toBe(user);
    expect(unique).toHaveBeenCalledTimes(2);
    expect(unique).toHaveBeenNthCalledWith(1, {
      indexName: 'by_clerkUserId',
      value: 'https://clerk.example.com|user_123',
    });
    expect(unique).toHaveBeenNthCalledWith(2, {
      indexName: 'by_clerkSubject',
      value: 'user_123',
    });
  });
});
