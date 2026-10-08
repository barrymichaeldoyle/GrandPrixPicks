import { ConvexError } from 'convex/values';
import { describe, expect, it } from 'vitest';

import { OfflineSaveError, userFacingMessage } from './userFacingError';

describe('userFacingMessage', () => {
  it('reads a ConvexError from its data, not the wrapped message', () => {
    expect(
      userFacingMessage(
        new ConvexError('Predictions are locked for sprint_quali'),
        'Save failed',
      ),
    ).toBe('That session locked before your picks were saved.');
  });

  it('falls back on Convex noise instead of showing a request id', () => {
    expect(
      userFacingMessage(
        new Error(
          '[CONVEX M(predictions:submitPrediction)] [Request ID: 1] Server Error',
        ),
        'Your picks weren’t saved. Try again.',
      ),
    ).toBe('Your picks weren’t saved. Try again.');
  });

  it('says what to do when there was no connection', () => {
    expect(userFacingMessage(new OfflineSaveError(), 'Save failed')).toMatch(
      /no connection/,
    );
  });
});
