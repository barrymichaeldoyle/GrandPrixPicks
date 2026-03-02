import { describe, expect, it } from 'vitest';

import { resolveH2HSessionsToUpdate } from './h2h';

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
