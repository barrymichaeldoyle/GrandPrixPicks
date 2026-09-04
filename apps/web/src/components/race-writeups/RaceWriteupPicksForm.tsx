import { api } from '@convex-generated/api';
import type { Id } from '@convex-generated/dataModel';

import { InlineLoader } from '@/components/InlineLoader';
import { PredictionForm } from '@/components/PredictionForm';
import { useQuery } from '@/integrations/convex/query';
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

  return (
    <PredictionForm
      raceId={raceId}
      initialDrivers={drivers}
      existingPicks={existingPicks ?? undefined}
      sessionType={sessionType}
      analyticsSource={analyticsSource}
      mobileActionFirst
    />
  );
}
