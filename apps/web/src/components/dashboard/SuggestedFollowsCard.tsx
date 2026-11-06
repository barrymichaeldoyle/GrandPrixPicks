import { api } from '@convex-generated/api';
import { useQuery } from '@/integrations/convex/query';
import { useState } from 'react';
import { UserPlus } from 'lucide-react';
import { Link } from '@tanstack/react-router';
import { reasonText } from '@grandprixpicks/shared/follows';

import { Avatar } from '@/components/Avatar';
import { FollowButton } from '@/components/FollowButton';

export type Suggestion = NonNullable<
  ReturnType<
    typeof useQuery<typeof api.follows.getSuggestedLeagueMembersToFollow>
  >
>[number];

export { reasonText };

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

/** One row of the card, whichever query it came from. */
type CardRow = {
  _id: Suggestion['_id'];
  username: string;
  displayName: string;
  avatarUrl?: string;
  reason: string;
  /** League suggestions carry these; the season-board fallback has none. */
  mutuals: Suggestion | null;
};

export function SuggestedFollowsCard() {
  const suggested = useQuery(api.follows.getSuggestedLeagueMembersToFollow, {
    limit: 3,
  });
  // For the player in no league, who used to get no card at all: the rows
  // either side of them on the season board.
  const nearYou = useQuery(api.follows.getPlayersNearYou, { limit: 3 });

  const liveRows: CardRow[] | undefined =
    suggested === undefined || nearYou === undefined
      ? undefined
      : suggested.length > 0
        ? suggested.map((user) => ({
            _id: user._id,
            username: user.username,
            displayName: user.displayName,
            avatarUrl: user.avatarUrl,
            reason: reasonText(user),
            mutuals: user,
          }))
        : (nearYou ?? []).map((user) => ({
            _id: user._id,
            username: user.username,
            displayName: user.displayName,
            avatarUrl: user.avatarUrl,
            reason: `P${user.rank} · ${user.points.toLocaleString()} pts`,
            mutuals: null,
          }));

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
  const [pinned, setPinned] = useState<CardRow[] | undefined>(undefined);
  // React permits a guarded render-time state adjustment. Capturing this
  // synchronously avoids painting a blank card for one frame when the first
  // query result arrives, while never accepting reactive replacements.
  if (pinned === undefined && liveRows && liveRows.length > 0) {
    setPinned(liveRows);
  }
  const rows = pinned ?? liveRows;

  if (!rows || rows.length === 0) {
    return null;
  }

  return (
    <div className="rounded-lg border border-border bg-surface p-4">
      <div className="mb-3 flex items-center gap-2">
        <UserPlus className="h-4 w-4 text-accent" aria-hidden />
        <h2 className="text-xs font-medium text-text-muted">
          Players to follow
        </h2>
      </div>

      {/* Rows are separated by rule rather than gap: three name/reason pairs
          stacked on plain background read as one block of text otherwise. */}
      <ul className="-my-2 divide-y divide-border/40">
        {/* One line, never two. This used to wrap the button onto its own row
            below a fixed-width name column, which doubled a three-row card's
            height for no reason a compact list needed. The name/reason column
            is `min-w-0` so it truncates instead of forcing the row to wrap or
            overflow, and the button is the `compact` size so it fits beside
            it at every width this card renders at, rail included. */}
        {rows.map((user) => (
          <li key={user._id} className="flex items-center gap-2.5 py-2">
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

            <div className="min-w-0 flex-1">
              <Link
                to="/p/$username"
                params={{ username: user.username }}
                search={{ from: undefined, fromLabel: undefined }}
                className="block truncate text-sm leading-tight font-semibold text-text hover:text-accent focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:outline-none"
              >
                {user.displayName}
              </Link>

              <div className="mt-0.5 flex min-w-0 items-center gap-1.5">
                {user.mutuals ? <MutualAvatars user={user.mutuals} /> : null}
                <p className="min-w-0 truncate text-xs leading-snug text-text-muted">
                  {user.reason}
                </p>
              </div>
            </div>

            <div className="shrink-0">
              <FollowButton
                followeeId={user._id}
                source="suggested_follows"
                compact
              />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
