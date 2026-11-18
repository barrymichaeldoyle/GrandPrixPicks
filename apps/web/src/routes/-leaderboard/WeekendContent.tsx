import { Link } from '@tanstack/react-router';
import { Button } from '@/components/Button/Button';
import type { Doc } from '@convex-generated/dataModel';
import { CalendarDays, Trophy, Users } from 'lucide-react';

/** Only the fields this view reads, but typed off the schema so `status` stays a union. */
type WeekendRace = Pick<Doc<'races'>, '_id' | 'name' | 'status'>;

import { LeaderboardBoard } from './board';
import { FollowingGuard } from './FollowingContent';
import { LeaderboardContentLoader } from './rows';
import type { RaceLeaderboardResult, Scope } from './types';
import type { SessionScope } from './sessionScope';
import { SESSION_LABELS } from '@/lib/sessions';
import { NoticeCard } from '@/components/NoticeCard';

export function WeekendContent({
  defaultRace,
  scope,
  sessionScope = 'all',
  isSignedIn,
  activeData,
}: {
  defaultRace: WeekendRace | null;
  scope: Scope;
  /** Which slice of the weekend is ranked, so an empty board can name it. */
  sessionScope?: SessionScope;
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
    // Named, because "this weekend" is wrong when the board is one session of
    // it: a player looking at an empty Sprint board should not be told nobody
    // predicted the weekend they can see results for.
    const emptyLabel =
      sessionScope === 'all'
        ? 'this weekend'
        : SESSION_LABELS[sessionScope].toLowerCase();
    return (
      <NoticeCard
        icon={Trophy}
        title="No scores yet"
        description={
          defaultRace.status === 'finished'
            ? `No predictions were submitted for ${emptyLabel}.`
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
          <Button asChild size="sm" variant="secondary">
            <Link
              to="/leaderboard"
              search={(prev) => ({ ...prev, scope: 'global' })}
            >
              Show global leaderboard
            </Link>
          </Button>
        }
      />
    );
  }

  return <LeaderboardBoard entries={entries} />;
}
