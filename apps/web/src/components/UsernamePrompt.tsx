import { api } from '@convex-generated/api';
import { useMutation } from 'convex/react';
import { AtSign } from 'lucide-react';
import { useId, useState, type FormEvent, type ReactNode } from 'react';

import { Button } from '@/components/Button/Button';
import { useQuery } from '@/integrations/convex/query';
import { captureAnalyticsEvent } from '@/lib/analytics';
import { toUserFacingMessage } from '@/lib/userFacingError';
import {
  isObjectionableName,
  NAME_REJECTED_MESSAGE,
} from '@grandprixpicks/shared/nameFilter';

const USERNAME_PATTERN = /^[a-z0-9_-]{3,30}$/;

/**
 * Asks a player without a username to choose one, on their saved card.
 *
 * Sign-up stopped asking for a username on 2026-11-19, so the shortest path
 * from a finished card to a saved one is email and a code. The username is
 * asked here instead, after the picks are safe: until one is set the player
 * reads as Anonymous on every board and has no profile link.
 *
 * Once the viewer has a username (every player who signed up before that
 * date) it renders `children` instead: one ask on a saved card at a time.
 */
export function UsernamePrompt({
  surface,
  children = null,
}: {
  surface: string;
  children?: ReactNode;
}) {
  const me = useQuery(api.users.me, {});
  const updateProfile = useMutation(api.users.updateProfile);
  const [value, setValue] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const inputId = useId();
  const errorId = useId();

  if (!me) {
    return null;
  }
  if (me.username) {
    return children;
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    const username = value.trim().toLowerCase();
    if (!USERNAME_PATTERN.test(username)) {
      setError('3 to 30 characters: lowercase letters, numbers, - and _ only.');
      return;
    }
    if (isObjectionableName(username)) {
      setError(NAME_REJECTED_MESSAGE);
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await updateProfile({ username });
      captureAnalyticsEvent('username_chosen', { surface });
      // The query updates and this unmounts.
    } catch (caught) {
      setError(
        toUserFacingMessage(caught, 'Your username wasn’t saved. Try again.'),
      );
      setSaving(false);
    }
  }

  return (
    <form
      onSubmit={(event) => void submit(event)}
      className="mt-5 border-t border-border pt-4"
      data-testid="username-prompt"
      noValidate
    >
      <label htmlFor={inputId} className="block text-sm text-text">
        Choose a username for the leaderboards
      </label>
      <div className="mt-2 flex flex-wrap gap-2">
        <div className="flex min-w-0 flex-1 basis-48 items-center rounded-sm border border-border bg-page focus-within:border-accent focus-within:ring-1 focus-within:ring-accent">
          <AtSign
            className="ml-2.5 h-4 w-4 shrink-0 text-text-muted"
            aria-hidden
          />
          <input
            id={inputId}
            type="text"
            value={value}
            onChange={(event) => {
              setValue(event.target.value);
              setError(null);
            }}
            autoComplete="username"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            maxLength={30}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? errorId : undefined}
            className="min-h-9 w-full min-w-0 bg-transparent px-2 text-base text-text placeholder:text-text-muted/60 focus:outline-none sm:text-sm pointer-coarse:min-h-11"
            placeholder="username"
          />
        </div>
        <Button type="submit" size="md" loading={saving}>
          Save
        </Button>
      </div>
      {error ? (
        <p id={errorId} role="alert" className="mt-2 text-sm text-error">
          {error}
        </p>
      ) : null}
    </form>
  );
}
