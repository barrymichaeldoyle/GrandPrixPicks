import { beforeEach, describe, expect, it, vi } from 'vitest';

// Back the storage layer with an in-memory map so these tests never touch MMKV.
const store = new Map<string, unknown>();

vi.mock('./storage', () => ({
  getStoredJson: vi.fn(async (key: string) => store.get(key) ?? null),
  setStoredJson: vi.fn(async (key: string, value: unknown) => {
    store.set(key, value);
  }),
  removeStoredValue: vi.fn(async (key: string) => {
    store.delete(key);
  }),
  listStoredKeys: vi.fn(async (prefix: string) =>
    [...store.keys()].filter((key) => key.startsWith(prefix)),
  ),
}));

import {
  clearConnectedDraft,
  listPendingDrafts,
  loadConnectedDraft,
  patchConnectedDraft,
  saveConnectedDraft,
} from './picksDrafts';

beforeEach(() => {
  store.clear();
});

describe('connected draft round-trip', () => {
  it('saves and loads a draft for a race/session pair', async () => {
    await saveConnectedDraft('monaco-gp', 'race', {
      h2hByMatchup: { m1: 'VER' },
      top5: ['VER', 'NOR'],
      updatedAt: '2026-05-01T00:00:00.000Z',
    });

    const loaded = await loadConnectedDraft('monaco-gp', 'race');
    expect(loaded?.top5).toEqual(['VER', 'NOR']);
    expect(loaded?.h2hByMatchup).toEqual({ m1: 'VER' });
  });

  it('keys drafts independently per session', async () => {
    await saveConnectedDraft('monaco-gp', 'race', {
      h2hByMatchup: {},
      top5: ['VER'],
      updatedAt: '2026-05-01T00:00:00.000Z',
    });

    expect(await loadConnectedDraft('monaco-gp', 'quali')).toBeNull();
  });

  it('clears a draft', async () => {
    await saveConnectedDraft('monaco-gp', 'race', {
      h2hByMatchup: {},
      top5: ['VER'],
      updatedAt: '2026-05-01T00:00:00.000Z',
    });
    await clearConnectedDraft('monaco-gp', 'race');

    expect(await loadConnectedDraft('monaco-gp', 'race')).toBeNull();
  });
});

describe('patchConnectedDraft merge semantics', () => {
  it('preserves the H2H half when only top5 is patched', async () => {
    await saveConnectedDraft('monaco-gp', 'race', {
      h2hByMatchup: { m1: 'VER' },
      top5: ['VER'],
      updatedAt: '2026-05-01T00:00:00.000Z',
    });

    await patchConnectedDraft('monaco-gp', 'race', { top5: ['NOR', 'LEC'] });

    const loaded = await loadConnectedDraft('monaco-gp', 'race');
    expect(loaded?.top5).toEqual(['NOR', 'LEC']);
    expect(loaded?.h2hByMatchup).toEqual({ m1: 'VER' });
  });

  it('preserves the top5 half when only H2H is patched', async () => {
    await saveConnectedDraft('monaco-gp', 'race', {
      h2hByMatchup: { m1: 'VER' },
      top5: ['VER'],
      updatedAt: '2026-05-01T00:00:00.000Z',
    });

    await patchConnectedDraft('monaco-gp', 'race', {
      h2hByMatchup: { m2: 'LEC' },
    });

    const loaded = await loadConnectedDraft('monaco-gp', 'race');
    expect(loaded?.top5).toEqual(['VER']);
    expect(loaded?.h2hByMatchup).toEqual({ m2: 'LEC' });
  });

  it('creates a fresh draft when none exists', async () => {
    await patchConnectedDraft('monaco-gp', 'race', { top5: ['VER'] });

    const loaded = await loadConnectedDraft('monaco-gp', 'race');
    expect(loaded?.top5).toEqual(['VER']);
    expect(loaded?.h2hByMatchup).toEqual({});
  });

  it('drops the stored draft entirely once both halves are empty', async () => {
    await saveConnectedDraft('monaco-gp', 'race', {
      h2hByMatchup: { m1: 'VER' },
      top5: ['VER'],
      updatedAt: '2026-05-01T00:00:00.000Z',
    });

    await patchConnectedDraft('monaco-gp', 'race', {
      h2hByMatchup: {},
      top5: [],
    });

    expect(await loadConnectedDraft('monaco-gp', 'race')).toBeNull();
  });
});

describe('listPendingDrafts', () => {
  it('returns only drafts made while signed out', async () => {
    await patchConnectedDraft('monaco-gp', 'race', {
      top5: ['VER'],
      awaitingAccount: true,
    });
    await patchConnectedDraft('monaco-gp', 'quali', {
      top5: ['NOR'],
      awaitingAccount: false,
    });

    const pending = await listPendingDrafts();
    expect(pending.map((draft) => draft.session)).toEqual(['race']);
  });

  it('leaves unflagged drafts alone, since they predate the flag', async () => {
    await saveConnectedDraft('monaco-gp', 'race', {
      h2hByMatchup: {},
      top5: ['VER'],
      updatedAt: '2026-05-01T00:00:00.000Z',
    });

    expect(await listPendingDrafts()).toEqual([]);
  });

  it('keeps the flag through a patch that does not set it', async () => {
    await patchConnectedDraft('monaco-gp', 'race', {
      top5: ['VER'],
      awaitingAccount: true,
    });
    await patchConnectedDraft('monaco-gp', 'race', {
      h2hByMatchup: { m1: 'VER' },
    });

    const pending = await listPendingDrafts();
    expect(pending).toHaveLength(1);
    expect(pending[0]?.h2hByMatchup).toEqual({ m1: 'VER' });
  });
});
