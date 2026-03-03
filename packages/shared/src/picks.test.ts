import { describe, expect, it } from 'vitest';

import {
  formatLockCountdown,
  getConnectedDraftStorageKey,
  getLocalRaceDraftStorageKey,
  getLockStatusViewModel,
  getWebH2HDraftStorageKey,
  getWebTop5DraftStorageKey,
} from './picks';

describe('formatLockCountdown', () => {
  it('returns Locked when the lock has passed', () => {
    expect(formatLockCountdown(0)).toBe('Locked');
    expect(formatLockCountdown(-1)).toBe('Locked');
  });

  it('formats hour-minute-second countdown for sub-day windows', () => {
    const ms = (1 * 60 * 60 + 2 * 60 + 3) * 1000;
    expect(formatLockCountdown(ms)).toBe('01h 02m 03s');
  });

  it('formats day-hour-minute countdown for multi-day windows', () => {
    const ms = (2 * 24 * 60 * 60 + 5 * 60 * 60 + 7 * 60) * 1000;
    expect(formatLockCountdown(ms)).toBe('2d 05h 07m');
  });
});

describe('getLockStatusViewModel', () => {
  it('returns open state above closing-soon threshold', () => {
    const vm = getLockStatusViewModel({
      msRemaining: 2 * 60 * 60 * 1000,
    });
    expect(vm).toMatchObject({
      badgeTone: 'success',
      isLocked: false,
      label: 'Open',
      shouldPulse: false,
      urgency: 'open',
    });
  });

  it('returns closing soon state with pulse when inside pulse window', () => {
    const vm = getLockStatusViewModel({
      msRemaining: 5 * 60 * 1000,
    });
    expect(vm).toMatchObject({
      badgeTone: 'warning',
      isLocked: false,
      label: 'Closing Soon',
      shouldPulse: true,
      urgency: 'closing_soon',
    });
  });

  it('respects blinkEverySecond in pulse mode for mobile behavior', () => {
    const evenSecond = getLockStatusViewModel({
      blinkEverySecond: true,
      msRemaining: 5 * 60 * 1000,
      nowMs: 1700000000000,
    });
    const oddSecond = getLockStatusViewModel({
      blinkEverySecond: true,
      msRemaining: 5 * 60 * 1000,
      nowMs: 1700000001000,
    });
    expect(evenSecond.shouldPulse).toBe(true);
    expect(oddSecond.shouldPulse).toBe(false);
  });

  it('returns locked state at and below zero', () => {
    const vm = getLockStatusViewModel({
      msRemaining: 0,
    });
    expect(vm).toMatchObject({
      badgeTone: 'warning',
      isLocked: true,
      label: 'Locked',
      shouldPulse: false,
      urgency: 'locked',
    });
  });
});

describe('draft storage keys', () => {
  it('builds stable connected and local mobile keys', () => {
    expect(getConnectedDraftStorageKey('australia-2026', 'quali')).toBe(
      'gpp:draft:connected:australia-2026:quali',
    );
    expect(getLocalRaceDraftStorageKey('australia-2026')).toBe(
      'gpp:draft:local:australia-2026',
    );
  });

  it('builds stable web keys for top5 and h2h', () => {
    expect(getWebTop5DraftStorageKey('race_123')).toBe(
      'gpp:web:top5:race_123:cascade',
    );
    expect(getWebTop5DraftStorageKey('race_123', 'sprint')).toBe(
      'gpp:web:top5:race_123:sprint',
    );
    expect(getWebH2HDraftStorageKey('race_123')).toBe(
      'gpp:web:h2h:race_123:cascade',
    );
    expect(getWebH2HDraftStorageKey('race_123', 'race')).toBe(
      'gpp:web:h2h:race_123:race',
    );
  });
});
