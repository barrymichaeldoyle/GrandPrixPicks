import { CalendarDays, Layers, Swords, Trophy, Users } from 'lucide-react';

import { LeaderboardBoard } from './board';
import { FollowingGuard } from './FollowingContent';
import { LeaderboardContentLoader } from './rows';
import type { GameMode, RaceLeaderboardResult, Scope } from './types';

export function WeekendContent({
  defaultRace,
  scope,
  gameMode,
  isSignedIn,
  activeData,
}: {
  defaultRace: { _id: string; name: string; status: string } | null;
  scope: Scope;
  gameMode: GameMode;
  isSignedIn: boolean | undefined;
  activeData: RaceLeaderboardResult | null;
}) {
  if (!defaultRace) {
    return (
      <div className="rounded-xl border border-border bg-surface p-8 text-center">
        <CalendarDays className="mx-auto mb-4 h-16 w-16 text-text-muted" />
        <h2 className="mb-2 text-xl font-semibold text-text">No races yet</h2>
        <p className="text-text-muted">
          Weekend leaderboards will appear once the season begins.
        </p>
      </div>
    );
  }

  if (scope === 'following') {
    return (
      <FollowingGuard>
        <WeekendFollowingContent
          defaultRace={defaultRace}
          gameMode={gameMode}
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
      <div className="rounded-xl border border-border bg-surface p-8 text-center">
        <Layers className="mx-auto mb-4 h-16 w-16 text-text-muted" />
        <h2 className="mb-2 text-xl font-semibold text-text">No scores yet</h2>
        <p className="text-text-muted">
          Scores will appear once race results are published.
        </p>
      </div>
    );
  }

  const entries = activeData.entries;

  if (entries.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-surface p-8 text-center">
        {gameMode === 'h2h' ? (
          <Swords className="mx-auto mb-4 h-16 w-16 text-text-muted" />
        ) : (
          <Trophy className="mx-auto mb-4 h-16 w-16 text-text-muted" />
        )}
        <h2 className="mb-2 text-xl font-semibold text-text">No scores yet</h2>
        <p className="text-text-muted">
          {defaultRace.status === 'finished'
            ? 'No predictions were submitted for this weekend.'
            : 'Scores will appear once race results are published.'}
        </p>
      </div>
    );
  }

  return <LeaderboardBoard entries={entries} gameMode={gameMode} />;
}

function WeekendFollowingContent({
  defaultRace,
  gameMode,
  isSignedIn,
  activeData,
}: {
  defaultRace: { _id: string; name: string; status: string };
  gameMode: GameMode;
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
      <div className="rounded-xl border border-border bg-surface p-8 text-center">
        <Users className="mx-auto mb-4 h-16 w-16 text-text-muted" />
        <h2 className="mb-2 text-xl font-semibold text-text">
          No one here yet
        </h2>
        <p className="mb-4 text-text-muted">
          {defaultRace.status === 'finished'
            ? 'None of the people you follow submitted predictions for this weekend.'
            : 'Follow other players from their profile to see them here.'}
        </p>
        <p className="text-sm text-text-muted">
          Browse the global leaderboard to find players to follow.
        </p>
      </div>
    );
  }

  return <LeaderboardBoard entries={entries} gameMode={gameMode} />;
}
