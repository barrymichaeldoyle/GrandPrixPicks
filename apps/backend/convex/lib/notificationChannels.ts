import type { Doc } from '../_generated/dataModel';

type User = Doc<'users'>;
type Channel = 'none' | 'email' | 'push' | 'both';
function legacy(value: Channel | undefined, channel: 'email' | 'push') {
  return value === undefined
    ? undefined
    : value === channel || value === 'both';
}
export function wantsEmailPredictionReminders(user: User): boolean {
  return (
    !user.emailSuppressed &&
    (user.emailPredictionReminders ??
      legacy(user.predictionReminderChannel, 'email') ??
      user.emailReminders ??
      true)
  );
}
export function wantsEmailResults(user: User): boolean {
  return (
    !user.emailSuppressed &&
    (user.emailResults ??
      legacy(user.resultsNotificationChannel, 'email') ??
      user.emailReminders ??
      true)
  );
}
export function wantsPushPredictionReminders(user: User): boolean {
  return (
    user.pushPredictionReminders ??
    legacy(user.predictionReminderChannel, 'push') ??
    user.pushReminders ??
    true
  );
}
export function wantsPushPredictionLockReminders(user: User): boolean {
  return (
    user.pushPredictionLockReminders ??
    legacy(user.predictionReminderChannel, 'push') ??
    user.pushReminders ??
    true
  );
}
export function wantsPushResults(user: User): boolean {
  return (
    user.pushResults ??
    legacy(user.resultsNotificationChannel, 'push') ??
    user.pushReminders ??
    true
  );
}
export function wantsPushSessionLocked(user: User): boolean {
  return user.pushSessionLocked ?? false;
}
export function wantsPushRevReceived(user: User): boolean {
  return user.pushRevReceived ?? user.pushReminders ?? true;
}
export function wantsPushNews(user: User): boolean {
  return user.pushNews ?? false;
}
/** An explicit email choice always wins; implicit reminders prefer available push. */
export function shouldEmailReminder(user: User, healthyPush: boolean): boolean {
  if (!wantsEmailPredictionReminders(user)) {
    return false;
  }
  const explicit =
    user.emailPredictionReminders ??
    legacy(user.predictionReminderChannel, 'email') ??
    user.emailReminders;
  const preferPush = user.preferPushReminders ?? explicit !== true;
  return !preferPush || !healthyPush;
}
export function resolvedNotificationSettings(user: User) {
  return {
    emailPredictionReminders: wantsEmailPredictionReminders(user),
    emailResults: wantsEmailResults(user),
    pushPredictionReminders: wantsPushPredictionReminders(user),
    pushPredictionLockReminders: wantsPushPredictionLockReminders(user),
    pushResults: wantsPushResults(user),
    pushSessionLocked: wantsPushSessionLocked(user),
    pushRevReceived: wantsPushRevReceived(user),
    pushNews: wantsPushNews(user),
    notificationQuietHours: user.notificationQuietHours ?? true,
    preferPushReminders:
      user.preferPushReminders ??
      (user.emailPredictionReminders ??
        legacy(user.predictionReminderChannel, 'email') ??
        user.emailReminders) !== true,
  };
}
