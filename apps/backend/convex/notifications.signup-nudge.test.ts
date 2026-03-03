import { describe, expect, it } from 'vitest';

import { getSignupPredictionNudgeEligibility } from './notifications';

describe('getSignupPredictionNudgeEligibility', () => {
  it('is eligible when reminders are enabled and at least one channel is available', () => {
    const result = getSignupPredictionNudgeEligibility({
      hasPredictions: false,
      remindersEnabled: true,
      canEmail: true,
      canPush: false,
    });

    expect(result).toEqual({ eligible: true });
  });

  it('is not eligible when user already has predictions', () => {
    const result = getSignupPredictionNudgeEligibility({
      hasPredictions: true,
      remindersEnabled: true,
      canEmail: true,
      canPush: true,
    });

    expect(result).toEqual({ eligible: false, reason: 'already_predicted' });
  });

  it('is not eligible when reminders are disabled', () => {
    const result = getSignupPredictionNudgeEligibility({
      hasPredictions: false,
      remindersEnabled: false,
      canEmail: false,
      canPush: false,
    });

    expect(result).toEqual({
      eligible: false,
      reason: 'notifications_disabled',
    });
  });

  it('is not eligible when reminders are enabled but no delivery channel exists', () => {
    const result = getSignupPredictionNudgeEligibility({
      hasPredictions: false,
      remindersEnabled: true,
      canEmail: false,
      canPush: false,
    });

    expect(result).toEqual({ eligible: false, reason: 'no_channel' });
  });
});
