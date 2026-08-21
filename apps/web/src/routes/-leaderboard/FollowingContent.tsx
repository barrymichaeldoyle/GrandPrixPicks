import { Users } from 'lucide-react';
import type { PropsWithChildren } from 'react';

import { SeasonLeaderboardLayout } from './board';
import { LeaderboardContentLoader } from './rows';
import type { LeaderboardEntry } from './types';
import { NoticeCard } from '@/components/NoticeCard';
import { SignInActionButton } from '@/integrations/clerk/SignInActionButton';
import { useViewerSession } from '@/integrations/clerk/useViewerSession';

/**
 * `/leaderboard` is a Clerk-free route, so this guard reads the SSR-resolved
 * viewer session rather than Clerk's `useAuth`, and prompts through
 * `requestSignIn` rather than Clerk's `SignInButton`. Both of Clerk's own
 * versions need a provider that is deliberately not on this page, and threw the
 * route into its error boundary when a signed-out visitor opened this tab.
 */
export function FollowingGuard({ children }: PropsWithChildren) {
  const { isSignedIn, confirmedSignedIn } = useViewerSession();

  // Only a viewer SSR already believes is signed in has anything left to
  // confirm; an anonymous visitor never waits on Clerk here.
  if (isSignedIn && !confirmedSignedIn) {
    return <LeaderboardContentLoader />;
  }

  if (!isSignedIn) {
    return (
      <NoticeCard
        icon={Users}
        title="Sign in to see your friends"
        description="Follow other players to compete against them on a private leaderboard."
        action={<SignInActionButton size="sm">Sign In</SignInActionButton>}
      />
    );
  }

  return children;
}

export function FollowingSeasonContent({
  data,
}: {
  data:
    | {
        entries: LeaderboardEntry[];
        totalCount: number;
        hasMore: boolean;
      }
    | undefined;
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
      isLoadingMore={false}
      onLoadMore={() => {}}
    />
  );
}
