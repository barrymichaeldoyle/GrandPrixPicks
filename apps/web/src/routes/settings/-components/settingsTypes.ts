export type NotificationSettings = {
  emailPredictionReminders: boolean;
  emailResults: boolean;
  pushPredictionReminders: boolean;
  pushPredictionLockReminders: boolean;
  pushResults: boolean;
  pushSessionLocked: boolean;
  pushRevReceived: boolean;
};

export type SettingsUser = {
  avatarUrl?: string | null;
  displayName?: string | null;
  username?: string | null;
  usernameChangedAt?: number | null;
};
