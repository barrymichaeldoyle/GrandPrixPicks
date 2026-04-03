import { describe, expect, it } from 'vitest';

import { getIdentityKeys } from './auth';

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
