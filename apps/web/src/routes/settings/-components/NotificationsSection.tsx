import { Bell } from 'lucide-react';

import { Button } from '@/components/Button/Button';
import { SettingsSection } from '@/components/SettingsSection';

import { NotificationRow } from './NotificationRow';
import type { NotificationSettings } from './settingsTypes';

const IN_APP_NOTIFICATIONS = [
  'Results & scores',
  'Session locked (when you have picks)',
  'Revs on your predictions (grouped)',
];

const PUSH_NOTIFICATION_ROWS = [
  {
    key: 'pushPredictionReminders',
    label: 'Prediction reminders',
  },
  {
    key: 'pushPredictionLockReminders',
    label: 'Picks lock soon',
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
    label: 'Revs on your predictions',
  },
] as const;

const EMAIL_NOTIFICATION_ROWS = [
  {
    key: 'emailPredictionReminders',
    label: 'Prediction reminders',
    description:
      "Sent 24h before picks lock. Not sent if you've already predicted.",
  },
  {
    key: 'emailResults',
    label: 'Results & scores',
    description: 'Sent when session results and your score are published.',
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
      icon={<Bell className="h-5 w-5 text-text-muted" />}
    >
      <div className="space-y-6 p-4">
        <NotificationGroup title="In-App">
          <p className="text-xs text-text-muted">
            Always shown in the notification bell.
          </p>
          <div className="divide-y divide-border rounded-lg border border-border px-3">
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
              <div className="flex items-center justify-between gap-4 rounded-lg border border-border px-3 py-3">
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
              <div className="divide-y divide-border rounded-lg border border-border px-3">
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
          <div className="divide-y divide-border rounded-lg border border-border px-3">
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
      <p className="text-xs font-semibold tracking-wider text-text-muted uppercase">
        {title}
      </p>
      {children}
    </div>
  );
}
