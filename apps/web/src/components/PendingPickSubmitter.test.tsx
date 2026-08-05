import type { Id } from '@convex-generated/dataModel';
import {
  getWebH2HDraftStorageKey,
  getWebTop5DraftStorageKey,
} from '@grandprixpicks/shared/picks';
import { act } from 'react';
import type { Root } from 'react-dom/client';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { hasPendingSubmit, loadPredictionDraft } from '@/lib/predictionDrafts';

import { PendingPickSubmitter } from './PendingPickSubmitter';

(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

const RACE_ID = 'race_1' as Id<'races'>;
const DRIVERS = ['d1', 'd2', 'd3', 'd4', 'd5'] as unknown as Id<'drivers'>[];

const convexAuth = { isLoading: false, isAuthenticated: false };
const top5Spy = vi.fn().mockResolvedValue(null);
const h2hSpy = vi.fn().mockResolvedValue(null);
const gateSpy = vi.fn();

vi.mock('@/lib/analytics', () => ({ captureAnalyticsEvent: () => {} }));

vi.mock('@/integrations/clerk/auth-curtain', () => ({
  useAuthCurtainGate: (ready: boolean) => gateSpy(ready),
}));

vi.mock('convex/react', () => ({
  useConvexAuth: () => convexAuth,
  useMutation: (name: string) =>
    name === 'predictions:submitPrediction' ? top5Spy : h2hSpy,
}));

vi.mock('@convex-generated/api', () => ({
  api: {
    predictions: { submitPrediction: 'predictions:submitPrediction' },
    h2h: { submitH2HPredictions: 'h2h:submitH2HPredictions' },
  },
}));

const TOP5_KEY = getWebTop5DraftStorageKey(RACE_ID);
const H2H_KEY = getWebH2HDraftStorageKey(RACE_ID);

function seedTop5(picks: Id<'drivers'>[] = DRIVERS) {
  window.localStorage.setItem(TOP5_KEY, JSON.stringify({ picks }));
  window.sessionStorage.setItem(`${TOP5_KEY}:pending-submit`, '1');
}

function seedH2H(selections: Record<string, string> = { m1: 'd1', m2: 'd2' }) {
  window.localStorage.setItem(H2H_KEY, JSON.stringify({ selections }));
  window.sessionStorage.setItem(`${H2H_KEY}:pending-submit`, '1');
}

describe('PendingPickSubmitter', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
    top5Spy.mockClear().mockResolvedValue(null);
    h2hSpy.mockClear().mockResolvedValue(null);
    gateSpy.mockClear();
    convexAuth.isAuthenticated = false;
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  async function render() {
    await act(async () => {
      root.render(<PendingPickSubmitter />);
    });
    // Let the drain loop's awaits settle.
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });
  }

  it('submits both stranded drafts once auth lands, then clears them', async () => {
    seedTop5();
    seedH2H();
    convexAuth.isAuthenticated = true;

    await render();

    expect(top5Spy).toHaveBeenCalledWith({
      raceId: RACE_ID,
      picks: DRIVERS,
      sessionType: undefined,
    });
    expect(h2hSpy).toHaveBeenCalledWith({
      raceId: RACE_ID,
      picks: [
        { matchupId: 'm1', predictedWinnerId: 'd1' },
        { matchupId: 'm2', predictedWinnerId: 'd2' },
      ],
      sessionType: undefined,
    });
    expect(hasPendingSubmit(TOP5_KEY)).toBe(false);
    expect(hasPendingSubmit(H2H_KEY)).toBe(false);
    expect(loadPredictionDraft(TOP5_KEY)).toBeNull();
    expect(loadPredictionDraft(H2H_KEY)).toBeNull();
  });

  it('does nothing at all while signed out', async () => {
    seedTop5();
    seedH2H();

    await render();

    expect(top5Spy).not.toHaveBeenCalled();
    expect(h2hSpy).not.toHaveBeenCalled();
    // The picks must survive for the picker to restore.
    expect(hasPendingSubmit(TOP5_KEY)).toBe(true);
    expect(loadPredictionDraft(TOP5_KEY)).not.toBeNull();
  });

  it('carries the session type through for a per-session draft', async () => {
    const key = getWebTop5DraftStorageKey(RACE_ID, 'sprint');
    window.localStorage.setItem(key, JSON.stringify({ picks: DRIVERS }));
    window.sessionStorage.setItem(`${key}:pending-submit`, '1');
    convexAuth.isAuthenticated = true;

    await render();

    expect(top5Spy).toHaveBeenCalledWith({
      raceId: RACE_ID,
      picks: DRIVERS,
      sessionType: 'sprint',
    });
  });

  it('drops the intent but keeps the draft when a submit fails', async () => {
    seedTop5();
    top5Spy.mockRejectedValue(new Error('Session already locked'));
    convexAuth.isAuthenticated = true;

    await render();

    // Retrying on every page load of a locked session helps nobody, but the
    // player should still find their picks in the picker.
    expect(hasPendingSubmit(TOP5_KEY)).toBe(false);
    expect(loadPredictionDraft(TOP5_KEY)).not.toBeNull();
  });

  it('never submits an incomplete Top 5', async () => {
    seedTop5(DRIVERS.slice(0, 3));
    convexAuth.isAuthenticated = true;

    await render();

    expect(top5Spy).not.toHaveBeenCalled();
    expect(hasPendingSubmit(TOP5_KEY)).toBe(false);
    expect(loadPredictionDraft(TOP5_KEY)).not.toBeNull();
  });

  it('clears a flag whose key it cannot parse, so it cannot retry forever', async () => {
    window.sessionStorage.setItem('something:else:pending-submit', '1');
    convexAuth.isAuthenticated = true;

    await render();

    expect(
      window.sessionStorage.getItem('something:else:pending-submit'),
    ).toBeNull();
    expect(top5Spy).not.toHaveBeenCalled();
  });

  it('holds the auth curtain only while a drain is in flight', async () => {
    seedTop5();
    convexAuth.isAuthenticated = true;

    await render();

    // Starts ready (nothing known to drain), holds during, releases after.
    expect(gateSpy.mock.calls[0]?.[0]).toBe(true);
    expect(gateSpy.mock.calls.some(([ready]) => ready === false)).toBe(true);
    expect(gateSpy.mock.calls.at(-1)?.[0]).toBe(true);
  });

  it('drains once even if auth re-reports', async () => {
    seedTop5();
    convexAuth.isAuthenticated = true;

    await render();
    await act(async () => {
      root.render(<PendingPickSubmitter />);
    });

    expect(top5Spy).toHaveBeenCalledTimes(1);
  });
});
