import { describe, expect, it } from 'vitest';

import { shouldQueueIncompleteH2HNudge } from './predictions';

describe('shouldQueueIncompleteH2HNudge', () => {
  it('queues when Top 5 just transitioned to complete and no nudge was queued', () => {
    expect(
      shouldQueueIncompleteH2HNudge({
        raceStatus: 'upcoming',
        requiredSessionCount: 4,
        preSessionCount: 3,
        postSessionCount: 4,
        alreadyQueued: false,
      }),
    ).toBe(true);
  });

  it('does not queue when race is not upcoming', () => {
    expect(
      shouldQueueIncompleteH2HNudge({
        raceStatus: 'locked',
        requiredSessionCount: 2,
        preSessionCount: 1,
        postSessionCount: 2,
        alreadyQueued: false,
      }),
    ).toBe(false);
  });

  it('does not queue for resubmits once weekend was already complete', () => {
    expect(
      shouldQueueIncompleteH2HNudge({
        raceStatus: 'upcoming',
        requiredSessionCount: 2,
        preSessionCount: 2,
        postSessionCount: 2,
        alreadyQueued: false,
      }),
    ).toBe(false);
  });

  it('does not queue when dedupe key is already set', () => {
    expect(
      shouldQueueIncompleteH2HNudge({
        raceStatus: 'upcoming',
        requiredSessionCount: 4,
        preSessionCount: 3,
        postSessionCount: 4,
        alreadyQueued: true,
      }),
    ).toBe(false);
  });
});
