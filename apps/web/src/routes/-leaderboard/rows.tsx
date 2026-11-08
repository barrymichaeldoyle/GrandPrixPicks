import type { Id } from '@convex-generated/dataModel';
import { Link } from '@tanstack/react-router';
import { Avatar } from '@/components/Avatar';
import { FollowButton } from '@/components/FollowButton';
import { InlineLoader } from '@/components/InlineLoader';

import { useFollowColumn } from './followColumn';
import type { LeaderboardEntry } from './types';
import { podiumClasses } from '@/lib/podium';

/**
 * Every rank sits in the same fixed box, podium or not, so the numbers line up
 * down the column. A podium rank tints the box; the rest leave it bare.
 */
function RankMarker({ rank, isViewer }: { rank: number; isViewer?: boolean }) {
  const podiumClass = podiumClasses(rank);
  const tone =
    podiumClass ??
    `border-transparent ${isViewer ? 'text-accent' : 'text-text-muted'}`;

  return (
    <span
      className={`gpp-mono inline-flex h-7 w-7 items-center justify-center rounded-sm border text-sm ${tone}`}
    >
      {rank}
    </span>
  );
}

export function LeaderboardRow({ entry }: { entry: LeaderboardEntry }) {
  // Present once a viewer is signed in. Unsigned responses strip it (see
  // `toBoardEntry`). The fallback is that rule, not defensive coding.
  const name = entry.displayName ?? entry.username;
  const followedIds = useFollowColumn();

  return (
    <tr
      className={`border-b border-border transition-colors last:border-0 ${
        entry.isViewer ? 'bg-surface-elevated' : 'hover:bg-surface-elevated'
      }`}
      data-testid="leaderboard-entry"
    >
      {/* The stripe is absolutely positioned, so the viewer's cell keeps the
          same padding as every other row. Padding it to clear the stripe
          pushed their rank out of line with the column. */}
      <td
        className={`w-14 py-2.5 pr-2 pl-4 ${entry.isViewer ? 'gpp-stripe' : ''}`}
        data-testid="position"
      >
        <RankMarker rank={entry.rank} isViewer={entry.isViewer} />
      </td>
      {/* The link's hit area is the whole cell, padding included: a 15px
          name is a poor thumb target and the row already has the height. */}
      <td className="relative max-w-0 py-2.5 pr-2" data-testid="username">
        <Link
          to="/p/$username"
          params={{ username: entry.username }}
          search={{ from: undefined, fromLabel: undefined }}
          className="flex min-w-0 items-center gap-3 font-medium text-text after:absolute after:inset-0 after:content-['']"
        >
          <Avatar avatarUrl={entry.avatarUrl} username={name} size="sm" />
          <span className="truncate">{name}</span>
          {/* Screen-reader only on a phone: the stripe and raised row already
              mark it, and the chip cost a long name its last few letters. */}
          {entry.isViewer && (
            <span className="sr-only shrink-0 rounded-sm border border-accent/50 text-xs leading-5 font-medium text-accent sm:not-sr-only sm:px-1.5">
              You
            </span>
          )}
        </Link>
      </td>
      <td className="py-2.5 pr-4 pl-2 text-right" data-testid="points">
        <span className="gpp-mono font-medium text-text">{entry.points}</span>
      </td>
      {/* The board is where a player sees who is around their rank, and it
          used to be the one place with no way to follow them: every follow
          meant opening a profile. The viewer's own row leaves the cell
          empty so the column keeps its width. */}
      {followedIds ? (
        <td className="w-11 py-2.5 pr-3 text-right sm:w-28 sm:pr-4">
          {entry.isViewer ? null : (
            <FollowButton
              followeeId={entry.userId as Id<'users'>}
              isFollowing={followedIds.has(entry.userId)}
              source="leaderboard"
              compact
              iconOnlyOnPhone
            />
          )}
        </td>
      ) : null}
    </tr>
  );
}

export function LeaderboardContentLoader() {
  return (
    <div className="py-15.25">
      <InlineLoader />
    </div>
  );
}
