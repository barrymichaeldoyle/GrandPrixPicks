import { Bell } from 'lucide-react';

import { Button } from '@/components/Button/Button';
import { SettingsSection } from '@/components/SettingsSection';

import { NotificationRow } from './NotificationRow';
import type { NotificationSettings } from './settingsTypes';

const IN_APP_NOTIFICATIONS = [
  'Results & scores',
  'Session locked (when you have picks)',
  'Reactions to your posts (grouped)',
];

const PUSH_NOTIFICATION_ROWS = [
  { key: 'pushNews', label: 'Selected news (at most once a day)' },
  {
    key: 'notificationQuietHours',
    label: 'Quiet hours for news and reactions (22:00–08:00)',
  },
  {
    key: 'pushPredictionReminders',
    label: 'Prediction reminders',
  },
  {
    key: 'pushPredictionLockReminders',
    label: 'Missing picks: two hours before session lock',
  },
  {
    key: 'pushResults',
    label: 'Results & scores',
  },
  {
    key: 'pushSessionLocked',
    label: 'Session locked',
  },
  {
    key: 'pushRevReceived',
    label: 'Reactions to your posts',
  },
] as const;

const EMAIL_NOTIFICATION_ROWS = [
  {
    key: 'preferPushReminders',
    label: 'Prefer push reminders',
    description: 'Use email reminders only when push is unavailable.',
  },
  {
    key: 'emailPredictionReminders',
    label: 'Prediction reminders',
    description:
      'Missing picks and a first-pick reminder. Turn off “Prefer push reminders” to receive both.',
  },
  {
    key: 'emailResults',
    label: 'Results & scores',
    description: 'One scoring summary after the weekend.',
  },
] as const;

export function NotificationsSection({
  settings,
  isPushSupported,
  pushPermission,
  isPushSubscribed,
  isPushLoading,
  onSubscribePush,
  onUnsubscribePush,
  onUpdateSetting,
}: {
  settings: NotificationSettings;
  isPushSupported: boolean;
  pushPermission: NotificationPermission | 'unsupported';
  isPushSubscribed: boolean;
  isPushLoading: boolean;
  onSubscribePush: () => void;
  onUnsubscribePush: () => void;
  onUpdateSetting: (patch: Partial<NotificationSettings>) => void;
}) {
  return (
    <SettingsSection
      id="notifications"
      title="Notifications"
      icon={<Bell className="h-5 w-5 text-accent" />}
    >
      <div className="space-y-6">
        <NotificationGroup title="In-App">
          <p className="text-xs text-text-muted">
            Always shown in the notification bell.
          </p>
          <div className="divide-y divide-border bg-page px-3">
            {IN_APP_NOTIFICATIONS.map((label) => (
              <div key={label} className="py-3 text-sm text-text">
                {label}
              </div>
            ))}
          </div>
        </NotificationGroup>

        {isPushSupported && (
          <NotificationGroup title="Push">
            {pushPermission === 'denied' ? (
              <p className="text-xs text-text-muted">
                Notifications are blocked. Enable them in your browser or device
                settings.
              </p>
            ) : !isPushSubscribed ? (
              <div className="flex items-center justify-between gap-4 bg-page px-3 py-3">
                <p className="text-sm text-text-muted">
                  Get alerts on this device, even when the app isn&apos;t open.
                </p>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={onSubscribePush}
                  loading={isPushLoading}
                >
                  Enable
                </Button>
              </div>
            ) : (
              <div className="divide-y divide-border bg-page px-3">
                {PUSH_NOTIFICATION_ROWS.map(({ key, label }) => (
                  <NotificationRow
                    key={key}
                    label={label}
                    checked={settings[key]}
                    onChange={(value) => onUpdateSetting({ [key]: value })}
                    loading={isPushLoading}
                  />
                ))}
                <div className="flex items-center justify-between gap-4 py-3">
                  <p className="text-xs text-text-muted">
                    Removes push access for this device only.
                  </p>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={onUnsubscribePush}
                    loading={isPushLoading}
                  >
                    Disable
                  </Button>
                </div>
              </div>
            )}
          </NotificationGroup>
        )}

        <NotificationGroup title="Email">
          <div className="divide-y divide-border bg-page px-3">
            {EMAIL_NOTIFICATION_ROWS.map(({ key, label, description }) => (
              <NotificationRow
                key={key}
                label={label}
                description={description}
                checked={settings[key]}
                onChange={(value) => onUpdateSetting({ [key]: value })}
              />
            ))}
          </div>
        </NotificationGroup>
      </div>
    </SettingsSection>
  );
}

function NotificationGroup({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold tracking-label text-text-muted uppercase">
        {title}
      </p>
      {children}
    </div>
  );
}
