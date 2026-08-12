import { api } from '@convex-generated/api';
import type { Id } from '@convex-generated/dataModel';
import { useMutation } from 'convex/react';
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
}

export function FollowButton({
  followeeId,
  source = 'follow_button',
  isFollowing: isFollowingProp,
}: FollowButtonProps) {
  const queriedIsFollowing = useQuery(
    api.follows.isFollowing,
    isFollowingProp === undefined ? { followeeId } : 'skip',
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

  if (isFollowing === undefined) {
    return null;
  }

  async function handleClick(e: MouseEvent<HTMLButtonElement>) {
    e.preventDefault();
    e.stopPropagation();
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

  const buttonClass =
    'inline-flex min-w-[7rem] items-center justify-start gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors';

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
        <span className="relative flex h-3.5 w-3.5 shrink-0 items-center justify-center">
          <span
            className={`absolute inset-0 flex items-center justify-center transition-opacity ${
              offeringUnfollow ? 'opacity-0' : 'opacity-100'
            }`}
            aria-hidden
          >
            <UserCheck className="h-3.5 w-3.5" />
          </span>
          <span
            className={`absolute inset-0 flex -translate-x-0.5 items-center justify-center transition-opacity ${
              offeringUnfollow ? 'opacity-100' : 'opacity-0'
            }`}
            aria-hidden
          >
            <User className="h-3.5 w-3.5" />
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
      <span className="flex h-3.5 w-3.5 shrink-0 items-center justify-center">
        <UserPlus className="h-3.5 w-3.5" />
      </span>
      <span className="flex-1">Follow</span>
    </button>
  );
}
