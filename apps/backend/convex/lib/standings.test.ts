import { describe, expect, it, vi } from 'vitest';

import { internal } from '../_generated/api';
import type { Id } from '../_generated/dataModel';
import {
  nextStandingsSyncStep,
  normalizeStandingsSyncFields,
  syncUserToStandings,
} from './standings';

function userId(id: string): Id<'users'> {
  return id as Id<'users'>;
}

describe('normalizeStandingsSyncFields', () => {
  it('drops undefined values before scheduling patches', () => {
    expect(
      normalizeStandingsSyncFields({
        username: 'driver',
        displayName: undefined,
        avatarUrl: 'https://example.com/avatar.png',
      }),
    ).toEqual({
      username: 'driver',
      avatarUrl: 'https://example.com/avatar.png',
    });
  });
});

describe('nextStandingsSyncStep', () => {
  it('advances through the standings tables in order', () => {
    expect(nextStandingsSyncStep('season_standings')).toBe(
      'h2h_season_standings',
    );
    expect(nextStandingsSyncStep('h2h_season_standings')).toBe('scores');
    expect(nextStandingsSyncStep('scores')).toBeNull();
  });
});

describe('syncUserToStandings', () => {
  it('schedules the first batched standings sync job', async () => {
    const runAfter = vi.fn().mockResolvedValue(undefined);
    const ctx = {
      scheduler: { runAfter },
    };

    await syncUserToStandings(ctx as never, userId('u1'), {
      username: 'driver',
      avatarUrl: 'https://example.com/avatar.png',
    });

    expect(runAfter).toHaveBeenCalledTimes(1);
    expect(runAfter).toHaveBeenCalledWith(
      0,
      internal.users.syncUserToStandingsBatch,
      {
        userId: userId('u1'),
        fields: {
          username: 'driver',
          avatarUrl: 'https://example.com/avatar.png',
        },
        step: 'season_standings',
        cursor: null,
      },
    );
  });

  it('does nothing when no standings fields changed', async () => {
    const runAfter = vi.fn().mockResolvedValue(undefined);
    const ctx = {
      scheduler: { runAfter },
    };

    await syncUserToStandings(ctx as never, userId('u1'), {});

    expect(runAfter).not.toHaveBeenCalled();
  });
});
