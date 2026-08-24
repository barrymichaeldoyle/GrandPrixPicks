import { describe, expect, it } from 'vitest';

import { analyticsFailureReason } from './analytics';

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
