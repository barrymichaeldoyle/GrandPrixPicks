import type { Doc, Id } from '@convex-generated/dataModel';
import { CircleX, Pencil, Trophy } from 'lucide-react';
import type { ComponentType, ReactNode } from 'react';

import { Badge } from '../../../../../components/Badge';
import { Button } from '../../../../../components/Button/Button';
import { ErrorBoundary } from '../../../../../components/error/ErrorBoundary';
import { PredictionForm } from '../../../../../components/PredictionForm';
import { RaceScoreCard } from '../../../../../components/RaceScoreCard/RaceScoreCard';
import type { WeekendCardData } from '../../../../../components/RaceScoreCard/types';
import { Tooltip } from '../../../../../components/Tooltip';
import type { SessionType } from '../../../../../lib/sessions';
import { SESSION_LABELS } from '../../../../../lib/sessions';
import type { TabSwitchOption } from '../../../../../components/TabSwitch';
import { H2HResultsSection, H2HSection } from '../../../-race-detail-content';

import { RaceEventPageLayout } from '../RaceEventPageLayout/RaceEventPageLayout';

export type PredictionFormSlotProps = {
  raceId: Id<'races'>;
  existingPicks?: Id<'drivers'>[];
  sessionType?: SessionType;
  onSuccess?: () => void;
  onDirtyChange?: (dirty: boolean) => void;
};

export type H2HSectionSlotProps = {
  race: Doc<'races'>;
  selectedSession: SessionType;
  editingSession: SessionType | null;
  onEditingSessionChange: (session: SessionType | null) => void;
  showRandomizeButton: boolean;
  hasPredictions: boolean;
  hasH2HPredictions: boolean;
  onEditingDirtyChange: (dirty: boolean) => void;
  hasUnsavedEditingChanges: boolean;
};

export type H2HResultsSectionSlotProps = {
  raceId: Id<'races'>;
  selectedSession: SessionType;
};

type RaceEventPageProps = {
  race: Doc<'races'>;
  isNextRace: boolean;
  isAuthLoaded: boolean;
  isSignedIn: boolean;
  isPredictionsLoading: boolean;
  isViewerPredictionDataLoading: boolean;
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
  trackTimeZone: string;
  getSessionStartAt: (session: SessionType) => number;
  getSessionLockAt: (session: SessionType) => number;
  isSessionPublished: (session: SessionType) => boolean;
  cardData: WeekendCardData | null;
  top5EditingSession: SessionType | null;
  onTop5EditingSessionChange: (session: SessionType | null) => void;
  top5HasUnsavedChanges: boolean;
  onTop5DirtyChange: (dirty: boolean) => void;
  h2hEditingSession: SessionType | null;
  onH2HEditingSessionChange: (session: SessionType | null) => void;
  h2hHasUnsavedChanges: boolean;
  onH2HDirtyChange: (dirty: boolean) => void;
  existingTop5PicksBySession?: Partial<
    Record<SessionType, Id<'drivers'>[] | null>
  >;
  randomizeControl?: ReactNode;
  backLink?: ReactNode;
  leaderboardLink?: ReactNode;
  PredictionFormComponent?: ComponentType<PredictionFormSlotProps>;
  H2HSectionComponent?: ComponentType<H2HSectionSlotProps>;
  H2HResultsSectionComponent?: ComponentType<H2HResultsSectionSlotProps>;
};

