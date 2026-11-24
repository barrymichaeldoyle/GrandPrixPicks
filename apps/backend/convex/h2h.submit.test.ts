import { describe, expect, it } from 'vitest';

import { picksOnThisWeekend, resolveH2HSessionsToUpdate } from './h2h';

describe('resolveH2HSessionsToUpdate', () => {
  it('cascades to all sessions for first-time submit even when sessionType is provided', () => {
    expect(
      resolveH2HSessionsToUpdate({
        hasSprint: false,
        requestedSessionType: 'quali',
        hasExistingPredictionsForRace: false,
      }),
    ).toEqual(['quali', 'race']);
  });

  it('respects requested session once user already has H2H for race', () => {
    expect(
      resolveH2HSessionsToUpdate({
        hasSprint: true,
        requestedSessionType: 'sprint',
        hasExistingPredictionsForRace: true,
      }),
    ).toEqual(['sprint']);
  });

  it('cascades to all sessions when no sessionType is provided', () => {
    expect(
      resolveH2HSessionsToUpdate({
        hasSprint: true,
        hasExistingPredictionsForRace: true,
      }),
    ).toEqual(['quali', 'sprint_quali', 'sprint', 'race']);
  });
});

describe('picksOnThisWeekend', () => {
  const race = { season: 2026, round: 12 };

  it('keeps duels on this round and drops retired or other-season ones', () => {
    const picks = ['current', 'retired', 'later', 'last-season', 'legacy'];
    const matchups = [
      { season: 2026, fromRound: 10 },
      { season: 2026, fromRound: 1, toRound: 9 },
      { season: 2026, fromRound: 13 },
      { season: 2025 },
      { season: 2026 },
    ];

    expect(picksOnThisWeekend(picks, matchups, race)).toEqual([
      'current',
      'legacy',
    ]);
  });
});
