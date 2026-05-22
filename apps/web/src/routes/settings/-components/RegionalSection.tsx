import { Globe } from 'lucide-react';

import { SettingsSection } from '../../../components/SettingsSection';
import { TimeFormatSelect } from '../../../components/TimeFormatSelect';
import { TimezoneSelect } from '../../../components/TimezoneSelect';

export function RegionalSection({
  timezone,
  locale,
  loading,
  onUpdate,
}: {
  timezone?: string;
  locale?: string;
  loading: boolean;
  onUpdate: (settings: {
    timezone?: string | null;
    locale?: string | null;
  }) => void;
}) {
  const displayTimezone =
    timezone ??
    (typeof Intl !== 'undefined'
      ? Intl.DateTimeFormat().resolvedOptions().timeZone
      : 'UTC');

  function handleTimezoneChange(value: string | undefined) {
    onUpdate({ timezone: value === undefined ? null : value });
  }

  function handleLocaleChange(value: string | undefined) {
    onUpdate({ locale: value === undefined ? null : value });
  }

  return (
    <SettingsSection
      id="regional"
      title="Regional"
      icon={<Globe className="h-5 w-5 text-text-muted" />}
    >
      <div className="space-y-4">
        <p className="text-sm text-text-muted">
          The app always uses your browser&apos;s timezone and time format.
          <br />
          These settings only affect how times appear in email notifications.
        </p>

        <div className="grid gap-4 md:grid-cols-2">
          {loading ? (
            <>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="block text-sm font-medium text-text">
                    Timezone
                  </label>
                  <div className="h-3.5 w-24 animate-pulse rounded bg-surface-muted" />
                </div>
                <div className="h-10 animate-pulse rounded-lg border border-border bg-surface-muted" />
              </div>
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-text">
                  Time format
                </label>
                <div className="h-10 animate-pulse rounded-lg border border-border bg-surface-muted" />
              </div>
            </>
          ) : (
            <>
              <TimezoneSelect
                value={timezone}
                onChange={handleTimezoneChange}
              />
              <TimeFormatSelect
                value={locale}
                timezone={displayTimezone}
                onChange={handleLocaleChange}
              />
            </>
          )}
        </div>
      </div>
    </SettingsSection>
  );
}
