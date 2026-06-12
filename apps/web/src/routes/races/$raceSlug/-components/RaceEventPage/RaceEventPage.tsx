import { api } from '@convex-generated/api';
import type { Doc, Id } from '@convex-generated/dataModel';
import { useQuery } from 'convex/react';
import { Pencil, Swords, Trophy } from 'lucide-react';
import type { ComponentType, ReactNode } from 'react';
import { useState } from 'react';

import { Badge } from '../../../../../components/Badge';
import { Button } from '../../../../../components/Button/Button';
import { ConfirmDialog } from '../../../../../components/ConfirmDialog';
import { ErrorBoundary } from '../../../../../components/error/ErrorBoundary';
import {
  FollowXPrompt,
  hasCompletedFollowPrompt,
} from '../../../../../components/FollowXPrompt';
import { PicksFocusOverlay } from '../../../../../components/PicksFocusOverlay';
import { PredictionForm } from '../../../../../components/PredictionForm';
import { ShareOnXButton } from '../../../../../components/ShareOnXButton';
import { StartPicksCta } from '../../../../../components/StartPicksCta';
import { RaceScoreCard } from '../../../../../components/RaceScoreCard/RaceScoreCard';
import type { WeekendCardData } from '../../../../../components/RaceScoreCard/types';
import { Tooltip } from '../../../../../components/Tooltip';
import type { ShareCard } from '../../../../../lib/og/shareCard';
import { encodeShareCardSearch } from '../../../../../lib/og/shareCard';
import type { SessionType } from '../../../../../lib/sessions';
import { SESSION_LABELS } from '../../../../../lib/sessions';
import { countryCodeToFlagEmoji } from '../../../../../lib/share';
import { siteConfig } from '../../../../../lib/site';
import type { TabSwitchOption } from '../../../../../components/TabSwitch';
import { H2HResultsSection, H2HSection } from '../../../-race-detail-content';

import { RaceEventPageLayout } from '../RaceEventPageLayout/RaceEventPageLayout';

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
  /** Selected session has saved Top 5 picks (drives the step 1 indicator). */
  top5SelectedSessionDone?: boolean;
  /** Selected session has saved H2H picks (drives the step 2 indicator). */
  h2hSelectedSessionDone?: boolean;
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
  top5SelectedSessionDone = false,
  h2hSelectedSessionDone = false,
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
  const sharePicksList = selectedSessionPicks
    .map((pick, index) => {
      const flag = countryCodeToFlagEmoji(pick.nationality);
      return `P${index + 1} ${flag ? `${flag} ` : ''}${pick.code}`;
    })
    .join('\n');
  const shareHashtags = ['#F1', race.hashtag].filter(Boolean).join(' ');
  const sharePicksText = `My ${SESSION_LABELS[selectedSession]} top 5 for the ${race.name} 🏎️\n\n${sharePicksList}\n\nThink you can beat me on ${siteConfig.social.x.handle}?\n\n${shareHashtags}`;
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

  const shareScoreText = allEventsScored
    ? `I scored ${pointsSoFar} points at the ${race.name} 🏎️\n\nThink you can beat me next round on ${siteConfig.social.x.handle}?\n\n${shareHashtags}`
    : `${pointsSoFar} points so far at the ${race.name} 🏎️\n\nFollow the results on ${siteConfig.social.x.handle}.\n\n${shareHashtags}`;
  const shareScoreUrl = buildSharePageUrl(
    {
      variant: 'score',
      points: pointsSoFar,
      final: allEventsScored,
      by: shareBy,
    },
    'share_score',
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
        top5Done={top5SelectedSessionDone}
        h2hDone={h2hSelectedSessionDone}
        randomizeControl={randomizeControl}
        backLink={backLink}
        leaderboardLink={leaderboardLink}
        initialTop5Content={renderInitialCtas()}
        top5HeaderAside={
          canManagePredictions && selectedSessionData ? (
            <div className="flex items-center gap-2">
              {selectedSessionData.isLocked &&
              !selectedSessionData.hasResults ? (
                <Tooltip content="This session has started — predictions can't be changed">
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
            initialPicksOpen={h2hInitialPicksOpen}
            onInitialPicksOpenChange={setH2hInitialPicksOpen}
          />
        }
        h2hResultsContent={
          <>
            <H2HResultsSectionComponent
              raceId={race._id}
              selectedSession={selectedSession}
            />
            {isSignedIn && hasPredictions && (
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
            ? `${SESSION_LABELS[top5OverlaySession]} — Top 5`
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
