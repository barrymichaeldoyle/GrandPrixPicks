import type { Doc } from '../_generated/dataModel';

/** Email: opt-out — undefined means on */
export function wantsEmailPredictionReminders(user: Doc<'users'>): boolean {
  return user.emailPredictionReminders ?? true;
}

export function wantsEmailResults(user: Doc<'users'>): boolean {
  return user.emailResults ?? true;
}

/** Push: opt-out — undefined means on (user subscribed, so assume they want notifications) */
export function wantsPushPredictionReminders(user: Doc<'users'>): boolean {
  return user.pushPredictionReminders ?? true;
}

export function wantsPushPredictionLockReminders(user: Doc<'users'>): boolean {
  return user.pushPredictionLockReminders ?? true;
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
