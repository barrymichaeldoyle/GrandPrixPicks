import { describe, expect, it } from 'vitest';

import {
  getOpenUpcomingSessions,
  shouldDelayUpcomingPredictionBanner,
  shouldShowUpcomingH2HNudge,
} from './UpcomingPredictionBanner';

describe('shouldDelayUpcomingPredictionBanner', () => {
  it('delays the top 5 nudge during the opening quiet period', () => {
    const now = Date.now();

    expect(
      shouldDelayUpcomingPredictionBanner({
        predictionOpenAt: now - 60_000,
        shouldShowTop5Nudge: true,
        shouldShowH2HNudge: false,
        now,
      }),
    ).toBe(true);
  });

  it('does not delay the h2h nudge after top 5 is complete', () => {
    const now = Date.now();

    expect(
      shouldDelayUpcomingPredictionBanner({
        predictionOpenAt: now - 60_000,
        shouldShowTop5Nudge: false,
        shouldShowH2HNudge: true,
        now,
      }),
    ).toBe(false);
  });

  it('does not delay once the quiet period has passed', () => {
    const now = Date.now();
    const oneDayAndOneMinuteAgo = now - (24 * 60 * 60 * 1000 + 60_000);

    expect(
      shouldDelayUpcomingPredictionBanner({
        predictionOpenAt: oneDayAndOneMinuteAgo,
        shouldShowTop5Nudge: true,
        shouldShowH2HNudge: false,
        now,
      }),
    ).toBe(false);
  });
});

describe('shouldShowUpcomingH2HNudge', () => {
  it('shows when top5 exists and h2h is incomplete', () => {
    expect(
      shouldShowUpcomingH2HNudge({
        hasAnyTop5Predictions: true,
        hasCompleteH2H: false,
      }),
    ).toBe(true);
  });

  it('does not show when there are no top5 picks yet', () => {
    expect(
      shouldShowUpcomingH2HNudge({
        hasAnyTop5Predictions: false,
        hasCompleteH2H: false,
      }),
    ).toBe(false);
  });

  it('does not show when h2h is already complete', () => {
    expect(
      shouldShowUpcomingH2HNudge({
        hasAnyTop5Predictions: true,
        hasCompleteH2H: true,
      }),
    ).toBe(false);
  });
});

describe('getOpenUpcomingSessions', () => {
  it('excludes locked sprint sessions from the required session set', () => {
    const now = Date.now();

    expect(
      getOpenUpcomingSessions({
        hasSprint: true,
        now,
        lockAtBySession: {
          sprint_quali: now - 1,
          sprint: now + 60_000,
          quali: now + 120_000,
          race: now + 180_000,
        },
      }),
    ).toEqual(['sprint', 'quali', 'race']);
  });

  it('returns an empty list once all remaining sessions are locked', () => {
    const now = Date.now();

    expect(
      getOpenUpcomingSessions({
        hasSprint: false,
        now,
        lockAtBySession: {
          quali: now - 120_000,
          race: now - 60_000,
        },
      }),
    ).toEqual([]);
  });
});
