import { api } from '@convex-generated/api';
import type { Doc, Id } from '@convex-generated/dataModel';
import { useQuery } from 'convex/react';
import { Pencil, Swords, Trophy } from 'lucide-react';
import type { ComponentType, ReactNode } from 'react';
import { useState } from 'react';

import { Badge } from '@/components/Badge';
import { Button } from '@/components/Button/Button';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { ErrorBoundary } from '@/components/error/ErrorBoundary';
import {
  FollowXPrompt,
  hasCompletedFollowPrompt,
} from '@/components/FollowXPrompt';
import { PicksFocusOverlay } from '@/components/PicksFocusOverlay';
import { PredictionForm } from '@/components/PredictionForm';
import { ShareOnXButton } from '@/components/ShareOnXButton';
import { StartPicksCta } from '@/components/StartPicksCta';
import { RaceScoreCard } from '@/components/RaceScoreCard/RaceScoreCard';
import type { WeekendCardData } from '@/components/RaceScoreCard/types';
import { Tooltip } from '@/components/Tooltip';
import type { ShareCard } from '@/lib/og/shareCard';
import { encodeShareCardSearch } from '@/lib/og/shareCard';
import type { SessionType } from '@/lib/sessions';
import { SESSION_LABELS } from '@/lib/sessions';
import { buildPicksShareText, buildScoreShareText } from '@/lib/share';
import { siteConfig } from '@/lib/site';
import type { TabSwitchOption } from '@/components/TabSwitch';

import { H2HResultsSection } from '@/routes/races/$raceSlug/-components/H2HResultsSection';
import { H2HSection } from '@/routes/races/$raceSlug/-components/H2HSection';
import { SignedOutRacePreview } from '@/routes/races/$raceSlug/-components/SignedOutRacePreview';
import type { RaceWeekendInitialResults } from '@/routes/races/$raceSlug/-hooks/useRaceWeekendData';
import { RaceEventPageLayout } from '@/routes/races/$raceSlug/-components/RaceEventPageLayout/RaceEventPageLayout';
import { WeekendRecap } from '@/routes/races/$raceSlug/-components/WeekendRecap/WeekendRecap';
import type { H2HSessionScore } from '@/routes/races/$raceSlug/-components/WeekendRecap/recap';
import { deriveWeekendRecap } from '@/routes/races/$raceSlug/-components/WeekendRecap/recap';
import type {
  PicksEditingState,
  SessionSchedule,
  ViewerState,
  WeekendStatus,
} from '@/routes/races/$raceSlug/-components/types';

type PredictionFormSlotProps = {
  raceId: Id<'races'>;
  existingPicks?: Id<'drivers'>[];
  sessionType?: SessionType;
  onSuccess?: () => void;
  onDirtyChange?: (dirty: boolean) => void;
};

type H2HSectionSlotProps = {
  race: Doc<'races'>;
  selectedSession: SessionType;
  editingSession: SessionType | null;
  onEditingSessionChange: (session: SessionType | null) => void;
  showRandomizeButton: boolean;
  hasPredictions: boolean;
  hasH2HPredictions: boolean;
  onEditingDirtyChange: (dirty: boolean) => void;
  hasUnsavedEditingChanges: boolean;
  initialPicksOpen: boolean;
  onInitialPicksOpenChange: (open: boolean) => void;
};

type H2HResultsSectionSlotProps = {
  race: Doc<'races'>;
  selectedSession: SessionType;
  initialDrivers?: Doc<'drivers'>[];
  initialAvailableSessions?: SessionType[];
  initialResultsBySession?: RaceWeekendInitialResults['resultsBySession'];
};

