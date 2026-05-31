import { AlertTriangle, User } from 'lucide-react';

import { Avatar } from '@/components/Avatar';
import { Button } from '@/components/Button/Button';
import { SettingsSection } from '@/components/SettingsSection';
import { useUserDateFormat } from '@/lib/useUserDateFormat';

import type { SettingsUser } from './settingsTypes';

export function ProfileSection({
  user,
  isEditing,
  displayName,
  username,
  usernameCooldownUntil,
  isUsernameLocked,
  showUsernameConfirm,
  isSubmitting,
  error,
  onStartEditing,
  onCancelEditing,
  onDisplayNameChange,
  onUsernameChange,
  onSave,
}: {
  user: SettingsUser | null;
  isEditing: boolean;
  displayName: string;
  username: string;
  usernameCooldownUntil: number | null;
  isUsernameLocked: boolean;
  showUsernameConfirm: boolean;
  isSubmitting: boolean;
  error: string | null;
  onStartEditing: () => void;
  onCancelEditing: () => void;
  onDisplayNameChange: (value: string) => void;
  onUsernameChange: (value: string) => void;
  onSave: () => void;
}) {
  const { formatCalendarDate } = useUserDateFormat();
  const usernameChanged =
    username.trim().toLowerCase() !== (user?.username ?? '');

  return (
    <SettingsSection
      id="profile"
      title="Profile"
      icon={<User className="h-5 w-5 text-text-muted" />}
    >
      {isEditing ? (
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <Avatar
              avatarUrl={user?.avatarUrl}
              username={user?.username}
              size="lg"
            />
            <div className="min-w-0 flex-1 space-y-3">
              <div>
                <label
                  htmlFor="display-name"
                  className="mb-1 block text-sm font-medium text-text-muted"
                >
                  Display name
                </label>
                <input
                  id="display-name"
                  type="text"
                  value={displayName}
                  onChange={(event) => onDisplayNameChange(event.target.value)}
                  placeholder="Display name"
                  maxLength={50}
                  className="w-full rounded-lg border border-border bg-page px-3 py-2 text-text placeholder:text-text-muted/50 focus:border-accent focus:ring-1 focus:ring-accent focus:outline-none"
                />
              </div>
              <div>
                <label
                  htmlFor="username"
                  className="mb-1 block text-sm font-medium text-text-muted"
                >
                  Username
                </label>
                <div className="flex items-center">
                  <span
                    className="rounded-l-lg border border-r-0 border-border bg-surface-muted px-3 py-2 text-text-muted"
                    aria-hidden="true"
                  >
                    @
                  </span>
                  <input
                    id="username"
                    type="text"
                    value={username}
                    onChange={(event) => onUsernameChange(event.target.value)}
                    placeholder="username"
                    maxLength={30}
                    disabled={isUsernameLocked}
                    className="w-full rounded-r-lg border border-border bg-page px-3 py-2 text-text placeholder:text-text-muted/50 focus:border-accent focus:ring-1 focus:ring-accent focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
                  />
                </div>
                {isUsernameLocked && usernameCooldownUntil && (
                  <p
                    className="mt-1 text-sm text-text-muted"
                    suppressHydrationWarning
                  >
                    You can change your username again on{' '}
                    {formatCalendarDate(usernameCooldownUntil)}
                  </p>
                )}
              </div>
            </div>
          </div>

          {showUsernameConfirm && <UsernameWarning confirm />}
          {!isUsernameLocked && !showUsernameConfirm && usernameChanged && (
            <UsernameWarning />
          )}

          {error && (
            <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2.5 text-sm text-red-400">
              {error}
            </div>
          )}

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onCancelEditing}
              disabled={isSubmitting}
              className="px-4 py-2 text-sm font-medium text-text-muted hover:text-text"
            >
              Cancel
            </button>
            <Button size="sm" loading={isSubmitting} onClick={onSave}>
              {showUsernameConfirm ? 'Confirm Change' : 'Save'}
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Avatar
              avatarUrl={user?.avatarUrl}
              username={user?.username}
              size="md"
            />
            <div className="min-w-0">
              <p className="font-medium text-text">
                {user?.displayName ?? user?.username ?? 'Anonymous'}
              </p>
              {user?.username && (
                <p className="text-sm text-text-muted">@{user?.username}</p>
              )}
            </div>
          </div>
          <Button size="tab" variant="tab" onClick={onStartEditing}>
            Edit
          </Button>
        </div>
      )}
    </SettingsSection>
  );
}

function UsernameWarning({ confirm = false }: { confirm?: boolean }) {
  return (
    <div className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2.5">
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
      <p className="text-sm font-normal text-amber-400">
        {confirm
          ? "Changing your username will break any existing links to your profile. You won't be able to change it again for 90 days."
          : 'You can only change your username once every 90 days. Your old profile link will stop working.'}
      </p>
    </div>
  );
}
