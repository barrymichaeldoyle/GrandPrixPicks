import type { Doc } from '@convex-generated/dataModel';
import type { ReactNode } from 'react';

import type { SessionType } from '@/lib/sessions';
import { SESSION_LABELS } from '@/lib/sessions';
import { InlineLoader } from '@/components/InlineLoader';
import { RaceDetailHeader } from '@/components/RaceDetailHeader';
import { SessionEventSummary } from '@/components/SessionEventSummary';
import { StepBadge } from '@/components/StepBadge';
import { WeekendScheduleList } from '@/components/WeekendScheduleList';
import type { TabSwitchOption } from '@/components/TabSwitch';
import { TabSwitch } from '@/components/TabSwitch';

import type { SessionSchedule, ViewerState, WeekendStatus } from '../types';
import { shouldLeadWithCircuitGuide } from './circuitGuidePlacement';

/** Ties the session tablist to the region it swaps. */
const SESSION_PANEL_ID = 'race-session-panel';

type RaceEventPageLayoutProps = {
  race: Doc<'races'>;
  isNextRace: boolean;
  isPredictable: boolean;
  viewer: ViewerState;
  isPredictionsLoading: boolean;
  weekendStatus: WeekendStatus;
  schedule: SessionSchedule;
  selectedSession: SessionType;
  onSelectedSessionChange: (session: SessionType) => void;
  sessionTabOptions: TabSwitchOption<SessionType>[];
  showSessionTabs: boolean;
  /** Selected session has saved Top 5 picks (step 1 of the picks flow). */
  top5Done?: boolean;
  /** Selected session has saved H2H picks (step 2 of the picks flow). */
  h2hDone?: boolean;
  randomizeControl?: ReactNode;
  backLink?: ReactNode;
  leaderboardLink?: ReactNode;
  /** Weekend recap "moment", shown under the header once fully scored. */
  recapContent?: ReactNode;
  /**
   * A short factual account of the weekend, built from the published
   * classifications. The page's only prose of its own: everything else on it
   * comes from the shared circuit guide.
   */
  raceReportContent?: ReactNode;
  /** Hand-off to the next weekend, once this one is done. */
  nextRaceCtaContent?: ReactNode;
  practiceResultsContent?: ReactNode;
  initialTop5Content: ReactNode;
  top5HeaderAside?: ReactNode;
  top5MainContent: ReactNode;
  h2hContent: ReactNode;
  h2hResultsContent: ReactNode;
  /**
   * Circuit briefing. Rendered last so it never displaces the picks flow,
   * except on a weekend that has neither opened nor been scored, where the
   * picks flow is only a "Not Yet Open" notice and the briefing is the whole
   * reason the page is worth loading. See `leadWithCircuitGuide` below.
   */
  circuitGuideContent?: ReactNode;
};

export function RaceEventPageLayout({
  race,
  isNextRace,
  isPredictable,
  viewer,
  isPredictionsLoading,
  weekendStatus,
  schedule,
  selectedSession,
  onSelectedSessionChange,
  sessionTabOptions,
  showSessionTabs,
  top5Done = false,
  h2hDone = false,
  randomizeControl,
  backLink,
  leaderboardLink,
  recapContent,
  raceReportContent,
  nextRaceCtaContent,
  practiceResultsContent,
  initialTop5Content,
  top5HeaderAside,
  top5MainContent,
  h2hContent,
  h2hResultsContent,
  circuitGuideContent,
}: RaceEventPageLayoutProps) {
  const { isAuthLoaded, isSignedIn } = viewer;
  const {
    hasPredictions,
    hasH2HPredictions,
    hasPublishedResults,
    allEventsScored,
    pointsSoFar,
    scoredEventCount,
  } = weekendStatus;
  const {
    weekendSessions,
    trackTimeZone,
    getStartAt: getSessionStartAt,
    getLockAt: getSessionLockAt,
    isPublished: isSessionPublished,
  } = schedule;
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
  const leadWithCircuitGuide = shouldLeadWithCircuitGuide({
    raceStatus: race.status,
    isPredictable,
    hasPublishedResults,
    hasPredictions,
  });
  // Show H2H once the user has at least Top 5 picks for the weekend so they
  // can submit their first H2H entry even if they skipped earlier sessions.
  const showReadonlyH2H =
    raceIsActiveOrPlayable && (hasH2HPredictions || hasPredictions);

  return (
    <div className="min-h-full bg-page">
      <div className="mx-auto max-w-(--page-max) px-4 py-4 sm:py-6">
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
            // Two different things share this slot, so they are gated
            // separately:
            //
            // - Scoring *progress* is a public fact. It renders for everyone
            //   once results exist, and must not disappear when the weekend
            //   finishes scoring, or the header block would vanish mid-flow.
            // - The points total is the viewer's own. It is always zero when
            //   signed out (which made a public page read "Weekend Total
            //   +0 pts"), and once the recap is up the recap owns it — showing
            //   it here too would duplicate the recap's hero number.
            hasPublishedResults
              ? {
                  showViewerPoints: isSignedIn && !recapContent,
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

        {raceReportContent}

        {recapContent}

        {leadWithCircuitGuide && circuitGuideContent}

        {!isAuthLoaded || isPredictionsLoading ? (
          // The testid is the race page's "still loading" signal for the e2e
          // helpers. They used to guess at whichever section a given race
          // state renders, which meant a finished race or an empty card sat
          // out the full timeout waiting for markup that was never coming.
          <div className="py-8" data-testid="race-page-loading">
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
              // Hugs its content from `sm` up. Full-bleed with `flex-1` tabs,
              // each session label sat alone in a ~307px cell on desktop and
              // the strip read as four unrelated words. Equal widths still
              // make sense on a phone, where four tabs fill the screen.
              <div className="rounded-sm border border-border bg-surface-elevated p-1 sm:inline-flex">
                <TabSwitch
                  value={selectedSession}
                  onChange={onSelectedSessionChange}
                  options={sessionTabOptions}
                  className="flex gap-1"
                  buttonClassName="flex-1 sm:flex-none sm:px-4"
                  ariaLabel="Predictions by session"
                  panelId={SESSION_PANEL_ID}
                />
              </div>
            )}
            {/*
              Supplying `panelId` opts TabSwitch into the complete ARIA tabs
              pattern it already implements — role=tablist/tab, aria-selected,
              roving tabindex, arrow/Home/End keys. Without it the switcher
              degraded to aria-pressed toggle buttons and the region it
              controls was associated with nothing.
            */}
            <div
              id={SESSION_PANEL_ID}
              role={showSessionTabs ? 'tabpanel' : undefined}
              aria-label={
                showSessionTabs
                  ? `${SESSION_LABELS[selectedSession]} predictions and results`
                  : undefined
              }
              tabIndex={showSessionTabs ? -1 : undefined}
            >
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
                      <p className="text-xs font-semibold tracking-label text-text-muted uppercase">
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
              {showResultsView && (
                <div className="mt-5">{h2hResultsContent}</div>
              )}
            </div>
          </div>
        )}

        {nextRaceCtaContent}

        {!leadWithCircuitGuide && circuitGuideContent}

        {/* Timing sheets last. They used to sit above the picks, which put a
            twenty-row FP1 classification between the visitor and the thing the
            page is for. Reference material for the picks, not the headline: it
            belongs after them, and closed. */}
        {practiceResultsContent}
      </div>
    </div>
  );
}
