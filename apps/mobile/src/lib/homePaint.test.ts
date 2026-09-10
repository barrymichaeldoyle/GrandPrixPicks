import { describe, expect, it } from 'vitest';

import { homePaintIsPending, shouldHoldHomePaint } from './homePaint';

const ready = {
  convexEnabled: true,
  clerkEnabled: true,
  authLoaded: true,
  feed: { events: [] },
  racesLoading: false,
  recap: null,
  weekend: null,
  me: null,
  discoveryPending: false,
};

describe('homePaintIsPending', () => {
  it('does not hold when Convex is off', () => {
    expect(homePaintIsPending({ ...ready, convexEnabled: false })).toBe(false);
  });

  it('holds until Clerk has loaded a session', () => {
    expect(homePaintIsPending({ ...ready, authLoaded: false })).toBe(true);
  });

  it('holds while the feed, races, recap, weekend or me are unanswered', () => {
    expect(homePaintIsPending({ ...ready, feed: undefined })).toBe(true);
    expect(homePaintIsPending({ ...ready, racesLoading: true })).toBe(true);
    expect(homePaintIsPending({ ...ready, recap: undefined })).toBe(true);
    expect(homePaintIsPending({ ...ready, weekend: undefined })).toBe(true);
    expect(homePaintIsPending({ ...ready, me: undefined })).toBe(true);
  });

  it('treats null as an answer, not a load', () => {
    expect(homePaintIsPending(ready)).toBe(false);
  });

  it('holds an empty signed-in feed until discovery rows are ready', () => {
    expect(homePaintIsPending({ ...ready, discoveryPending: true })).toBe(true);
  });
});

describe('shouldHoldHomePaint', () => {
  it('holds only while pending and the socket might still answer', () => {
    expect(
      shouldHoldHomePaint({
        pending: true,
        timedOut: false,
        knownOffline: false,
      }),
    ).toBe(true);
  });

  it('releases on timeout so a cold start offline is not a stuck spinner', () => {
    expect(
      shouldHoldHomePaint({
        pending: true,
        timedOut: true,
        knownOffline: false,
      }),
    ).toBe(false);
  });

  it('releases once Convex has connected and then dropped, keeping last values', () => {
    expect(
      shouldHoldHomePaint({
        pending: true,
        timedOut: false,
        knownOffline: true,
      }),
    ).toBe(false);
  });
});
