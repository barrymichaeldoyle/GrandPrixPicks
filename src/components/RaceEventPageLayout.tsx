import { Trophy } from 'lucide-react';
import type { ReactNode } from 'react';

import type { Doc } from '../../convex/_generated/dataModel';
import type { SessionType } from '../lib/sessions';
import type { TabSwitchOption } from './TabSwitch';
import { InlineLoader } from './InlineLoader';
import { RaceDetailHeader } from './RaceDetailHeader';
import { SessionEventSummary } from './SessionEventSummary';
import { TabSwitch } from './TabSwitch';

function getStatusStyles(
  isPredictable: boolean,
  status: string,
): { border: string; background: string } {
  if (isPredictable) {
    return { border: 'border-accent/40', background: 'bg-surface' };
  }
  if (status === 'locked') {
    return { border: 'border-warning/40', background: 'bg-warning-muted' };
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
  hasPublishedResults: boolean;
  allEventsScored: boolean;
  pointsSoFar: number;
  scoredEventCount: number;
  weekendSessions: ReadonlyArray<SessionType>;
  selectedSession: SessionType;
  onSelectedSessionChange: (session: SessionType) => void;
  sessionTabOptions: Array<TabSwitchOption<SessionType>>;
  showSessionTabs: boolean;
  trackTimeZone: string;
  getSessionStartAt: (session: SessionType) => number;
  getSessionLockAt: (session: SessionType) => number;
  isSessionPublished: (session: SessionType) => boolean;
  randomizeControl?: ReactNode;
  backLink?: ReactNode;
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
  initialTop5Content,
  top5HeaderAside,
  top5MainContent,
  h2hContent,
  h2hResultsContent,
}: RaceEventPageLayoutProps) {
  const statusStyles = getStatusStyles(isPredictable, race.status);

  return (
    <div className="min-h-full bg-page">
      <div className="mx-auto max-w-7xl px-3 py-4 sm:px-4 sm:py-6">
        {backLink}

        <div
          className={`overflow-hidden rounded-lg border ${
            isNextRace
              ? 'border-accent/50 bg-surface'
              : 'border-border bg-surface'
          }`}
        >
          <RaceDetailHeader race={race} isNextRace={isNextRace} />
          {hasPublishedResults && (
            <div className="border-t border-border bg-surface px-4 py-3 text-sm">
              <span className="text-text-muted">
                {allEventsScored ? 'Weekend Total' : 'Points So Far'}
              </span>
              <div className="font-bold text-accent">+{pointsSoFar} pts</div>
              {!allEventsScored && (
                <p className="text-xs text-text-muted">
                  {scoredEventCount}/{weekendSessions.length} events scored
                </p>
              )}
            </div>
          )}

          <div className={`border-t ${statusStyles.border}`}>
            <div className={statusStyles.background}>
              {!isAuthLoaded || isPredictionsLoading ? (
                <div className="p-4">
                  <InlineLoader />
                </div>
              ) : isPredictable && isSignedIn && !hasPredictions ? (
                <div className="relative">
                  {randomizeControl && (
                    <div className="absolute top-3 right-2 z-10">
                      {randomizeControl}
                    </div>
                  )}
                  {initialTop5Content}
                </div>
              ) : (
                <div>
                  {!hasPublishedResults && (
                    <div>
                      {showSessionTabs && (
                        <div className="border-b border-border bg-surface-muted/40 p-1">
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
                      <div className="space-y-8 p-4">
                        {isPredictable && hasPredictions && (
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
                            isPredictable && hasPredictions
                              ? 'space-y-2 lg:grid lg:grid-cols-[auto,minmax(0,1fr)] lg:items-start lg:gap-3 lg:space-y-0'
                              : 'space-y-2'
                          }
                        >
                          {isPredictable && hasPredictions && (
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
                        {isPredictable && hasPredictions && (
                          <section className="space-y-2">{h2hContent}</section>
                        )}
                      </div>
                    </div>
                  )}
                  {hasPublishedResults && (
                    <>
                      <div className="mx-4 h-px bg-border" />
                      {h2hResultsContent}
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
