import { api } from '@convex-generated/api';
import { useQuery } from '@/integrations/convex/query';
import { useRef } from 'react';
import { UserPlus } from 'lucide-react';
import { Link } from '@tanstack/react-router';

import { Avatar } from '@/components/Avatar';
import { FollowButton } from '@/components/FollowButton';

type Suggestion = NonNullable<
  ReturnType<
    typeof useQuery<typeof api.follows.getSuggestedLeagueMembersToFollow>
  >
>[number];

/**
 * Says why this person is worth following, strongest reason first.
 *
 * "Two people you follow follow them" beats "you are both in a league", so
 * mutuals win the line when there are any — and the backend ranks the whole
 * card that way too. Names are spelled out up to the point where they stop
 * being recognisable and start being a list.
 */
export function reasonText(user: Suggestion) {
  const { mutualFollowers, mutualFollowerCount } = user;

  if (mutualFollowerCount > 0) {
    const named = mutualFollowers.map((mutual) => mutual.displayName);
    const unnamed = mutualFollowerCount - named.length;

    if (named.length === 0) {
      return `Followed by ${mutualFollowerCount} ${mutualFollowerCount === 1 ? 'player' : 'players'} you follow`;
    }
    if (unnamed > 0) {
      return `Followed by ${named[0]} and ${mutualFollowerCount - 1} others you follow`;
    }
    if (named.length === 1) {
      return `Followed by ${named[0]}`;
    }
    return `Followed by ${named.slice(0, -1).join(', ')} and ${named.at(-1)}`;
  }

  if (user.sharedLeagueNames.length > 0) {
    return `In ${user.sharedLeagueNames.join(' and ')}`;
  }
  return `In ${user.sharedLeagueCount} leagues with you`;
}

/**
 * Overlapping avatars of the mutual followers, the way every social product
 * signals "these specific people", shown only when there is more than one —
 * a single 16px circle beside a line that already names that person is noise.
 */
function MutualAvatars({ user }: { user: Suggestion }) {
  // `?? []` against the types on purpose. `pnpm deploy` ships web to prod
  // without deploying Convex, so there is a window where this component is live
  // against a backend whose query predates `mutualFollowers`. `reasonText`
  // survives that on its own (`undefined > 0` is false); this was the one
  // access that would throw. Delete once prod has the query.
  const mutuals = user.mutualFollowers ?? [];

  if (mutuals.length < 2) {
    return null;
  }

  return (
    <span className="flex shrink-0 -space-x-1.5" aria-hidden="true">
      {mutuals.map((mutual) => (
        <span
          key={mutual.username}
          className="rounded-full ring-2 ring-surface"
        >
          <Avatar
            avatarUrl={mutual.avatarUrl}
            username={mutual.username}
            size="xs"
          />
        </span>
      ))}
    </span>
  );
}

export function SuggestedFollowsCard() {
  const suggested = useQuery(api.follows.getSuggestedLeagueMembersToFollow, {
    limit: 3,
  });

  /*
   * The query is reactive, so following someone drops them from its result and
   * pulls a replacement in behind them — the card refills itself and the list
   * never ends, which is how you give someone follow fatigue in three clicks.
   *
   * So the first non-empty result is pinned for the life of the mount: the row
   * you just followed stays put and flips to "Following", and the card runs out
   * of people the way a finite list should. Fresh suggestions arrive on the
   * next visit to the page.
   */
  const pinned = useRef<typeof suggested>(undefined);
  if (pinned.current === undefined && suggested && suggested.length > 0) {
    pinned.current = suggested;
  }
  const rows = pinned.current;

  if (!rows || rows.length === 0) {
    return null;
  }

  return (
    <div className="rounded-lg border border-border bg-surface p-4">
      <div className="mb-3 flex items-center gap-1.5">
        <UserPlus className="h-3.5 w-3.5 text-text-muted" aria-hidden />
        <h2 className="gpp-label text-text-muted">Players to follow</h2>
      </div>

      {/* Rows are separated by rule rather than gap: three name/reason pairs
          stacked on plain background read as one block of text otherwise. */}
      <ul className="-my-2.5 divide-y divide-border/40">
        {/* One wrap flow rather than a fixed stack. The button carries a 7rem
            min-width so "Following" cannot resize into "Unfollow" on hover;
            beside a 8rem-minimum text column that fits a full-width card (the
            mobile case, and the point of the row layout) but not the ~300px
            desktop rail, where it drops to its own line and the reason keeps
            the whole width instead of truncating to "Followed by Lan...".

            The text column's fixed floor is also what lets a long display name
            truncate rather than widen the row. */}
        {rows.map((user) => (
          <li
            key={user._id}
            className="flex flex-wrap items-center gap-x-2.5 gap-y-2 py-2.5"
          >
            <Link
              to="/p/$username"
              params={{ username: user.username }}
              search={{ from: undefined, fromLabel: undefined }}
              className="shrink-0 rounded-full focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:outline-none"
              tabIndex={-1}
              aria-hidden="true"
            >
              <Avatar
                avatarUrl={user.avatarUrl}
                username={user.username}
                size="sm"
              />
            </Link>

            <div className="min-w-[8rem] flex-1">
              <Link
                to="/p/$username"
                params={{ username: user.username }}
                search={{ from: undefined, fromLabel: undefined }}
                className="block truncate text-sm leading-tight font-semibold text-text hover:text-accent focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:outline-none"
              >
                {user.displayName}
              </Link>

              <div className="mt-0.5 flex items-center gap-1.5">
                <MutualAvatars user={user} />
                {/* Two lines before it gives up, so a long league name wraps
                    instead of being cut mid-word. */}
                <p className="line-clamp-2 min-w-0 text-xs leading-snug text-text-muted">
                  {reasonText(user)}
                </p>
              </div>
            </div>

            <div className="shrink-0">
              <FollowButton followeeId={user._id} source="suggested_follows" />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
