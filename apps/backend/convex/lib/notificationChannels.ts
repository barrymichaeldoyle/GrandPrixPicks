import type { Doc } from '../_generated/dataModel';

export type NotificationChannel = 'none' | 'email' | 'push' | 'both';

function isNotificationChannel(value: unknown): value is NotificationChannel {
  return (
    value === 'none' ||
    value === 'email' ||
    value === 'push' ||
    value === 'both'
  );
}

function fromLegacyFlags(
  emailEnabled: boolean | undefined,
  pushEnabled: boolean | undefined,
): NotificationChannel {
  const email = emailEnabled ?? true;
  const push = pushEnabled ?? true;
  if (email && push) {
    return 'both';
  }
  if (email) {
    return 'email';
  }
  if (push) {
    return 'push';
  }
  return 'none';
}

export function includesEmail(channel: NotificationChannel): boolean {
  return channel === 'email' || channel === 'both';
}

export function includesPush(channel: NotificationChannel): boolean {
  return channel === 'push' || channel === 'both';
}

export function getPredictionReminderChannel(
  user: Doc<'users'>,
): NotificationChannel {
  if (isNotificationChannel(user.predictionReminderChannel)) {
    return user.predictionReminderChannel;
  }
  return fromLegacyFlags(user.emailReminders, user.pushReminders);
}

export function getResultsNotificationChannel(
  user: Doc<'users'>,
): NotificationChannel {
  if (isNotificationChannel(user.resultsNotificationChannel)) {
    return user.resultsNotificationChannel;
  }
  return fromLegacyFlags(user.emailResults, user.pushResults);
}
