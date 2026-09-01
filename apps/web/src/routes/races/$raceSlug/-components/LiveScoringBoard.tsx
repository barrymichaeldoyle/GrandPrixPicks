import { api } from '@convex-generated/api';
import type { Doc, Id } from '@convex-generated/dataModel';
import { scoreTopFive } from '@grandprixpicks/shared/scoring';

import { DriverBadge } from '@/components/DriverBadge';
import { useQuery } from '@/integrations/convex/query';
import { SESSION_LABELS } from '@/lib/sessions';

type LiveSnapshot = {
  sessionType: 'sprint' | 'race';
  order: {
    driverId: Id<'drivers'>;
    position: number;
    code: string;
    displayName: string;
    team: string | null;
    number: number | null;
    nationality: string | null;
  }[];
  viewerStanding: {
    rank: number;
    topFive: number;
    h2h: number;
    weekend: number;
  } | null;
  totalPlayers: number;
  updatedAt: number;
};

type LiveScoringBoardProps = {
  race: Doc<'races'>;
  snapshot: LiveSnapshot | null | undefined;
  isSignedIn: boolean;
  topFivePicks: Id<'drivers'>[] | null | undefined;
};

function pointsClass(points: number) {
  if (points === 5) {
    return 'text-result-exact';
  }
  if (points === 3) {
    return 'text-result-near';
  }
  if (points === 1) {
    return 'text-result-top5';
  }
  return 'text-result-miss';
}

export function LiveScoringBoard({
  race,
  snapshot,
  isSignedIn,
  topFivePicks,
}: LiveScoringBoardProps) {
  const matchups = useQuery(
    api.h2h.getMatchupsForSeason,
    snapshot ? { round: race.round, season: race.season } : 'skip',
  );
  const h2hPredictions = useQuery(
    api.h2h.myH2HPredictionsForRace,
    snapshot && isSignedIn ? { raceId: race._id } : 'skip',
  );

  if (!snapshot) {
    return null;
  }

  const orderByDriver = new Map(
    snapshot.order.map((entry) => [entry.driverId, entry]),
  );
  const topFive = topFivePicks
    ? scoreTopFive({
        picks: topFivePicks,
        classification: snapshot.order.map((entry) => entry.driverId),
      })
    : null;
  const selectedH2HPicks = h2hPredictions?.[snapshot.sessionType] ?? null;
  const h2hRows = (matchups ?? []).flatMap((matchup) => {
    const pickedId = selectedH2HPicks?.[matchup._id];
    if (!pickedId) {
      return [];
    }
    const pickedDriver =
      pickedId === matchup.driver1._id ? matchup.driver1 : matchup.driver2;
    const otherDriver =
      pickedId === matchup.driver1._id ? matchup.driver2 : matchup.driver1;
    const pickedPosition = orderByDriver.get(pickedId)?.position;
    const otherPosition = orderByDriver.get(otherDriver._id)?.position;
    const isAhead =
      pickedPosition !== undefined &&
      (otherPosition === undefined || pickedPosition < otherPosition);
    return [
      {
        matchup,
        pickedDriver,
        otherDriver,
        pickedPosition,
        otherPosition,
        isAhead,
      },
    ];
  });

  return (
    <section
      className="mt-6 overflow-hidden rounded-lg border border-border bg-surface"
      aria-labelledby="live-scoring-heading"
      data-testid="live-scoring-board"
    >
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border px-4 py-4 sm:px-5">
        <div>
          <div className="flex items-center gap-2.5">
            <span
              className="h-2 w-2 rounded-full bg-text-muted motion-safe:animate-pulse"
              aria-hidden="true"
            />
            <h2 id="live-scoring-heading" className="text-xl text-text">
              {SESSION_LABELS[snapshot.sessionType]} live scoring
            </h2>
          </div>
          <p className="mt-1.5 max-w-2xl text-sm text-text-muted">
            The running order is live and can change, including after the flag.
          </p>
        </div>
        {snapshot.viewerStanding ? (
          <div className="flex items-baseline gap-2 font-data tabular-nums">
            <span className="text-lg text-text">
              {snapshot.viewerStanding.weekend} pts
            </span>
            <span className="text-xs text-text-muted">
              Weekend P{snapshot.viewerStanding.rank} of {snapshot.totalPlayers}
            </span>
          </div>
        ) : null}
      </div>

      {!isSignedIn ? (
        <p className="px-4 py-5 text-sm text-text-muted sm:px-5">
          Sign in to see how your locked picks score.
        </p>
      ) : !topFive && h2hRows.length === 0 ? (
        <p className="px-4 py-5 text-sm text-text-muted sm:px-5">
          No locked picks for this session.
        </p>
      ) : (
        <div className="grid divide-y divide-border lg:grid-cols-2 lg:divide-x lg:divide-y-0">
          <div className="min-w-0 px-4 py-4 sm:px-5">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h3 className="text-sm font-medium text-text">Top 5</h3>
              <span className="font-data text-sm text-text tabular-nums">
                {topFive?.total ?? 0} pts
              </span>
            </div>
            <div className="divide-y divide-border/60">
              {(topFive?.breakdown ?? []).map((pick) => {
                const driver = orderByDriver.get(pick.driverId);
                return (
                  <div
                    key={pick.driverId}
                    className="grid min-h-11 grid-cols-[2rem_minmax(0,1fr)_3.5rem_2.5rem] items-center gap-2"
                  >
                    <span className="font-data text-xs text-text-muted tabular-nums">
                      P{pick.predictedPosition}
                    </span>
                    <DriverBadge
                      code={driver?.code ?? '???'}
                      displayName={driver?.displayName ?? 'Unknown'}
                      team={driver?.team}
                      number={driver?.number}
                      nationality={driver?.nationality}
                      size="sm"
                    />
                    <span className="text-right font-data text-xs text-text-muted tabular-nums">
                      {pick.actualPosition
                        ? `Live P${pick.actualPosition}`
                        : '—'}
                    </span>
                    <span
                      className={`text-right font-data text-sm tabular-nums ${pointsClass(pick.points)}`}
                    >
                      +{pick.points}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="min-w-0 px-4 py-4 sm:px-5">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h3 className="text-sm font-medium text-text">Head-to-Head</h3>
              <span className="font-data text-sm text-text tabular-nums">
                {snapshot.viewerStanding?.h2h ?? 0} pts
              </span>
            </div>
            <div className="grid grid-cols-1 gap-x-4 gap-y-1 sm:grid-cols-2 xl:grid-cols-3">
              {h2hRows.map(
                ({
                  matchup,
                  pickedDriver,
                  otherDriver,
                  pickedPosition,
                  otherPosition,
                  isAhead,
                }) => (
                  <div
                    key={matchup._id}
                    className="flex min-h-11 min-w-0 items-center justify-between gap-2 border-b border-border/60"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-xs text-text-muted">
                        {matchup.team}
                      </p>
                      <p className="truncate text-sm text-text">
                        {pickedDriver.code} over {otherDriver.code}
                        {pickedPosition && otherPosition
                          ? ` · P${pickedPosition}/P${otherPosition}`
                          : ''}
                      </p>
                    </div>
                    <span
                      className={`font-data text-sm tabular-nums ${
                        isAhead ? 'text-result-near' : 'text-result-miss'
                      }`}
                      aria-label={
                        isAhead ? 'Currently ahead' : 'Currently behind'
                      }
                    >
                      {isAhead ? '+1' : '+0'}
                    </span>
                  </div>
                ),
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
