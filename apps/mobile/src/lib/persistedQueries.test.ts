import { beforeEach, describe, expect, it, vi } from 'vitest';

const store = new Map<string, string>();

vi.mock('./storage', () => ({
  getStoredStringSync: (key: string) => store.get(key),
  setStoredStringSync: (key: string, value: string) => {
    store.set(key, value);
  },
  removeStoredValueSync: (key: string) => {
    store.delete(key);
  },
  listStoredKeysSync: (prefix: string) =>
    [...store.keys()].filter((key) => key.startsWith(prefix)),
}));

import {
  MAX_ENTRIES,
  MAX_VALUE_CHARS,
  choosePersistedOrLive,
  clearPersistedQueries,
  persistedQueryKey,
  readPersistedQuery,
  writePersistedQuery,
} from './persistedQueries';

beforeEach(() => {
  store.clear();
});

function key(viewer: string, args: unknown = {}) {
  return persistedQueryKey(viewer, 'races:getCurrentWeekend', args)!;
}

describe('persisted queries', () => {
  it('round-trips a value for one viewer and keeps viewers apart', () => {
    writePersistedQuery(key('user_a'), { picks: ['NOR'] });

    expect(readPersistedQuery(key('user_a'))).toEqual({ picks: ['NOR'] });
    expect(readPersistedQuery(key('user_b'))).toBeUndefined();
  });

  it('keys by args, so each round keeps its own board', () => {
    writePersistedQuery(key('guest', { round: 15 }), 'baku');
    writePersistedQuery(key('guest', { round: 16 }), 'sepang');

    expect(readPersistedQuery(key('guest', { round: 15 }))).toBe('baku');
  });

  it('skips values too large to be worth keeping', () => {
    writePersistedQuery(key('guest'), 'x'.repeat(MAX_VALUE_CHARS + 1));

    expect(readPersistedQuery(key('guest'))).toBeUndefined();
  });

  it('skips values that are not JSON instead of throwing', () => {
    expect(() => writePersistedQuery(key('guest'), 1n)).not.toThrow();
    expect(readPersistedQuery(key('guest'))).toBeUndefined();
  });

  it('evicts the least recently written entry past the cap', () => {
    for (let round = 0; round <= MAX_ENTRIES; round += 1) {
      writePersistedQuery(key('guest', { round }), round);
    }

    expect(readPersistedQuery(key('guest', { round: 0 }))).toBeUndefined();
    expect(readPersistedQuery(key('guest', { round: MAX_ENTRIES }))).toBe(
      MAX_ENTRIES,
    );
  });

  it('clears one viewer on sign-out and leaves the others', () => {
    writePersistedQuery(key('user_a'), 'a');
    writePersistedQuery(key('guest'), 'g');

    clearPersistedQueries('user_a');

    expect(readPersistedQuery(key('user_a'))).toBeUndefined();
    expect(readPersistedQuery(key('guest'))).toBe('g');
  });
});

describe('choosePersistedOrLive', () => {
  it('fills the wait with the stored value once auth has settled', () => {
    expect(
      choosePersistedOrLive({
        live: undefined,
        stored: 'old',
        authSettled: true,
      }),
    ).toBe('old');
    expect(
      choosePersistedOrLive({ live: 'new', stored: 'old', authSettled: true }),
    ).toBe('new');
  });

  it('prefers the viewer’s stored value over a pre-auth answer', () => {
    expect(
      choosePersistedOrLive({
        live: 'signed-out shape',
        stored: 'my picks',
        authSettled: false,
      }),
    ).toBe('my picks');
  });
});
