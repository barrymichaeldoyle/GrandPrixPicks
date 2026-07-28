import { SignInButton, useAuth } from '@clerk/react';
import { Users } from 'lucide-react';
import type { PropsWithChildren } from 'react';

import { SeasonLeaderboardLayout } from './board';
import { LeaderboardContentLoader } from './rows';
import type { GameMode, LeaderboardEntry } from './types';
import { NoticeCard } from '@/components/NoticeCard';

export function FollowingGuard({ children }: PropsWithChildren) {
  const { isSignedIn, isLoaded } = useAuth();

  if (!isLoaded) {
    return <LeaderboardContentLoader />;
  }

  if (!isSignedIn) {
    return (
      <NoticeCard
        icon={Users}
        title="Sign in to see your friends"
        description="Follow other players to compete against them on a private leaderboard."
        action={
          <SignInButton mode="modal">
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent/90"
            >
              Sign In
            </button>
          </SignInButton>
        }
      />
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
      <NoticeCard
        icon={Users}
        title="No one here yet"
        description="Follow other players from their profile to see them on this leaderboard."
        action={
          <p className="text-sm text-text-muted">
            Browse the global leaderboard to find players to follow.
          </p>
        }
      />
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
