import type { Doc } from '@convex-generated/dataModel';
import { CalendarDays, Trophy, Users } from 'lucide-react';

/** Only the fields this view reads, but typed off the schema so `status` stays a union. */
type WeekendRace = Pick<Doc<'races'>, '_id' | 'name' | 'status'>;

import { LeaderboardBoard } from './board';
import { FollowingGuard } from './FollowingContent';
import { LeaderboardContentLoader } from './rows';
import type { RaceLeaderboardResult, Scope } from './types';
import { NoticeCard } from '@/components/NoticeCard';

export function WeekendContent({
  defaultRace,
  scope,
  isSignedIn,
  activeData,
}: {
  defaultRace: WeekendRace | null;
  scope: Scope;
  isSignedIn: boolean | undefined;
  activeData: RaceLeaderboardResult | null;
}) {
  if (!defaultRace) {
    return (
      <NoticeCard
        icon={CalendarDays}
        title="No races yet"
        description="Weekend leaderboards will appear once the season begins."
      />
    );
  }

  if (scope === 'following') {
    return (
      <FollowingGuard>
        <WeekendFollowingContent
          defaultRace={defaultRace}
          isSignedIn={isSignedIn}
          activeData={activeData ?? undefined}
        />
      </FollowingGuard>
    );
  }

  if (activeData === undefined) {
    return <LeaderboardContentLoader />;
  }

  if (activeData === null) {
    return (
      <NoticeCard
        icon={Trophy}
        title="No scores yet"
        description="Scores will appear once race results are published."
      />
    );
  }

  const entries = activeData.entries;

  if (entries.length === 0) {
    return (
      <NoticeCard
        icon={Trophy}
        title="No scores yet"
        description={
          defaultRace.status === 'finished'
            ? 'No predictions were submitted for this weekend.'
            : 'Scores will appear once race results are published.'
        }
      />
    );
  }

  return <LeaderboardBoard entries={entries} />;
}

function WeekendFollowingContent({
  defaultRace,
  isSignedIn,
  activeData,
}: {
  defaultRace: WeekendRace;
  isSignedIn: boolean | undefined;
  activeData: RaceLeaderboardResult;
}) {
  // Treat as loading if: query pending OR Convex returned locked but Clerk says signed in
  // (transient state while auth token propagates to the Convex client)
  if (
    activeData === undefined ||
    (activeData.status === 'locked' &&
      activeData.reason === 'sign_in' &&
      isSignedIn)
  ) {
    return <LeaderboardContentLoader />;
  }

  if (activeData.status === 'locked') {
    return null;
  }

  const entries = activeData.entries;

  if (entries.length === 0) {
    return (
      <NoticeCard
        icon={Users}
        title={
          defaultRace.status === 'finished'
            ? 'No followed players submitted picks this weekend'
            : 'No followed players yet'
        }
        description={
          defaultRace.status === 'finished'
            ? undefined
            : 'Follow a player from their profile to see them here.'
        }
        action={
          <p className="text-sm text-text-muted">
            Browse the global leaderboard to find players to follow.
          </p>
        }
      />
    );
  }

  return <LeaderboardBoard entries={entries} />;
}
