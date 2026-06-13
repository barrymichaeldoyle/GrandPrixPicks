import { SignInButton, useAuth } from '@clerk/react';
import { Users } from 'lucide-react';
import type { PropsWithChildren } from 'react';

import { SeasonLeaderboardLayout } from './board';
import { LeaderboardContentLoader } from './rows';
import type { GameMode, LeaderboardEntry } from './types';

export function FollowingGuard({ children }: PropsWithChildren) {
  const { isSignedIn, isLoaded } = useAuth();

  if (!isLoaded) {
    return <LeaderboardContentLoader />;
  }

  if (!isSignedIn) {
    return (
      <div className="rounded-xl border border-border bg-surface p-8 text-center">
        <Users className="mx-auto mb-4 h-16 w-16 text-text-muted" />
        <h2 className="mb-2 text-xl font-semibold text-text">
          Sign in to see your friends
        </h2>
        <p className="mb-4 text-text-muted">
          Follow other players to compete against them on a private leaderboard.
        </p>
        <SignInButton mode="modal">
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent/90"
          >
            Sign In
          </button>
        </SignInButton>
      </div>
    );
  }

  return children;
}

export function FollowingSeasonContent({
  data,
  gameMode,
}: {
  data:
    | {
        entries: LeaderboardEntry[];
        totalCount: number;
        hasMore: boolean;
      }
    | undefined;
  gameMode: GameMode;
}) {
  if (data === undefined) {
    return <LeaderboardContentLoader />;
  }

  if (data.entries.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-surface p-8 text-center">
        <Users className="mx-auto mb-4 h-16 w-16 text-text-muted" />
        <h2 className="mb-2 text-xl font-semibold text-text">
          No one here yet
        </h2>
        <p className="mb-4 text-text-muted">
          Follow other players from their profile to see them on this
          leaderboard.
        </p>
        <p className="text-sm text-text-muted">
          Browse the global leaderboard to find players to follow.
        </p>
      </div>
    );
  }

  return (
    <SeasonLeaderboardLayout
      entries={data.entries}
      hasMore={data.hasMore}
      totalCount={data.totalCount}
      gameMode={gameMode}
      isLoadingMore={false}
      onLoadMore={() => {}}
    />
  );
}
