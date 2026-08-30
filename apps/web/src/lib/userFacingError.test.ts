import { describe, expect, it } from 'vitest';

import {
  toUserFacingErrorDetails,
  toUserFacingMessage,
} from './userFacingError';

const FALLBACK_MESSAGE = 'Your picks weren’t saved. Try again.';

describe('toUserFacingMessage', () => {
  it('maps known auth and race errors to friendly text', () => {
    expect(
      toUserFacingMessage(new Error('Not authenticated'), FALLBACK_MESSAGE),
    ).toBe('Your session may have expired. Please sign in again.');
    expect(
      toUserFacingMessage(new Error('Race not found'), FALLBACK_MESSAGE),
    ).toBe("This race couldn't be found.");
    expect(
      toUserFacingMessage(
        new Error('All sessions are locked for this race'),
        FALLBACK_MESSAGE,
      ),
    ).toBe(
      "All sessions for this race are already locked. You can't change predictions now.",
    );
  });

  it('keeps H2H failures specific even inside Convex server-error wrapping', () => {
    // This is the whole point of matching them ahead of the noise branch: a
    // real failure arrives as the wrapped form below, and "Something went
    // wrong" left players with no idea their Top 5 was the missing piece.
    function wrapped(serverMessage: string) {
      return new Error(
        `[CONVEX M(h2h:submitH2HPredictions)] Server Error\nUncaught Error: ${serverMessage}\n  at handler\nCalled by client\nRequest ID: 5f3c`,
      );
    }

    expect(
      toUserFacingMessage(
        wrapped('Submit your top 5 predictions first'),
        FALLBACK_MESSAGE,
      ),
    ).toBe(
      'Pick your Top 5 first, then choose who finishes ahead in each team.',
    );
    expect(
      toUserFacingMessage(
        wrapped('H2H predictions are locked for quali'),
        FALLBACK_MESSAGE,
      ),
    ).toBe('That session locked before this pick was saved.');
    expect(
      toUserFacingMessage(wrapped('All sessions are locked'), FALLBACK_MESSAGE),
    ).toBe("Every session this weekend is locked. You can't change picks now.");
  });

  it('maps network failures and uses the caller fallback for server noise', () => {
    expect(
      toUserFacingMessage(
        new Error('NetworkError when attempting fetch'),
        FALLBACK_MESSAGE,
      ),
    ).toBe("We couldn't connect. Check your internet and try again.");
    expect(
      toUserFacingMessage(
        new Error('Server Error\nRequest ID: abc123'),
        FALLBACK_MESSAGE,
      ),
    ).toBe(FALLBACK_MESSAGE);
  });

  it('returns short safe messages unchanged and hides long unknown errors', () => {
    expect(
      toUserFacingMessage(new Error('Try again later'), FALLBACK_MESSAGE),
    ).toBe('Try again later');
    expect(
      toUserFacingMessage(new Error('x'.repeat(81)), FALLBACK_MESSAGE),
    ).toBe(FALLBACK_MESSAGE);
  });

  it('handles non-Error values', () => {
    expect(toUserFacingMessage('simple', FALLBACK_MESSAGE)).toBe('simple');
    expect(toUserFacingMessage(null, FALLBACK_MESSAGE)).toBe(FALLBACK_MESSAGE);
  });

  it('marks only generic fallbacks as generic', () => {
    expect(
      toUserFacingErrorDetails(
        new Error('Server Error\nRequest ID: abc123'),
        FALLBACK_MESSAGE,
      ),
    ).toEqual({
      message: FALLBACK_MESSAGE,
      isGenericFallback: true,
    });
    expect(
      toUserFacingErrorDetails(
        new Error('NetworkError when attempting fetch'),
        FALLBACK_MESSAGE,
      ),
    ).toEqual({
      message: "We couldn't connect. Check your internet and try again.",
      isGenericFallback: false,
    });
    expect(
      toUserFacingErrorDetails(new Error('Try again later'), FALLBACK_MESSAGE),
    ).toEqual({
      message: 'Try again later',
      isGenericFallback: false,
    });
  });
});
