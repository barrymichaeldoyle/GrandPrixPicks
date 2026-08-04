import { api } from '@convex-generated/api';
import { useQuery } from 'convex/react';
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

  if (suggested === undefined || suggested.length === 0) {
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
      <ul className="-my-3 divide-y divide-border/40">
        {suggested.map((user) => (
          <li key={user._id} className="flex gap-2.5 py-3">
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

            {/* The follow button sits under the text, not beside it. It carries
                a 7rem min-width so "Following" cannot resize into "Unfollow" on
                hover, and in a 300px rail that left the reason line ~130px —
                every variant truncated to "Followed by Lan...". Below the text
                it gets the full column instead, and the reason survives.

                min-w-0 here and on the name is what lets a long display name
                truncate rather than widening the row. */}
            <div className="min-w-0 flex-1">
              <Link
                to="/p/$username"
                params={{ username: user.username }}
                search={{ from: undefined, fromLabel: undefined }}
                className="block truncate text-sm leading-tight font-semibold text-text hover:text-accent focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:outline-none"
              >
                {user.displayName}
              </Link>

              <div className="mt-1 flex items-center gap-1.5">
                <MutualAvatars user={user} />
                {/* Two lines before it gives up, so a long league name wraps
                    instead of being cut mid-word. */}
                <p className="line-clamp-2 min-w-0 text-xs leading-snug text-text-muted">
                  {reasonText(user)}
                </p>
              </div>

              <div className="mt-2">
                <FollowButton
                  followeeId={user._id}
                  source="suggested_follows"
                />
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
