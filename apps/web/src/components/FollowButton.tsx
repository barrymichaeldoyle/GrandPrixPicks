import { api } from '@convex-generated/api';
import type { Id } from '@convex-generated/dataModel';
import { useConvexAuth, useMutation } from 'convex/react';
import { useQuery } from '@/integrations/convex/query';
import { User, UserCheck, UserPlus } from 'lucide-react';
import type { MouseEvent } from 'react';
import { useState } from 'react';

import { captureAnalyticsEvent } from '@/lib/analytics';

interface FollowButtonProps {
  followeeId: Id<'users'>;
  source?: string;
  /**
   * Pass this when the caller already knows the follow state (feed rows carry
   * it on the event) to skip a per-row query. Omit it and the button fetches
   * its own state.
   */
  isFollowing?: boolean;
  /**
   * Shrinks the hit area for a dense list of rows (suggested follows, a
   * followers list) where the default size forced a wrap onto its own line
   * and doubled every row's height. Same icons and copy, just less padding
   * and a lower minimum width.
   */
  compact?: boolean;
}

export function FollowButton({
  followeeId,
  source = 'follow_button',
  isFollowing: isFollowingProp,
  compact = false,
}: FollowButtonProps) {
  const { isAuthenticated } = useConvexAuth();
  const queriedIsFollowing = useQuery(
    api.follows.isFollowing,
    isAuthenticated && isFollowingProp === undefined ? { followeeId } : 'skip',
  );
  const isFollowing = isFollowingProp ?? queriedIsFollowing;
  const followMutation = useMutation(api.follows.follow);
  const unfollowMutation = useMutation(api.follows.unfollow);
  const [optimistic, setOptimistic] = useState<boolean | null>(null);
  const [isHovered, setIsHovered] = useState(false);
  /*
   * The pointer has not left since the user acted, so the button is only under
   * the cursor because they just clicked it.
   *
   * Without this the hover swap eats its own confirmation: you click Follow,
   * the cursor is still on the button, and "Following" immediately reads
   * "Unfollow" in error red — which looks like the follow did not take. The
   * swap is for *returning* to the button, so it waits for a real departure.
   */
  const [heldSinceAction, setHeldSinceAction] = useState(false);

  const following = optimistic ?? isFollowing;
  const offeringUnfollow = isHovered && !heldSinceAction;

  if (!isAuthenticated || isFollowing === undefined) {
    return null;
  }

  async function handleClick(e: MouseEvent<HTMLButtonElement>) {
    e.preventDefault();
    e.stopPropagation();
    if (!isAuthenticated) {
      return;
    }
    const willFollow = !following;
    setOptimistic(willFollow);
    setHeldSinceAction(true);
    try {
      if (willFollow) {
        await followMutation({ followeeId });
        captureAnalyticsEvent('user_followed', {
          followee_id: followeeId,
          source,
        });
      } else {
        await unfollowMutation({ followeeId });
        captureAnalyticsEvent('user_unfollowed', {
          followee_id: followeeId,
          source,
        });
      }
    } catch {
      setOptimistic(null);
    }
  }

  const buttonClass = compact
    ? 'inline-flex min-w-[5.5rem] items-center justify-start gap-1 rounded-md px-2 py-1 text-xs font-medium transition-colors'
    : 'inline-flex min-w-[7rem] items-center justify-start gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors';
  const iconClass = compact ? 'h-3 w-3' : 'h-3.5 w-3.5';
  const iconWrapClass = compact
    ? 'relative flex h-3 w-3 shrink-0 items-center justify-center'
    : 'relative flex h-3.5 w-3.5 shrink-0 items-center justify-center';

  if (following) {
    return (
      <button
        type="button"
        onClick={handleClick}
        // Pointer events, not mouse events, and only for a real mouse: a tap
        // fires the compatibility mouse events with no `mouseleave` to follow,
        // which used to leave a phone showing "Unfollow" until the next tap.
        onPointerEnter={(event) => {
          if (event.pointerType === 'mouse') {
            setIsHovered(true);
          }
        }}
        onPointerLeave={() => {
          setIsHovered(false);
          setHeldSinceAction(false);
        }}
        onBlur={() => setHeldSinceAction(false)}
        className={`${buttonClass} ${
          offeringUnfollow
            ? 'border border-error/30 bg-error/10 text-error'
            : 'border border-border bg-surface-muted text-text-muted'
        }`}
      >
        <span className={iconWrapClass}>
          <span
            className={`absolute inset-0 flex items-center justify-center transition-opacity ${
              offeringUnfollow ? 'opacity-0' : 'opacity-100'
            }`}
            aria-hidden
          >
            <UserCheck className={iconClass} />
          </span>
          <span
            className={`absolute inset-0 flex -translate-x-0.5 items-center justify-center transition-opacity ${
              offeringUnfollow ? 'opacity-100' : 'opacity-0'
            }`}
            aria-hidden
          >
            <User className={iconClass} />
          </span>
        </span>
        <span className="flex-1">
          {offeringUnfollow ? 'Unfollow' : 'Following'}
        </span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className={`${buttonClass} border border-accent/30 bg-accent-muted/35 text-accent-hover hover:bg-accent-muted/50`}
    >
      <span
        className={`flex shrink-0 items-center justify-center ${compact ? 'h-3 w-3' : 'h-3.5 w-3.5'}`}
      >
        <UserPlus className={iconClass} />
      </span>
      <span className="flex-1">Follow</span>
    </button>
  );
}