export function RaceEventPage({
  race,
  isNextRace,
  isAuthLoaded,
  isSignedIn,
  isPredictionsLoading,
  isViewerPredictionDataLoading,
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
  trackTimeZone,
  getSessionStartAt,
  getSessionLockAt,
  isSessionPublished,
  cardData,
  top5EditingSession,
  onTop5EditingSessionChange,
  top5HasUnsavedChanges,
  onTop5DirtyChange,
  h2hEditingSession,
  onH2HEditingSessionChange,
  h2hHasUnsavedChanges,
  onH2HDirtyChange,
  existingTop5PicksBySession,
  randomizeControl,
  backLink,
  leaderboardLink,
  PredictionFormComponent = PredictionForm,
  H2HSectionComponent = H2HSection,
  H2HResultsSectionComponent = H2HResultsSection,
}: RaceEventPageProps) {
  const isPredictable = race.status === 'upcoming' && isNextRace;
  const selectedSessionData = cardData?.sessions[selectedSession] ?? null;
  const canManagePredictions = isNextRace;
  const canEditSelectedSession = Boolean(
    canManagePredictions &&
    selectedSessionData &&
    !selectedSessionData.isLocked &&
    !selectedSessionData.hasResults,
  );

  const selectedSessionCardData =
    cardData == null
      ? null
      : {
          ...cardData,
          sessions: Object.fromEntries(
            Object.entries(cardData.sessions).map(([session, data]) => [
              session,
              session === selectedSession ? data : null,
            ]),
          ) as WeekendCardData['sessions'],
        };

  function renderTop5EditForm() {
    if (!top5EditingSession) {
      return null;
    }

    return (
      <div className="p-4">
        <PredictionFormComponent
          raceId={race._id}
          sessionType={top5EditingSession}
          existingPicks={
            existingTop5PicksBySession?.[top5EditingSession] ?? undefined
          }
          onSuccess={() => onTop5EditingSessionChange(null)}
          onDirtyChange={onTop5DirtyChange}
        />
      </div>
    );
  }

  function renderInitialForm() {
    if (
      !isPredictable ||
      !isSignedIn ||
      hasPredictions ||
      isViewerPredictionDataLoading
    ) {
      return null;
    }

    return (
      <div className="space-y-2 p-4">
        <div className="flex items-center gap-2">
          <Trophy className="h-5 w-5 shrink-0 text-accent" />
          <h2 className="text-xl font-semibold text-text">
            <span className="sm:hidden">Top 5</span>
            <span className="hidden sm:inline">Top 5 Predictions</span>
          </h2>
        </div>
        <p className="text-text-muted">
          Pick your top 5 drivers. This prediction will apply to{' '}
          {race.hasSprint
            ? 'Sprint Qualifying, Sprint, Qualifying, and Race'
            : 'Qualifying and Race'}
          . Save now, then edit any session any time before it starts.
        </p>
        <PredictionFormComponent raceId={race._id} />
      </div>
    );
  }

  function renderLateSessionEntryForm() {
    if (
      isPredictable ||
      !isSignedIn ||
      hasPredictions ||
      !canEditSelectedSession ||
      isViewerPredictionDataLoading
    ) {
      return null;
    }

    return (
      <div className="space-y-2 p-4">
        <div className="flex items-center gap-2">
          <Trophy className="h-5 w-5 shrink-0 text-accent" />
          <h2 className="text-xl font-semibold text-text">
            {SESSION_LABELS[selectedSession]} Predictions
          </h2>
        </div>
        <p className="text-text-muted">
          Earlier sessions are closed, but {SESSION_LABELS[selectedSession]} is
          still open. These picks will apply to this session only.
        </p>
        <PredictionFormComponent
          raceId={race._id}
          sessionType={selectedSession}
          onDirtyChange={onTop5DirtyChange}
        />
      </div>
    );
  }

  return (
    <RaceEventPageLayout
      race={race}
      isNextRace={isNextRace}
      isPredictable={isPredictable}
      isAuthLoaded={isAuthLoaded}
      isSignedIn={isSignedIn}
      isPredictionsLoading={isPredictionsLoading}
      hasPredictions={hasPredictions}
      hasH2HPredictions={hasH2HPredictions}
      hasPublishedResults={hasPublishedResults}
      allEventsScored={allEventsScored}
      pointsSoFar={pointsSoFar}
      scoredEventCount={scoredEventCount}
      weekendSessions={weekendSessions}
      selectedSession={selectedSession}
      onSelectedSessionChange={onSelectedSessionChange}
      sessionTabOptions={sessionTabOptions}
      showSessionTabs={
        weekendSessions.length > 1 && (hasPredictions || hasPublishedResults)
      }
      trackTimeZone={trackTimeZone}
      getSessionStartAt={getSessionStartAt}
      getSessionLockAt={getSessionLockAt}
      isSessionPublished={isSessionPublished}
      randomizeControl={randomizeControl}
      backLink={backLink}
      leaderboardLink={leaderboardLink}
      initialTop5Content={renderInitialForm()}
      top5HeaderAside={
        canManagePredictions && selectedSessionData ? (
          <div className="flex items-center gap-2">
            {selectedSessionData.isLocked && !selectedSessionData.hasResults ? (
              <Tooltip content="This session has started — predictions can't be changed">
                <span className="shrink-0" data-testid="top5-locked-badge">
                  <Badge variant="locked" />
                </span>
              </Tooltip>
            ) : null}
            {top5EditingSession ? (
              <Button
                variant="text"
                size="inline"
                leftIcon={CircleX}
                onClick={() => {
                  if (top5HasUnsavedChanges) {
                    const confirmStop = window.confirm(
                      'You have unsaved Top 5 changes. Stop editing and discard them?',
                    );
                    if (!confirmStop) {
                      return;
                    }
                  }
                  onTop5EditingSessionChange(null);
                }}
                title={`Stop editing ${SESSION_LABELS[selectedSession]} predictions`}
              >
                Stop Editing
              </Button>
            ) : canEditSelectedSession ? (
              <Button
                variant="text"
                size="inline"
                leftIcon={Pencil}
                onClick={() => onTop5EditingSessionChange(selectedSession)}
                title={`Edit ${SESSION_LABELS[selectedSession]}`}
                data-testid="top5-edit-button"
              >
                <span className="hidden sm:inline">Edit</span>
              </Button>
            ) : null}
          </div>
        ) : null
      }
      top5MainContent={
        top5EditingSession
          ? renderTop5EditForm()
          : (renderLateSessionEntryForm() ??
            (cardData && selectedSessionCardData ? (
              <ErrorBoundary>
                <RaceScoreCard
                  data={selectedSessionCardData}
                  variant="full"
                  viewer={{
                    isSignedIn,
                    isOwner: true,
                  }}
                  isNextRace={isNextRace}
                  onEditSession={
                    canManagePredictions
                      ? onTop5EditingSessionChange
                      : undefined
                  }
                />
              </ErrorBoundary>
            ) : null))
      }
      h2hContent={
        <H2HSectionComponent
          race={race}
          selectedSession={selectedSession}
          editingSession={h2hEditingSession}
          onEditingSessionChange={onH2HEditingSessionChange}
          onEditingDirtyChange={onH2HDirtyChange}
          hasUnsavedEditingChanges={h2hHasUnsavedChanges}
          showRandomizeButton={!hasH2HPredictions}
          hasPredictions={hasPredictions}
          hasH2HPredictions={hasH2HPredictions}
        />
      }
      h2hResultsContent={
        <H2HResultsSectionComponent
          raceId={race._id}
          selectedSession={selectedSession}
        />
      }
    />
  );
}
