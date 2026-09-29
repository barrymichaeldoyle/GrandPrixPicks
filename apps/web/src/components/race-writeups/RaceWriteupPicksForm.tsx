import { api } from '@convex-generated/api';
import type { Id } from '@convex-generated/dataModel';

import { InlineLoader } from '@/components/InlineLoader';
import { H2HPredictionForm } from '@/components/H2HPredictionForm';
import { PredictionForm } from '@/components/PredictionForm/PredictionForm';
import { useQuery } from '@/integrations/convex/query';
import { useViewerSession } from '@/integrations/clerk/useViewerSession';
import type { RaceWriteupPhase } from '@/lib/raceWriteupPhase';

export function RaceWriteupPicksForm({
  analyticsSource,
  phase,
  raceId,
  round,
  season,
}: {
  /** Which page the picker is embedded in, for the conversion funnel. */
  analyticsSource: 'writeup' | 'predictions_hub';
  phase: RaceWriteupPhase;
  raceId: Id<'races'>;
  round: number;
  season: number;
}) {
  const drivers = useQuery(api.drivers.listDrivers, {
    round,
    season,
    includeNotRacing: true,
  });
  const weekendPredictions = useQuery(api.predictions.myWeekendPredictions, {
    raceId,
  });
  // SSR-resolved, so a returning player's duels are there on first paint
  // rather than appearing a beat after Clerk boots.
  const { isSignedIn } = useViewerSession();
  const matchups = useQuery(
    api.h2h.getMatchupsForSeason,
    isSignedIn ? { round, season } : 'skip',
  );
  const h2hPredictions = useQuery(
    api.h2h.myH2HPredictionsForRace,
    isSignedIn ? { raceId } : 'skip',
  );

  if (drivers === undefined || weekendPredictions === undefined) {
    return (
      <InlineLoader
        label="Loading the prediction picker"
        className="min-h-96"
      />
    );
  }

  const sessionType = phase === 'race-picks' ? ('race' as const) : undefined;
  const predictions = weekendPredictions?.predictions;
  const existingPicks = sessionType
    ? predictions?.race
    : (predictions?.quali ?? predictions?.race);
  const existingH2HPicks = sessionType
    ? (h2hPredictions?.race ?? undefined)
    : (h2hPredictions?.quali ?? h2hPredictions?.race ?? undefined);

  return (
    <>
      <PredictionForm
        raceId={raceId}
        initialDrivers={drivers}
        existingPicks={existingPicks ?? undefined}
        sessionType={sessionType}
        analyticsSource={analyticsSource}
        mobileActionFirst
      />

      {/* Signed-in players only, and stacked under the Top 5 rather than gated
          behind a "continue" step: someone who came for the duels reaches them
          by scrolling instead of finishing a Top 5 they may not have wanted.

          A signed-out visitor is not offered them at all. Eleven more decisions
          in front of a stranger who has not yet made an account is eleven more
          places to give up, and the Top 5 above is the conversion this page
          exists to win. The duels are what they find once they are in. */}
      {isSignedIn ? (
        <section
          aria-labelledby="race-writeup-h2h-heading"
          className="mt-10 border-t border-border pt-8"
        >
          <h3
            id="race-writeup-h2h-heading"
            className="font-title text-xl font-medium text-text"
          >
            Team-mate battles
          </h3>
          <p className="gpp-reading-copy mt-2 max-w-2xl text-text-muted">
            Pick who finishes ahead in each team. One point for every one you
            get right.
          </p>

          <div className="mt-6">
            {matchups === undefined || h2hPredictions === undefined ? (
              <InlineLoader
                label="Loading the team-mate battles"
                className="min-h-64"
              />
            ) : matchups.length === 0 ? (
              <p className="text-base text-text-muted">
                Team-mate battles open once the grid for this round is
                confirmed.
              </p>
            ) : (
              <H2HPredictionForm
                raceId={raceId}
                matchups={matchups}
                sessionType={sessionType}
                existingPicks={existingH2HPicks}
                analyticsSource={analyticsSource}
              />
            )}
          </div>
        </section>
      ) : null}
    </>
  );
}
