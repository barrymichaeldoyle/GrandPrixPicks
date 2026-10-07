import { api } from '@convex-generated/api';
import type { Id } from '@convex-generated/dataModel';
import { lazy, Suspense, useEffect, useRef, useState } from 'react';

import { Button } from '@/components/Button/Button';
import { H2HDuelFocusModal } from '@/components/H2HDuelFocusModal';
import { H2HDuelFormGuide } from '@/components/H2HDuelFormGuide';
import type { H2HMatchup } from '@/components/H2HMatchupGrid';
import { H2HPicksBar } from '@/components/H2HPicksBar';
import { InlineLoader } from '@/components/InlineLoader';
import { PicksFocusOverlay } from '@/components/PicksFocusOverlay';
import { PredictionForm } from '@/components/PredictionForm/PredictionForm';
import { useQuery } from '@/integrations/convex/query';
import { useViewerSession } from '@/integrations/clerk/useViewerSession';
import type { RaceWriteupPhase } from '@/lib/raceWriteupPhase';
import {
  getSessionsForWeekend,
  SESSION_LABELS,
  SESSION_LABELS_FULL,
  type SessionType,
} from '@/lib/sessions';

const H2HPredictionForm = lazy(() =>
  import('@/components/H2HPredictionForm').then((module) => ({
    default: module.H2HPredictionForm,
  })),
);

/** Same reserved-height row the dashboard card uses above its picks bars. */
const PICKS_LABEL_ROW =
  'flex min-h-5 items-center justify-between gap-3 pointer-coarse:min-h-11';

