import { useMutation, useQuery } from 'convex/react';
import { User, UserCheck, UserPlus } from 'lucide-react';
import { useState } from 'react';

import { api } from '../../convex/_generated/api';
import type { Id } from '../../convex/_generated/dataModel';

interface FollowButtonProps {
  followeeId: Id<'users'>;
}

export function FollowButton({ followeeId }: FollowButtonProps) {
  const isFollowing = useQuery(api.follows.isFollowing, { followeeId });
  const followMutation = useMutation(api.follows.follow);
  const unfollowMutation = useMutation(api.follows.unfollow);
  const [optimistic, setOptimistic] = useState<boolean | null>(null);
  const [isHovered, setIsHovered] = useState(false);

  const following = optimistic ?? isFollowing;

  if (isFollowing === undefined) {
    return null;
  }

  const handleClick = async () => {
    const willFollow = !following;
    setOptimistic(willFollow);
    try {
      if (willFollow) {
        await followMutation({ followeeId });
      } else {
        await unfollowMutation({ followeeId });
      }
    } catch {
      setOptimistic(null);
    }
  };

  const buttonClass =
    'inline-flex min-w-[7rem] items-center justify-start gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors';

  if (following) {
    return (
      <button
        type="button"
        onClick={() => void handleClick()}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className={`${buttonClass} ${
          isHovered
            ? 'border border-red-300 bg-red-50 text-red-600 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-400'
            : 'border border-border bg-surface-muted text-text-muted'
        }`}
      >
        <span className="relative flex h-3.5 w-3.5 shrink-0 items-center justify-center">
          <span
            className={`absolute inset-0 flex items-center justify-center transition-opacity ${
              isHovered ? 'opacity-0' : 'opacity-100'
            }`}
            aria-hidden
          >
            <UserCheck className="h-3.5 w-3.5" />
          </span>
          <span
            className={`absolute inset-0 flex -translate-x-0.5 items-center justify-center transition-opacity ${
              isHovered ? 'opacity-100' : 'opacity-0'
            }`}
            aria-hidden
          >
            <User className="h-3.5 w-3.5" />
          </span>
        </span>
        <span className="flex-1">{isHovered ? 'Unfollow' : 'Following'}</span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={() => void handleClick()}
      className={`${buttonClass} border border-transparent bg-accent text-white hover:bg-accent/90`}
    >
      <span className="flex h-3.5 w-3.5 shrink-0 items-center justify-center">
        <UserPlus className="h-3.5 w-3.5" />
      </span>
      <span className="flex-1">Follow</span>
    </button>
  );
}
