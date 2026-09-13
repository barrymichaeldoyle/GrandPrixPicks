export type NotificationSettings = {
  emailPredictionReminders: boolean;
  emailResults: boolean;
  pushPredictionReminders: boolean;
  pushPredictionLockReminders: boolean;
  pushResults: boolean;
  pushSessionLocked: boolean;
  pushNews: boolean;
  newsPushPreference: 'off' | 'pick_related' | 'all';
  notificationQuietHours: boolean;
  preferPushReminders: boolean;
};

export type SettingsUser = {
  avatarUrl?: string | null;
  displayName?: string | null;
  username?: string | null;
  usernameChangedAt?: number | null;
};
