import { describe, expect, it } from 'vitest';

import { lastReviewedAt, reviewedIsoDate, reviewedStamp } from './lastReviewed';

const aug24 = Date.UTC(2026, 7, 24);
const aug28 = Date.UTC(2026, 7, 28, 9, 30);

describe('lastReviewedAt', () => {
  it('prefers the freshest live timestamp over the editorial date', () => {
    // The bug this exists for: the prose date said 24 August while the page
    // was showing news published on the 28th.
    expect(lastReviewedAt('2026-08-24', aug28)).toBe(aug28);
  });

  it('falls back to the editorial date when nothing live is newer', () => {
    expect(lastReviewedAt('2026-08-24', Date.UTC(2026, 7, 20))).toBe(aug24);
  });

  it('ignores missing and zero timestamps', () => {
    // A page with no forecast yet must not report the epoch as its date.
    expect(lastReviewedAt('2026-08-24', null, undefined, 0)).toBe(aug24);
  });

  it('takes the newest of several live inputs', () => {
    expect(
      lastReviewedAt('2026-08-01', aug24, aug28, Date.UTC(2026, 7, 26)),
    ).toBe(aug28);
  });
});

describe('formatting', () => {
  it('renders an ISO date for structured data', () => {
    expect(reviewedIsoDate(aug28)).toBe('2026-08-28');
  });

  it('renders the footer stamp in UTC, not the reader’s zone', () => {
    // Formatted locally, a late-evening UTC timestamp reads as the next day
    // for some readers and disagrees with the ISO date in the schema.
    expect(reviewedStamp(Date.UTC(2026, 7, 28, 23, 30))).toBe('28 AUG 2026');
  });
});