type RaceEventPageProps = {
  race: Doc<'races'>;
  isNextRace: boolean;
  viewer: ViewerState;
  /** Full driver roster, used for the signed-out (crawlable) driver grid. */
  drivers?: Doc<'drivers'>[];
  /** Loader-seeded published results, used to SSR the finishing-order table. */
  initialResults?: RaceWeekendInitialResults;
  isPredictionsLoading: boolean;
  isViewerPredictionDataLoading: boolean;
  weekendStatus: WeekendStatus;
  schedule: SessionSchedule;
  selectedSession: SessionType;
  onSelectedSessionChange: (session: SessionType) => void;
  sessionTabOptions: TabSwitchOption<SessionType>[];
  /** Selected session has saved Top 5 picks (drives the step 1 indicator). */
  top5SelectedSessionDone?: boolean;
  /** Selected session has saved H2H picks (drives the step 2 indicator). */
  h2hSelectedSessionDone?: boolean;
  cardData: WeekendCardData | null;
  /** The viewer's per-session H2H scores (drives the recap H2H record). */
  h2hScoresBySession?: Partial<Record<SessionType, H2HSessionScore>>;
  top5Editing: PicksEditingState;
  h2hEditing: PicksEditingState;
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
  viewer,
  drivers = [],
  initialResults,
  isPredictionsLoading,
  isViewerPredictionDataLoading,
  weekendStatus,
  schedule,
  selectedSession,
  onSelectedSessionChange,
  sessionTabOptions,
  top5SelectedSessionDone = false,
  h2hSelectedSessionDone = false,
  cardData,
  h2hScoresBySession = {},
  top5Editing,
  h2hEditing,
  existingTop5PicksBySession,
  randomizeControl,
  backLink,
  leaderboardLink,
  PredictionFormComponent = PredictionForm,
  H2HSectionComponent = H2HSection,
  H2HResultsSectionComponent = H2HResultsSection,
}: RaceEventPageProps) {
  const { isSignedIn } = viewer;
  const {
    hasPredictions,
    hasH2HPredictions,
    hasPublishedResults,
    allEventsScored,
    pointsSoFar,
  } = weekendStatus;
  const {
    session: top5EditingSession,
    onSessionChange: onTop5EditingSessionChange,
    hasUnsavedChanges: top5HasUnsavedChanges,
    onDirtyChange: onTop5DirtyChange,
  } = top5Editing;
  const isPredictable = race.status === 'upcoming' && isNextRace;
  // A signed-out visitor on the open race: swap the bare sign-in gate for a
  // content-rich preview (driver grid + a clear "play free" CTA) so the page is
  // useful to crawlers and gives first-timers a reason to sign up.
  const showSignedOutPreview = isPredictable && !isSignedIn;
  const currentUrl =
    typeof window === 'undefined'
      ? undefined
      : `${window.location.pathname}${window.location.search}${window.location.hash}`;
  const selectedSessionData = cardData?.sessions[selectedSession] ?? null;
  const canManagePredictions = isNextRace;
  const canEditSelectedSession = Boolean(
    canManagePredictions &&
    selectedSessionData &&
    !selectedSessionData.isLocked &&
    !selectedSessionData.hasResults,
  );

  // Top 5 picks happen in a focus overlay (full screen on mobile, modal on
  // desktop). It opens either for a fresh entry ('cascade' = all sessions,
  // 'late' = selected session only) or when an existing session is edited.
  const [top5StartTarget, setTop5StartTarget] = useState<
    'cascade' | 'late' | null
  >(null);
  const top5OverlaySession =
    top5EditingSession ?? (top5StartTarget === 'late' ? selectedSession : null);
  const top5OverlayOpen =
    top5EditingSession !== null || top5StartTarget !== null;

  // Controlled open state for the H2H first-time picks overlay (lives in
  // H2HSection) so a Top 5 save can chain straight into H2H picks.
  const [h2hInitialPicksOpen, setH2hInitialPicksOpen] = useState(false);
  const [showTop5CloseConfirm, setShowTop5CloseConfirm] = useState(false);
  const [showFollowPrompt, setShowFollowPrompt] = useState(false);

  function closeTop5Overlay() {
    setShowTop5CloseConfirm(false);
    setTop5StartTarget(null);
    onTop5EditingSessionChange(null);
    onTop5DirtyChange(false);
  }

  function handleTop5Success() {
    closeTop5Overlay();
    // One-time nudge to follow the brand X account, shown after the first
    // prediction ever saved on this device.
    if (!hasCompletedFollowPrompt()) {
      setShowFollowPrompt(true);
    }
    // Keep the guided flow rolling: if the user hasn't saved any H2H picks for
    // the weekend yet, open the H2H focus overlay as the next step.
    if (!hasH2HPredictions) {
      setH2hInitialPicksOpen(true);
    }
  }

  function requestCloseTop5Overlay() {
    if (top5HasUnsavedChanges) {
      setShowTop5CloseConfirm(true);
      return;
    }
    closeTop5Overlay();
  }

  const me = useQuery(api.users.me, isSignedIn ? {} : 'skip');
  const shareBy = me?.displayName || me?.username || undefined;

  // Share URLs carry the card payload so the race page can serve a per-user
  // OG image (rendered by /og/share) when the link is unfurled on X.
  function buildSharePageUrl(card: ShareCard, campaign: string) {
    const params = new URLSearchParams({
      ...encodeShareCardSearch(card),
      utm_source: 'x',
      utm_medium: 'social',
      utm_campaign: campaign,
    });
    return `${siteConfig.url}/races/${race.slug}?${params.toString()}`;
  }

  const selectedSessionPicks = selectedSessionData?.picks ?? [];
  const canSharePicks =
    isSignedIn &&
    selectedSessionData != null &&
    !selectedSessionData.isHidden &&
    !selectedSessionData.hasResults &&
    selectedSessionPicks.length === 5;
  const sharePicksText = buildPicksShareText({
    raceName: race.name,
    sessionLabel: SESSION_LABELS[selectedSession],
    picks: selectedSessionPicks,
    accountHandle: siteConfig.social.x.handle,
    raceHashtag: race.hashtag,
  });
  const sharePicksUrl = canSharePicks
    ? buildSharePageUrl(
        {
          variant: 'picks',
          session: selectedSession,
          picks: selectedSessionPicks.map((pick) => pick.code),
          by: shareBy,
        },
        'share_picks',
      )
    : '';

  const shareScoreText = buildScoreShareText({
    raceName: race.name,
    points: pointsSoFar,
    isFinal: allEventsScored,
    accountHandle: siteConfig.social.x.handle,
    raceHashtag: race.hashtag,
  });
  const shareScoreUrl = buildSharePageUrl(
    {
      variant: 'score',
      points: pointsSoFar,
      final: allEventsScored,
      by: shareBy,
    },
    'share_score',
  );

  // Post-race "moment": a celebratory weekend summary, shown once the viewer's
  // own predictions are fully scored. Derived from the already-loaded card
  // data + H2H scores, so it needs no extra query.
  const showRecap = isSignedIn && hasPredictions && allEventsScored && cardData;
  const recapContent = showRecap ? (
    <ErrorBoundary>
      <WeekendRecap
        raceName={race.name}
        recap={deriveWeekendRecap({
          cardData,
          weekendSessions: schedule.weekendSessions,
          h2hScoresBySession,
        })}
        shareSlot={
          <ShareOnXButton
            text={shareScoreText}
            url={shareScoreUrl}
            analyticsEvent="score_shared_x"
            analyticsProps={{
              race_slug: race.slug,
              all_events_scored: allEventsScored,
              points: pointsSoFar,
            }}
            label="Share my weekend on X"
          />
        }
      />
    </ErrorBoundary>
  ) : null;

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

  function renderInitialCtas() {
    if (
      !isPredictable ||
      !isSignedIn ||
      hasPredictions ||
      isViewerPredictionDataLoading
    ) {
      return null;
    }

    return (
      <div className="space-y-3">
        <StartPicksCta
          step={1}
          title="Top 5 Predictions"
          icon={Trophy}
          description={`Pick your top 5 drivers. This prediction will apply to ${
            race.hasSprint
              ? 'Sprint Qualifying, Sprint, Qualifying, and Race'
              : 'Qualifying and Race'
          }. Save now, then edit any session any time before it starts.`}
          actionLabel="Pick Your Top 5"
          onStart={() => setTop5StartTarget('cascade')}
          data-testid="top5-start-button"
        />
        <StartPicksCta
          step={2}
          title="Head-to-Head Predictions"
          icon={Swords}
          description="Pick a winner from each teammate matchup."
          actionLabel="Pick H2H Winners"
          disabledNote="Save your Top 5 first to unlock Head-to-Head picks."
        />
      </div>
    );
  }

  function renderLateSessionEntryCta() {
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
      <StartPicksCta
        icon={Trophy}
        description={`Earlier sessions are closed, but ${SESSION_LABELS[selectedSession]} is still open. These picks will apply to this session only.`}
        actionLabel="Pick Your Top 5"
        onStart={() => setTop5StartTarget('late')}
        data-testid="top5-start-button"
      />
    );
  }

  return (
    <>
      <RaceEventPageLayout
        race={race}
        isNextRace={isNextRace}
        isPredictable={isPredictable}
        viewer={viewer}
        isPredictionsLoading={isPredictionsLoading}
        weekendStatus={weekendStatus}
        schedule={schedule}
        selectedSession={selectedSession}
        onSelectedSessionChange={onSelectedSessionChange}
        sessionTabOptions={sessionTabOptions}
        showSessionTabs={
          schedule.weekendSessions.length > 1 &&
          (hasPredictions || hasPublishedResults)
        }
        top5Done={top5SelectedSessionDone}
        h2hDone={h2hSelectedSessionDone}
        randomizeControl={randomizeControl}
        backLink={backLink}
        leaderboardLink={leaderboardLink}
        recapContent={recapContent}
        initialTop5Content={renderInitialCtas()}
        top5HeaderAside={
          canManagePredictions && selectedSessionData ? (
            <div className="flex items-center gap-2">
              {selectedSessionData.isLocked &&
              !selectedSessionData.hasResults ? (
                <Tooltip content="This session has started. Predictions can't be changed">
                  <span className="shrink-0" data-testid="top5-locked-badge">
                    <Badge variant="locked" />
                  </span>
                </Tooltip>
              ) : null}
              {canEditSelectedSession ? (
                <Button
                  variant="text"
                  size="inline"
                  leftIcon={Pencil}
                  onClick={() => onTop5EditingSessionChange(selectedSession)}
                  title={`Edit ${SESSION_LABELS[selectedSession]} Top 5 Predictions`}
                  data-testid="top5-edit-button"
                >
                  <span className="hidden sm:inline">Edit</span>
                </Button>
              ) : null}
            </div>
          ) : null
        }
        top5MainContent={
          showSignedOutPreview ? (
            <SignedOutRacePreview
              race={race}
              drivers={drivers}
              currentUrl={currentUrl}
            />
          ) : (
            <>
              {showFollowPrompt && (
                <div className="mb-4">
                  <FollowXPrompt onDismiss={() => setShowFollowPrompt(false)} />
                </div>
              )}
              {renderLateSessionEntryCta() ??
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
                ) : null)}
              {canSharePicks && (
                <div className="mt-3">
                  <ShareOnXButton
                    text={sharePicksText}
                    url={sharePicksUrl}
                    analyticsEvent="picks_shared_x"
                    analyticsProps={{
                      race_slug: race.slug,
                      session_type: selectedSession,
                    }}
                    label="Share my picks on X"
                  />
                </div>
              )}
            </>
          )
        }
        h2hContent={
          <H2HSectionComponent
            race={race}
            selectedSession={selectedSession}
            editingSession={h2hEditing.session}
            onEditingSessionChange={h2hEditing.onSessionChange}
            onEditingDirtyChange={h2hEditing.onDirtyChange}
            hasUnsavedEditingChanges={h2hEditing.hasUnsavedChanges}
            showRandomizeButton={!hasH2HPredictions}
            hasPredictions={hasPredictions}
            hasH2HPredictions={hasH2HPredictions}
            initialPicksOpen={h2hInitialPicksOpen}
            onInitialPicksOpenChange={setH2hInitialPicksOpen}
          />
        }
        h2hResultsContent={
          <>
            <H2HResultsSectionComponent
              race={race}
              selectedSession={selectedSession}
              initialDrivers={drivers}
              initialAvailableSessions={initialResults?.availableSessions}
              initialResultsBySession={initialResults?.resultsBySession}
            />
            {/* When fully scored, the weekend-score share lives in the recap at
                the top of the page; here it only covers a partially-scored
                weekend (e.g. quali in, race pending). */}
            {isSignedIn && hasPredictions && !allEventsScored && (
              <div className="mt-5 flex justify-center">
                <ShareOnXButton
                  text={shareScoreText}
                  url={shareScoreUrl}
                  analyticsEvent="score_shared_x"
                  analyticsProps={{
                    race_slug: race.slug,
                    all_events_scored: allEventsScored,
                    points: pointsSoFar,
                  }}
                  label="Share my score on X"
                />
              </div>
            )}
          </>
        }
      />
      <PicksFocusOverlay
        open={top5OverlayOpen}
        onClose={requestCloseTop5Overlay}
        suspended={showTop5CloseConfirm}
        title={
          top5OverlaySession
            ? `${SESSION_LABELS[top5OverlaySession]}: Top 5`
            : 'Top 5 Predictions'
        }
        subtitle={
          top5OverlaySession
            ? 'Applies to this session only'
            : 'Applies to every session this weekend'
        }
      >
        {/* The overlay body has no mobile bottom padding (see PicksFocusOverlay);
            this form has no sticky bar of its own, so pad the bottom here. */}
        <div className="pb-4 sm:pb-0">
          <PredictionFormComponent
            raceId={race._id}
            sessionType={top5OverlaySession ?? undefined}
            existingPicks={
              top5EditingSession
                ? (existingTop5PicksBySession?.[top5EditingSession] ??
                  undefined)
                : undefined
            }
            onSuccess={handleTop5Success}
            onDirtyChange={onTop5DirtyChange}
          />
        </div>
      </PicksFocusOverlay>
      <ConfirmDialog
        open={showTop5CloseConfirm}
        onClose={() => setShowTop5CloseConfirm(false)}
        onConfirm={closeTop5Overlay}
        title="Close without saving?"
        description="You have unsaved Top 5 changes. We'll keep them as a draft on this device, but they won't count until you save them."
        confirmLabel="Close Without Saving"
      />
    </>
  );
}
