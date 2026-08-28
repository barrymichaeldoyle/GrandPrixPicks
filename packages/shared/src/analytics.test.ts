import { describe, expect, it } from 'vitest';

import { analyticsFailureReason, isInternalAnalyticsEmail } from './analytics';

describe('analyticsFailureReason', () => {
  it.each([
    ['session locked', 'locked'],
    ['Unauthorized', 'unauthorized'],
    ['Invalid picks', 'validation'],
    ['Too many requests', 'rate_limited'],
    ['Network request failed', 'network'],
    ['surprise', 'unknown'],
  ] as const)('normalizes %s', (message, expected) => {
    expect(analyticsFailureReason(new Error(message))).toBe(expected);
  });
});

describe('isInternalAnalyticsEmail', () => {
  it('recognizes the internal domain without exposing the address', () => {
    expect(isInternalAnalyticsEmail('Barry@BarryMichaelDoyle.com')).toBe(true);
  });

  it('does not classify customers as internal', () => {
    expect(isInternalAnalyticsEmail('fan@example.com')).toBe(false);
    expect(isInternalAnalyticsEmail(null)).toBe(false);
  });
});
