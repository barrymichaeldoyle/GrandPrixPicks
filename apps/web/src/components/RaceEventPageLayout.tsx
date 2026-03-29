import type { Doc } from '@convex-generated/dataModel';
import { Trophy } from 'lucide-react';
import type { ReactNode } from 'react';

import type { SessionType } from '../lib/sessions';
import { InlineLoader } from './InlineLoader';
import { RaceDetailHeader } from './RaceDetailHeader';
import { SessionEventSummary } from './SessionEventSummary';
import type { TabSwitchOption } from './TabSwitch';
import { TabSwitch } from './TabSwitch';

function getStatusStyles(isPredictable: boolean): {
  border: string;
  background: string;
} {
  if (isPredictable) {
    return { border: 'border-accent/40', background: 'bg-surface' };
  }
  return { border: 'border-border', background: 'bg-surface' };
}

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
  randomizeControl,
  backLink,
  leaderboardLink,
  initialTop5Content,
  top5HeaderAside,
  top5MainContent,
  h2hContent,
  h2hResultsContent,
}: RaceEventPageLayoutProps) {
  const statusStyles = getStatusStyles(isPredictable);
  const top5SectionLayoutClass =
    'lg:grid lg:grid-cols-[auto,minmax(0,1fr)] lg:items-start lg:gap-3 lg:space-y-0';
  const showResultsPendingBadge =
    race.status === 'locked' && hasPublishedResults && !allEventsScored;
  const selectedSessionHasResults = isSessionPublished(selectedSession);
  const showResultsView = hasPublishedResults && selectedSessionHasResults;
  // Also show for a race that's in-play but whose status hasn't been updated
  // yet by the admin (e.g. race started but DB still says 'upcoming').
  const raceIsActiveOrPlayable =
    isPredictable ||
    race.status === 'locked' ||
    (race.status !== 'finished' && hasPredictions);
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

        <div
          className={`overflow-hidden rounded-lg border-3 bg-surface ${
            isNextRace ? 'border-accent/50' : 'border-border'
          }`}
        >
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

          <div className={`border-t-3 ${statusStyles.border}`}>
            <div className={statusStyles.background}>
              {!isAuthLoaded || isPredictionsLoading ? (
                <div className="p-4">
                  <InlineLoader />
                </div>
              ) : isPredictable && isSignedIn && !hasPredictions ? (
                <div className="relative">
                  {randomizeControl && (
                    <div className="absolute top-2 right-2 z-10">
                      {randomizeControl}
                    </div>
                  )}
                  {initialTop5Content}
                </div>
              ) : (
                <div>
                  {showSessionTabs && (
                    <div
                      className={`border-b-3 ${statusStyles.border} bg-surface-muted/40 p-1`}
                    >
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
                    <div className="space-y-8 p-4">
                      {showReadonlyPredictions && (
                        <section className="space-y-2">
                          <SessionEventSummary
                            session={selectedSession}
                            startsAt={getSessionStartAt(selectedSession)}
                            lockAt={getSessionLockAt(selectedSession)}
                            hasResults={isSessionPublished(selectedSession)}
                            trackTimeZone={trackTimeZone}
                          />
                        </section>
                      )}
                      <section
                        className={
                          showReadonlyPredictions
                            ? `space-y-2 ${top5SectionLayoutClass}`
                            : top5SectionLayoutClass
                        }
                      >
                        {showReadonlyPredictions && (
                          <div className="flex items-center justify-between gap-2 lg:pt-1">
                            <div className="flex items-center gap-2">
                              <Trophy className="h-5 w-5 shrink-0 text-accent" />
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
                        <section className="space-y-2">{h2hContent}</section>
                      )}
                    </div>
                  )}
                  {showResultsView && h2hResultsContent}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
