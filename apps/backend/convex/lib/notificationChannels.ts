import type { Doc } from '../_generated/dataModel';

/** Email: opt-in — undefined means off */
export function wantsEmailPredictionReminders(user: Doc<'users'>): boolean {
  return user.emailPredictionReminders ?? false;
}

export function wantsEmailResults(user: Doc<'users'>): boolean {
  return user.emailResults ?? false;
}

/** Push: opt-out — undefined means on (user subscribed, so assume they want notifications) */
export function wantsPushPredictionReminders(user: Doc<'users'>): boolean {
  return user.pushPredictionReminders ?? true;
}

export function wantsPushResults(user: Doc<'users'>): boolean {
  return user.pushResults ?? true;
}

export function wantsPushSessionLocked(user: Doc<'users'>): boolean {
  return user.pushSessionLocked ?? true;
}

export function wantsPushRevReceived(user: Doc<'users'>): boolean {
  return user.pushRevReceived ?? true;
}
