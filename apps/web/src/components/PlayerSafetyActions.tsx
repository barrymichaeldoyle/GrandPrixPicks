import { api } from '@convex-generated/api';
import type { Id } from '@convex-generated/dataModel';
import { useConvexAuth, useMutation } from 'convex/react';
import { useState } from 'react';

import { toUserFacingMessage } from '@/lib/userFacingError';

import { Button } from './Button/Button';
import { ConfirmDialog } from './ConfirmDialog';

type Pending = 'report' | 'block' | null;

/**
 * Report and block for another player's profile (App Store guideline 1.2
 * asks for both wherever players see each other's names and photos; the web
 * profile offers the same so the two apps behave alike).
 *
 * A report goes to the support inbox. A block unfollows both ways, stops
 * either following again and hides the rest of the profile; it does not take
 * the player off leaderboards.
 */
export function PlayerSafetyActions({
  userId,
  username,
  blocked,
}: {
  userId: Id<'users'>;
  username: string | undefined;
  blocked: boolean;
}) {
  const { isAuthenticated } = useConvexAuth();
  const report = useMutation(api.moderation.reportUser);
  const block = useMutation(api.moderation.blockUser);
  const unblock = useMutation(api.moderation.unblockUser);
  const [pending, setPending] = useState<Pending>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reported, setReported] = useState(false);

  if (!isAuthenticated) {
    return null;
  }

  const name = username ? `@${username}` : 'this player';

  async function run(action: () => Promise<unknown>, onDone?: () => void) {
    setLoading(true);
    setError(null);
    try {
      await action();
      onDone?.();
      setPending(null);
    } catch (err) {
      setError(toUserFacingMessage(err, 'That did not go through. Try again.'));
    } finally {
      setLoading(false);
    }
  }

  if (blocked) {
    return (
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-sm border border-border bg-surface px-4 py-3">
        <p className="text-sm text-text-muted">You blocked {name}.</p>
        <Button
          size="sm"
          variant="secondary"
          loading={loading}
          onClick={() => void run(() => unblock({ userId }))}
        >
          Unblock
        </Button>
      </div>
    );
  }

  return (
    <div className="-mt-3 mb-6 flex gap-4">
      <Button
        size="sm"
        variant="text"
        disabled={reported}
        onClick={() => setPending('report')}
      >
        {reported ? 'Reported' : 'Report'}
      </Button>
      <Button size="sm" variant="text" onClick={() => setPending('block')}>
        Block
      </Button>

      <ConfirmDialog
        open={pending === 'report'}
        onClose={() => setPending(null)}
        onConfirm={() =>
          void run(
            () => report({ userId }),
            () => setReported(true),
          )
        }
        title={`Report ${name}?`}
        description="We'll review their username, display name and photo."
        confirmLabel="Report"
        loading={loading}
        error={error}
      />
      <ConfirmDialog
        open={pending === 'block'}
        onClose={() => setPending(null)}
        onConfirm={() => void run(() => block({ userId }))}
        title={`Block ${name}?`}
        description="You'll unfollow each other and won't see each other's activity. Neither of you can follow the other. They stay on leaderboards."
        confirmLabel="Block"
        loading={loading}
        error={error}
      />
    </div>
  );
}
