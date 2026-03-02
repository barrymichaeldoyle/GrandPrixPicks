import { describe, expect, it } from 'vitest';

import { toUserFacingMessage } from './userFacingError';

describe('toUserFacingMessage', () => {
  it('maps known auth and race errors to friendly text', () => {
    expect(toUserFacingMessage(new Error('Not authenticated'))).toBe(
      'Your session may have expired. Please sign in again.',
    );
    expect(toUserFacingMessage(new Error('Race not found'))).toBe(
      "This race couldn't be found.",
    );
    expect(
      toUserFacingMessage(new Error('All sessions are locked for this race')),
    ).toBe(
      "All sessions for this race are already locked. You can't change predictions now.",
    );
  });

  it('maps network/convex noise to generic recoverable messaging', () => {
    expect(
      toUserFacingMessage(new Error('NetworkError when attempting fetch')),
    ).toBe("We couldn't connect. Check your internet and try again.");
    expect(
      toUserFacingMessage(new Error('Server Error\nRequest ID: abc123')),
    ).toBe('Something went wrong. Please try again.');
  });

  it('returns short safe messages unchanged and hides long unknown errors', () => {
    expect(toUserFacingMessage(new Error('Try again later'))).toBe(
      'Try again later',
    );
    expect(toUserFacingMessage(new Error('x'.repeat(81)))).toBe(
      'Something went wrong. Please try again.',
    );
  });

  it('handles non-Error values', () => {
    expect(toUserFacingMessage('simple')).toBe('simple');
    expect(toUserFacingMessage(null)).toBe('Unknown error');
  });
});