export function RaceWriteupPicksForm({
  analyticsSource,
  phase,
  raceId,
  round,
  season,
  hasSprint = false,
}: {
  /** Which page the picker is embedded in, for the conversion funnel. */
  analyticsSource: 'writeup' | 'predictions_hub';
  phase: RaceWriteupPhase;
  raceId: Id<'races'>;
  round: number;
  season: number;
  hasSprint?: boolean;
}) {
  const [selectedSession, setSelectedSession] = useState<SessionType>();
  const [h2hOverlayOpen, setH2HOverlayOpen] = useState(false);
  const [duelIndex, setDuelIndex] = useState<number | null>(null);
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

  const sessionType =
    selectedSession ?? (phase === 'race-picks' ? 'race' : undefined);
  const predictions = weekendPredictions?.predictions;
  const existingPicks = sessionType
    ? predictions?.[sessionType]
    : ((hasSprint ? predictions?.sprint_quali : undefined) ??
      predictions?.quali ??
      predictions?.race);
  const existingH2HPicks = sessionType
    ? (h2hPredictions?.[sessionType] ?? undefined)
    : ((hasSprint ? h2hPredictions?.sprint_quali : undefined) ??
      h2hPredictions?.quali ??
      h2hPredictions?.race ??
      undefined);

  const topFiveSaved = (existingPicks?.length ?? 0) === 5;
  const h2hSelections = existingH2HPicks ?? {};
  const h2hCalled = matchups
    ? matchups.filter((matchup) => h2hSelections[matchup._id]).length
    : 0;
  const h2hTotal = matchups?.length ?? 0;
  const h2hComplete = h2hTotal > 0 && h2hCalled === h2hTotal;

  /*
   * The hand-off: the fifth pick saves the Top 5 itself, the subscription
   * brings it back, and the duels open as the next step, the same chain the
   * race page runs after its first save. Only on the transition seen while
   * this form is mounted, and only when no duel has been called yet: a
   * returning player with a saved card gets their chips, not a takeover.
   */
  const wasTopFiveSavedRef = useRef(topFiveSaved);
  useEffect(() => {
    const wasSaved = wasTopFiveSavedRef.current;
    wasTopFiveSavedRef.current = topFiveSaved;
    if (!wasSaved && topFiveSaved && h2hTotal > 0 && h2hCalled === 0) {
      // oxlint-disable-next-line react/set-state-in-effect
      setH2HOverlayOpen(true);
    }
  }, [topFiveSaved, h2hTotal, h2hCalled]);

  if (drivers === undefined || weekendPredictions === undefined) {
    return (
      <InlineLoader
        label="Loading the prediction picker"
        className="min-h-96"
      />
    );
  }

  // The saved Top 5, not the one being dragged above: it saves itself on the
  // fifth pick, and the subscription then fills the duels it answers.
  const topFivePositions = existingPicks
    ? Object.fromEntries(
        existingPicks.map((driverId, index) => [driverId, index + 1]),
      )
    : undefined;
  const activeDuel: H2HMatchup | null =
    duelIndex === null ? null : (matchups?.[duelIndex] ?? null);
  const scopeLabel = sessionType
    ? `${SESSION_LABELS[sessionType]} only`
    : 'All open sessions';

  function renderInsight(matchup: H2HMatchup) {
    return (
      <H2HDuelFormGuide
        matchup={matchup}
        sessionType={sessionType}
        raceId={raceId}
        season={season}
      />
    );
  }

  return (
    <>
      {hasSprint ? (
        <div className="mb-6 flex flex-wrap items-center gap-3">
          <label
            htmlFor="writeup-picks-session"
            className="text-sm font-medium text-text"
          >
            Picks for
          </label>
          <select
            id="writeup-picks-session"
            value={sessionType ?? 'all'}
            onChange={(event) =>
              setSelectedSession(
                event.target.value === 'all'
                  ? undefined
                  : (event.target.value as SessionType),
              )
            }
            className="min-h-11 max-w-full rounded-sm border border-border-strong bg-surface-elevated px-3 text-base text-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            {phase !== 'race-picks' ? (
              <option value="all">All open sessions</option>
            ) : null}
            {getSessionsForWeekend(hasSprint).map((session) => (
              <option key={session} value={session}>
                {session === 'race'
                  ? 'Grand Prix'
                  : SESSION_LABELS_FULL[session]}
              </option>
            ))}
          </select>
        </div>
      ) : null}
      <PredictionForm
        key={sessionType ?? 'all'}
        raceId={raceId}
        initialDrivers={drivers}
        existingPicks={existingPicks ?? undefined}
        sessionType={sessionType}
        analyticsSource={analyticsSource}
        mobileActionFirst
      />

      {/* Signed-in players with a saved Top 5 for this session only. The page
          asks for one thing at a time, the way the race page and the dashboard
          do: five picks first, then the duels, which open in the same focus
          takeover the dashboard uses the moment the fifth pick has saved.
          Afterwards the calls sit here as chips, each a way back into one
          battle, and nothing on this page is eleven stacked rows.

          A signed-out visitor is not offered them at all. Eleven more decisions
          in front of a stranger who has not yet made an account is eleven more
          places to give up, and the Top 5 above is the conversion this page
          exists to win. The duels are what they find once they are in. */}
      {isSignedIn && topFiveSaved ? (
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
                className="min-h-24"
              />
            ) : matchups.length === 0 ? (
              <p className="text-base text-text-muted">
                Team-mate battles open once the grid for this round is
                confirmed.
              </p>
            ) : (
              <>
                <div className={PICKS_LABEL_ROW}>
                  <p className="text-xs font-medium text-text-muted">
                    Team-mate picks
                  </p>
                  <p className="text-xs text-text-muted">
                    {h2hComplete
                      ? 'Tap one to change it'
                      : `${h2hTotal - h2hCalled} left to pick`}
                  </p>
                </div>
                <H2HPicksBar
                  matchups={matchups}
                  selections={h2hSelections}
                  // One session: a chip opens that one battle. Every open
                  // session at once: a single call has no one session to
                  // write to, so a chip opens the whole set instead, where
                  // the sequence lands on the tapped battle's strip.
                  onSelectIndex={
                    sessionType ? setDuelIndex : () => setH2HOverlayOpen(true)
                  }
                  testId="writeup-h2h-bar"
                />
                {!h2hComplete ? (
                  <div className="mt-3">
                    <Button
                      size="sm"
                      variant="primary"
                      onClick={() => setH2HOverlayOpen(true)}
                      data-testid="writeup-h2h-start"
                    >
                      {h2hCalled === 0
                        ? 'Make your team-mate picks'
                        : 'Finish team-mate picks'}
                    </Button>
                  </div>
                ) : null}
              </>
            )}
          </div>

          <PicksFocusOverlay
            open={h2hOverlayOpen}
            onClose={() => setH2HOverlayOpen(false)}
            title="Team-mate picks"
            subtitle={scopeLabel}
          >
            {matchups && matchups.length > 0 ? (
              <Suspense fallback={<div className="h-40" aria-busy />}>
                <H2HPredictionForm
                  key={sessionType ?? 'all'}
                  // A half-called card opens as an empty one on purpose, as
                  // on the dashboard: eleven quick questions from the top is
                  // the shape this flow is good at.
                  existingPicks={h2hComplete ? existingH2HPicks : undefined}
                  raceId={raceId}
                  matchups={matchups}
                  sessionType={sessionType}
                  topFivePositions={topFivePositions}
                  analyticsSource={analyticsSource}
                  onSuccess={() => setH2HOverlayOpen(false)}
                  layout="sequential"
                  renderInsight={renderInsight}
                />
              </Suspense>
            ) : null}
          </PicksFocusOverlay>

          {sessionType ? (
            <H2HDuelFocusModal
              open={activeDuel !== null}
              onClose={() => setDuelIndex(null)}
              raceId={raceId}
              sessionType={sessionType}
              matchup={activeDuel}
              selectedDriverId={
                activeDuel ? h2hSelections[activeDuel._id] : undefined
              }
              topFivePositions={topFivePositions}
              renderInsight={renderInsight}
              analyticsSource={analyticsSource}
            />
          ) : null}
        </section>
      ) : null}
    </>
  );
}
