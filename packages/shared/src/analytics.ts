/** Canonical product outcomes shared by web, mobile, and PostHog insights. */
export const analyticsEvents = {
  predictionSaved: 'prediction_saved',
  predictionSaveFailed: 'prediction_save_failed',
  screenViewed: 'screen_viewed',
  purchaseCompleted: 'purchase_completed',
} as const;

export type PredictionType = 'top5' | 'h2h';
export type PredictionScope = 'cascade' | 'session';

export type AnalyticsFailureReason =
  | 'locked'
  | 'unauthorized'
  | 'validation'
  | 'network'
  | 'rate_limited'
  | 'unknown';

/** Convert unstable provider/backend messages into bounded analytics values. */
export function analyticsFailureReason(error: unknown): AnalyticsFailureReason {
  const message = error instanceof Error ? error.message.toLowerCase() : '';

  if (/lock|deadline|closed/.test(message)) return 'locked';
  if (/unauthor|forbidden|sign[ -]?in|auth/.test(message))
    return 'unauthorized';
  if (/valid|invalid|required|must |cannot|can't/.test(message)) {
    return 'validation';
  }
  if (/rate|too many|429/.test(message)) return 'rate_limited';
  if (/network|fetch|offline|timeout|timed out|connection/.test(message)) {
    return 'network';
  }
  return 'unknown';
}
