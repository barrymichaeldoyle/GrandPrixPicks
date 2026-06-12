import type { Doc } from '@convex-generated/dataModel';
import type { ReactNode } from 'react';

import type { SessionType } from '../../../../../lib/sessions';
import { SESSION_LABELS } from '../../../../../lib/sessions';
import { InlineLoader } from '../../../../../components/InlineLoader';
import { RaceDetailHeader } from '../../../../../components/RaceDetailHeader';
import { SessionEventSummary } from '../../../../../components/SessionEventSummary';
import { StepBadge } from '../../../../../components/StepBadge';
import { WeekendScheduleList } from '../../../../../components/WeekendScheduleList';
import type { TabSwitchOption } from '../../../../../components/TabSwitch';
import { TabSwitch } from '../../../../../components/TabSwitch';

type RaceEventPageLayoutProps = {
  race: Doc<'races'>;
  isNextRace: boolean;
  isPredictable: boolean;
  isAuthLoaded: boolean;
  isSignedIn: boolean;
  isPredictionsLoading: boolean;
  hasPredictions: boolean;
  hasH2HPredictions: boolean;
  hasPublishedResults: boolean;
  allEventsScored: boolean;
  pointsSoFar: number;
  scoredEventCount: number;
  weekendSessions: readonly SessionType[];
  selectedSession: SessionType;
  onSelectedSessionChange: (session: SessionType) => void;
  sessionTabOptions: TabSwitchOption<SessionType>[];
  showSessionTabs: boolean;
  trackTimeZone: string;
  getSessionStartAt: (session: SessionType) => number;
  getSessionLockAt: (session: SessionType) => number;
  isSessionPublished: (session: SessionType) => boolean;
  /** Selected session has saved Top 5 picks (step 1 of the picks flow). */
  top5Done?: boolean;
  /** Selected session has saved H2H picks (step 2 of the picks flow). */
  h2hDone?: boolean;
  randomizeControl?: ReactNode;
  backLink?: ReactNode;
  leaderboardLink?: ReactNode;
  initialTop5Content: ReactNode;
  top5HeaderAside?: ReactNode;
  top5MainContent: ReactNode;
  h2hContent: ReactNode;
  h2hResultsContent: ReactNode;
};

export function RaceEventPageLayout({
  race,
  isNextRace,
  isPredictable,
  isAuthLoaded,
  isSignedIn,
  isPredictionsLoading,
  hasPredictions,
  hasH2HPredictions,
  hasPublishedResults,
  allEventsScored,
  pointsSoFar,
  scoredEventCount,
  weekendSessions,
  selectedSession,
  onSelectedSessionChange,
  sessionTabOptions,
  showSessionTabs,
  trackTimeZone,
  getSessionStartAt,
  getSessionLockAt,
  isSessionPublished,
  top5Done = false,
  h2hDone = false,
  randomizeControl,
  backLink,
  leaderboardLink,
  initialTop5Content,
  top5HeaderAside,
  top5MainContent,
  h2hContent,
  h2hResultsContent,
}: RaceEventPageLayoutProps) {
  const showResultsPendingBadge =
    race.status === 'locked' && hasPublishedResults && !allEventsScored;
  const selectedSessionHasResults = isSessionPublished(selectedSession);
  const showResultsView = hasPublishedResults && selectedSessionHasResults;
  // Also show for a race that's in-play but whose status hasn't been updated
  // yet by the admin (e.g. race started but DB still says 'upcoming').
  const raceIsActiveOrPlayable =
    race.status !== 'cancelled' &&
    (isPredictable ||
      race.status === 'locked' ||
      (race.status !== 'finished' && hasPredictions));
  const showReadonlyPredictions = raceIsActiveOrPlayable && hasPredictions;
  // Show H2H once the user has at least Top 5 picks for the weekend so they
  // can submit their first H2H entry even if they skipped earlier sessions.
  const showReadonlyH2H =
    raceIsActiveOrPlayable && (hasH2HPredictions || hasPredictions);

  return (
    <div className="min-h-full bg-page">
      <div className="mx-auto max-w-7xl px-3 py-4 sm:px-4 sm:py-6">
        {(backLink || leaderboardLink) && (
          <div className="mb-4 flex items-center justify-between">
            {backLink ?? <span />}
            {leaderboardLink ?? <span />}
          </div>
        )}

        <RaceDetailHeader
          race={race}
          isNextRace={isNextRace}
          resultsSummary={
            hasPublishedResults
              ? {
                  label: allEventsScored ? 'Weekend Total' : 'Points So Far',
                  points: pointsSoFar,
                  showResultsPendingBadge,
                  scoredEventCount,
                  totalEvents: weekendSessions.length,
                  allEventsScored,
                }
              : undefined
          }
        />

        {!isAuthLoaded || isPredictionsLoading ? (
          <div className="py-8">
            <InlineLoader />
          </div>
        ) : isPredictable && isSignedIn && !hasPredictions ? (
          <div className="relative mt-6">
            {randomizeControl && (
              <div className="absolute top-0 right-0 z-10">
                {randomizeControl}
              </div>
            )}
            {initialTop5Content}
            <div className="mt-8">
              <WeekendScheduleList race={race} />
            </div>
          </div>
        ) : (
          <div className="mt-5">
            {showSessionTabs && (
              <div className="rounded-lg bg-surface-muted/50 p-1">
                <TabSwitch
                  value={selectedSession}
                  onChange={onSelectedSessionChange}
                  options={sessionTabOptions}
                  className="flex gap-1"
                  buttonClassName="flex-1"
                  ariaLabel="Predictions by session"
                />
              </div>
            )}
            {!showResultsView && (
              <>
                {!showReadonlyPredictions && (
                  <div className="mt-5">
                    <WeekendScheduleList race={race} />
                  </div>
                )}
                {showReadonlyPredictions && (
                  <div className="mt-3">
                    <SessionEventSummary
                      startsAt={getSessionStartAt(selectedSession)}
                      lockAt={getSessionLockAt(selectedSession)}
                      hasResults={isSessionPublished(selectedSession)}
                      trackTimeZone={trackTimeZone}
                    />
                  </div>
                )}
                {showReadonlyPredictions && (
                  <div className="mt-7 flex flex-wrap items-center justify-between gap-2">
                    <p className="text-xs font-semibold tracking-[0.14em] text-text-muted uppercase">
                      Your {SESSION_LABELS[selectedSession]} Picks
                    </p>
                    <span className="text-xs font-medium text-text-muted">
                      {(top5Done ? 1 : 0) + (h2hDone ? 1 : 0)} of 2 done
                    </span>
                  </div>
                )}
                <div className="mt-4 space-y-8">
                  <section
                    data-testid="race-top5-section"
                    className="space-y-2"
                  >
                    {showReadonlyPredictions && (
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2.5">
                          <StepBadge step={1} done={top5Done} />
                          <h2 className="text-xl font-semibold text-text">
                            Top 5 Predictions
                          </h2>
                          {top5HeaderAside}
                        </div>
                      </div>
                    )}
                    <div className="min-w-0">{top5MainContent}</div>
                  </section>
                  {showReadonlyH2H && (
                    <section
                      className="space-y-2"
                      data-testid="race-h2h-section"
                    >
                      {h2hContent}
                    </section>
                  )}
                </div>
              </>
            )}
            {showResultsView && <div className="mt-5">{h2hResultsContent}</div>}
          </div>
        )}
      </div>
    </div>
  );
}
