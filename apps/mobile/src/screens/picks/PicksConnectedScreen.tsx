import { Ionicons } from '../../components/ui/Ionicons';
import {
  analyticsEvents,
  analyticsFailureReason,
} from '@grandprixpicks/shared/analytics';
import {
  getSessionsForWeekend,
  type SessionType,
} from '@grandprixpicks/shared/sessions';
import { useMutation } from 'convex/react';
import * as Haptics from 'expo-haptics';
import { useEffect, useRef, useState } from 'react';
import { ScrollView } from 'react-native-gesture-handler';
import { RaceRecapCard } from '../../components/home/RaceRecapCard';
import { WeekendPicksCard } from '../../components/home/WeekendPicksCard';
import { SignedOutPicksNotice } from '../../components/picks/SignedOutPicksNotice';
import {
  competitiveSessions,
  PracticeResultsSheet,
} from '../../components/races/practice-results-sheet';
import { LoadingScreen } from '../../components/ui/LoadingScreen';
import { useOfferPushAfterFirstSave } from '../../hooks/useOfferPushAfterFirstSave';
import { useRequestReviewAfterScoredWeekend } from '../../hooks/useRequestReviewAfterScoredWeekend';
import { api } from '../../integrations/convex/api';
import { useQuery } from '../../integrations/convex/query';
import { captureAnalyticsEvent } from '../../lib/analytics';
import { useUserDateFormat } from '../../lib/dates';
import { getLockStatusViewModel } from '../../lib/lockTime';
import { useIsSignedIn } from '../../lib/useIsSignedIn';
import { useNow } from '../../lib/useNow';
import { useSignInSheet } from '../../lib/useSignInSheet';
import { useMobileConfig } from '../../providers/mobile-config';
import { useToast } from '../../providers/ToastProvider';
import { colors } from '../../theme/tokens';
import { Pressable, Text, View } from '../../tw';
import {
  H2HEditor,
  h2hEditorTitle,
  H2HSection,
  toTopFivePositions,
} from './H2HSection';
import { PageHeader, CascadeBanner, SessionTabs } from './PicksChrome';
import {
  NoUpcomingRaceState,
  NotAvailableState,
  PickEditorModal,
} from './PicksStates';
import { WeekendPointsStrip, ScoredSessionSection } from './ScoredSections';
import { Top5Section, Top5Editor } from './Top5Section';
import {
  getSessionLockAt,
  type RaceDoc,
  type DriverId,
  type SessionCapability,
} from './picksShared';

export function PicksConnectedScreen({
  embedded = false,
}: {
  embedded?: boolean;
}) {
  const { convexEnabled } = useMobileConfig();
  const weekend = useQuery(
    api.races.getCurrentWeekend,
    convexEnabled ? {} : 'skip',
  );

  if (!convexEnabled) {
    return embedded ? null : <NotAvailableState />;
  }

  if (weekend === undefined) {
    return embedded ? null : <LoadingScreen />;
  }

  if (weekend === null) {
    return embedded ? null : <NoUpcomingRaceState />;
  }

  return (
    <PredictForRace
      embedded={embedded}
      capabilities={weekend.sessions as SessionCapability[]}
      race={weekend.race}
    />
  );
}

function PredictForRace({
  embedded,
  race,
  capabilities,
}: {
  embedded: boolean;
  race: RaceDoc;
  capabilities: SessionCapability[];
}) {
  const now = useNow();
  const maybeOfferPush = useOfferPushAfterFirstSave();
  // Pinned to this race's round, and asking for the drivers who are not in a
  // car too: the picker filters those out of its pool, but a saved pick has to
  // be able to name one.
  const driversQuery = useQuery(api.drivers.listDrivers, {
    round: race.round,
    season: race.season,
    includeNotRacing: true,
  });
  const matchupsQuery = useQuery(api.h2h.getMatchupsForSeason, {
    round: race.round,
    season: race.season,
  });
  const weekendPredictions = useQuery(api.predictions.myWeekendPredictions, {
    raceId: race._id,
  });
  const h2hPredictions = useQuery(api.h2h.myH2HPredictionsForRace, {
    raceId: race._id,
  });
  const practiceResults = useQuery(
    api.practiceResults.getPracticeResultsForRace,
    { raceId: race._id },
  );
  const [resultsSheetVisible, setResultsSheetVisible] = useState(false);
  const [viewedFormGuide, setViewedFormGuide] = useState(false);
  const [listScrollEnabled, setListScrollEnabled] = useState(true);
  const [embeddedPicker, setEmbeddedPicker] = useState<'top5' | 'h2h' | null>(
    null,
  );
  const [embeddedH2HMatchupId, setEmbeddedH2HMatchupId] = useState<
    string | undefined
  >();
  const [embeddedDragging, setEmbeddedDragging] = useState(false);

  const submitPrediction = useMutation(api.predictions.submitPrediction);
  const submitH2H = useMutation(api.h2h.submitH2HPredictions);
  const isSignedIn = useIsSignedIn();
  const openSignIn = useSignInSheet();
  const { showToast, celebratePicks } = useToast();
  const { formatDateTime } = useUserDateFormat();

  /**
   * A signed-out save is not a failure and must not read like one. The editor
   * has already written the draft to the device, so the only thing missing is
   * an account: send them to get one. `PendingPickSubmitter` submits the card
   * the moment they have one.
   */
  function requireAccountToSave() {
    showToast('Sign in and these picks go straight in', 'success');
    openSignIn();
  }

  const weekendSessions = getSessionsForWeekend(Boolean(race.hasSprint));

  // Result data only subscribes once something has been published.
  const anyResult = capabilities.some((c) => c.hasResult);
  const weekendFullyScored =
    capabilities.length > 0 && capabilities.every((c) => c.hasResult);
  useRequestReviewAfterScoredWeekend(weekendFullyScored);
  const myScoresBySession = useQuery(
    api.results.getMyScoresForRace,
    anyResult ? { raceId: race._id } : 'skip',
  );
  const actualTop5BySession = useQuery(
    api.results.getEnrichedTop5BySession,
    anyResult ? { raceId: race._id } : 'skip',
  );
  const myH2HWeekend = useQuery(
    api.h2h.getMyH2HWeekendScore,
    anyResult ? { raceId: race._id } : 'skip',
  );

  // Server capabilities are the authority on writability; the device clock
  // only advances the locked state between query refreshes (a Convex query
  // re-runs on data changes, not on the passage of time).
  //
  // A `sign_in` denial is the exception, and reading it as a lock is what
  // broke this screen for every signed-out visitor: `deriveSessionCapability`
  // answers `canEdit: false, denialReason: 'sign_in'` for all four sessions
  // when there is no viewer, so an entirely open weekend rendered read-only
  // with "Session locked" on the button. Missing an account is not a closed
  // session — it is the whole premise of drafting picks before you have one —
  // and it also covers the signed-in first payload, which arrives before
  // Clerk's token reaches Convex and says the same thing.
  const sessionLockState = weekendSessions.map((session) => {
    const cap = capabilities.find((c) => c.sessionType === session);
    const lockAt = cap?.lockAt ?? getSessionLockAt(race, session);
    const remaining =
      typeof lockAt === 'number' ? lockAt - now : Number.POSITIVE_INFINITY;
    const status = getLockStatusViewModel(remaining, now);
    const deniedByServer =
      cap?.canEdit === false && cap.denialReason !== 'sign_in';
    const isLocked = status.isLocked || deniedByServer;
    return { session, lockAt, isLocked, hasResult: cap?.hasResult ?? false };
  });

  const nextOpenSession =
    sessionLockState.find((s) => !s.isLocked)?.session ??
    weekendSessions[weekendSessions.length - 1];

  const [selectedSession, setSelectedSession] =
    useState<SessionType>(nextOpenSession);

  useEffect(() => {
    if (!weekendSessions.includes(selectedSession)) {
      // Backend weekend shape changes can invalidate the selected session.
      // oxlint-disable-next-line react/set-state-in-effect
      setSelectedSession(nextOpenSession);
    }
  }, [nextOpenSession, selectedSession, weekendSessions]);

  // When the session on screen locks, move on to the next open one: every
  // save path checks the selected session's lock, so staying put would leave
  // the rest of the weekend unsaveable from here. Only the transition moves
  // it, so a locked session the player taps to read stays selected.
  //
  // Never while an editor is open: switching under it swapped the picks on
  // screen and the Save button's session without a word. The move waits for
  // the editor to close. The full picks screen keeps its editors inside the
  // sections, out of sight of this screen, so it does not move at all.
  const selectedIsLockedNow = Boolean(
    sessionLockState.find((s) => s.session === selectedSession)?.isLocked,
  );
  const lastSeenRef = useRef({
    session: selectedSession,
    locked: selectedIsLockedNow,
  });
  const canMoveSelection = embedded && embeddedPicker === null;
  useEffect(() => {
    if (!canMoveSelection) {
      return;
    }
    const last = lastSeenRef.current;
    const justLocked =
      last.session === selectedSession && !last.locked && selectedIsLockedNow;
    lastSeenRef.current = {
      session: selectedSession,
      locked: selectedIsLockedNow,
    };
    if (justLocked && nextOpenSession !== selectedSession) {
      // oxlint-disable-next-line react/set-state-in-effect
      setSelectedSession(nextOpenSession);
    }
  }, [canMoveSelection, nextOpenSession, selectedIsLockedNow, selectedSession]);

  const selectedCapability = capabilities.find(
    (c) => c.sessionType === selectedSession,
  );
  const selectedHasResult = Boolean(selectedCapability?.hasResult);
  const myH2HScoreForSession = useQuery(
    api.h2h.getMyH2HScoreForRace,
    selectedHasResult
      ? { raceId: race._id, sessionType: selectedSession }
      : 'skip',
  );

  /*
   * The full classification for whichever quali/sprint tabs the results
   * sheet can show, not just the top five `actualTop5BySession` carries for
   * the rest of the screen. That query exists for the scored-session summary
   * above the picks, which only ever needs a top five; the sheet is a form
   * guide and truncating a 22-driver field to five there is the mobile-only
   * gap web's own quali/sprint tab doesn't have. Lazy, like web's modal: no
   * reason to hold three more subscriptions open before the sheet is opened.
   */
  const visibleCompetitiveSessions = competitiveSessions(
    selectedSession,
    Boolean(race.hasSprint),
  );
  const sprintQualiResult = useQuery(
    api.results.getResultForRace,
    resultsSheetVisible && visibleCompetitiveSessions.includes('sprint_quali')
      ? { raceId: race._id, sessionType: 'sprint_quali' }
      : 'skip',
  );
  const sprintResult = useQuery(
    api.results.getResultForRace,
    resultsSheetVisible && visibleCompetitiveSessions.includes('sprint')
      ? { raceId: race._id, sessionType: 'sprint' }
      : 'skip',
  );
  const qualiResult = useQuery(
    api.results.getResultForRace,
    resultsSheetVisible && visibleCompetitiveSessions.includes('quali')
      ? { raceId: race._id, sessionType: 'quali' }
      : 'skip',
  );
  const sheetCompetitive: Partial<
    Record<
      SessionType,
      Array<{ position: number; code: string; displayName: string }>
    >
  > = {
    sprint_quali: sprintQualiResult?.enrichedClassification,
    sprint: sprintResult?.enrichedClassification,
    quali: qualiResult?.enrichedClassification,
  };

  if (
    driversQuery === undefined ||
    matchupsQuery === undefined ||
    weekendPredictions === undefined ||
    h2hPredictions === undefined
  ) {
    return embedded ? null : <LoadingScreen />;
  }

  const drivers = driversQuery;
  const matchups = matchupsQuery;
  const predictionsBySession = weekendPredictions?.predictions ?? {
    quali: null,
    sprint_quali: null,
    sprint: null,
    race: null,
  };
  const hasAnyTop5 = Object.values(predictionsBySession).some(
    (p) => p !== null,
  );
  const hasAnyH2H = Object.values(h2hPredictions ?? {}).some((s) => s !== null);

  const selectedLockAt = getSessionLockAt(race, selectedSession);
  const selectedSessionIsLocked = Boolean(
    sessionLockState.find((s) => s.session === selectedSession)?.isLocked,
  );

  async function saveTop5(
    picks: string[],
    sessionType: SessionType | undefined,
  ) {
    if (!isSignedIn) {
      requireAccountToSave();
      return;
    }
    const isFirstSave = !hasAnyTop5;
    const scope = sessionType === undefined ? 'cascade' : 'session';
    try {
      await submitPrediction({
        raceId: race._id,
        picks: picks as DriverId[],
        sessionType,
      });
    } catch (err) {
      captureAnalyticsEvent(analyticsEvents.predictionSaveFailed, {
        prediction_type: 'top5',
        scope,
        reason: analyticsFailureReason(err),
      });
      throw err;
    }
    celebratePicks();
    captureAnalyticsEvent(analyticsEvents.predictionSaved, {
      prediction_type: 'top5',
      scope,
      viewed_form_guide: viewedFormGuide,
      open_sessions: sessionLockState.filter((s) => !s.isLocked).length,
      locked_sessions: sessionLockState.filter((s) => s.isLocked).length,
    });
    if (isFirstSave) {
      void maybeOfferPush();
    }
  }

  async function saveH2H(
    picks: Record<string, string>,
    sessionType: SessionType | undefined,
  ) {
    if (!isSignedIn) {
      requireAccountToSave();
      return;
    }
    const scope = sessionType === undefined ? 'cascade' : 'session';
    try {
      await submitH2H({
        raceId: race._id,
        picks: matchups.map((m) => ({
          matchupId: m._id,
          predictedWinnerId: picks[m._id] as DriverId,
        })),
        sessionType,
      });
    } catch (err) {
      captureAnalyticsEvent(analyticsEvents.predictionSaveFailed, {
        prediction_type: 'h2h',
        scope,
        reason: analyticsFailureReason(err),
      });
      throw err;
    }
    celebratePicks();
    captureAnalyticsEvent(analyticsEvents.predictionSaved, {
      prediction_type: 'h2h',
      scope,
      viewed_form_guide: viewedFormGuide,
      open_sessions: sessionLockState.filter((s) => !s.isLocked).length,
      locked_sessions: sessionLockState.filter((s) => s.isLocked).length,
    });
  }

  function closeEmbeddedPicker() {
    setEmbeddedPicker(null);
    setEmbeddedH2HMatchupId(undefined);
  }

  const topFivePositions = toTopFivePositions(
    predictionsBySession[selectedSession] ?? [],
  );

  if (embedded) {
    const sessionH2H = h2hPredictions?.[selectedSession] ?? {};
    const h2hComplete =
      matchups.length > 0 &&
      matchups.every((matchup) => sessionH2H[matchup._id]);

    return (
      <View>
        <WeekendPicksCard
          drivers={drivers}
          h2h={sessionH2H}
          hasAnyTop5={hasAnyTop5}
          matchups={matchups}
          now={now}
          onEditTop5={() => setEmbeddedPicker('top5')}
          onFinishH2H={() => {
            setEmbeddedH2HMatchupId(undefined);
            setEmbeddedPicker('h2h');
          }}
          onMakePicks={() => setEmbeddedPicker('top5')}
          onSelectH2H={(index) => {
            setEmbeddedH2HMatchupId(
              h2hComplete ? matchups[index]?._id : undefined,
            );
            setEmbeddedPicker('h2h');
          }}
          onSelectSession={(session) => {
            void Haptics.selectionAsync();
            setSelectedSession(session);
          }}
          race={race}
          selectedSession={selectedSession}
          sessions={capabilities.map((session) => {
            const lock = sessionLockState.find(
              (entry) => entry.session === session.sessionType,
            );
            return {
              sessionType: session.sessionType,
              lockAt: session.lockAt,
              isLocked: lock?.isLocked ?? session.isLocked,
              hasResult: session.hasResult,
              // The server's answer was right when the query ran; the
              // device clock catches the lock that landed since.
              canCreate: session.canCreate && !lock?.isLocked,
              canEdit: session.canEdit && !lock?.isLocked,
            };
          })}
          top5={predictionsBySession[selectedSession] ?? []}
        />
        {embeddedPicker === 'top5' ? (
          <PickEditorModal
            scrollEnabled={!embeddedDragging}
            title="Your Top 5"
            onClose={closeEmbeddedPicker}
          >
            <Top5Editor
              cascadeMode={!hasAnyTop5}
              drivers={drivers}
              existingPicks={predictionsBySession[selectedSession] ?? []}
              onCancel={closeEmbeddedPicker}
              onDraggingChange={setEmbeddedDragging}
              onSubmit={saveTop5}
              race={race}
              selectedLockAt={selectedLockAt}
              selectedSession={selectedSession}
              sessionIsLocked={selectedSessionIsLocked}
            />
          </PickEditorModal>
        ) : null}
        {embeddedPicker === 'h2h' ? (
          <PickEditorModal
            fillBody={embeddedH2HMatchupId !== undefined}
            {...h2hEditorTitle(matchups, embeddedH2HMatchupId, selectedSession)}
            onClose={closeEmbeddedPicker}
          >
            <H2HEditor
              topFivePositions={topFivePositions}
              cascadeMode={!hasAnyH2H}
              existingPicks={sessionH2H}
              matchups={matchups}
              onCancel={closeEmbeddedPicker}
              onSubmit={saveH2H}
              race={race}
              selectedSession={selectedSession}
              sessionIsLocked={selectedSessionIsLocked}
              visibleMatchupId={embeddedH2HMatchupId}
            />
          </PickEditorModal>
        ) : null}
      </View>
    );
  }

  const Container = embedded ? View : ScrollView;
  return (
    <View className={embedded ? 'mb-6 bg-page' : 'flex-1 bg-page'}>
      <Container
        contentContainerStyle={{
          gap: 18,
          paddingBottom: 40,
          paddingHorizontal: embedded ? 0 : 16,
          paddingTop: 12,
        }}
        scrollEnabled={listScrollEnabled}
        showsVerticalScrollIndicator={false}
        style={embedded ? { gap: 18 } : { flex: 1 }}
      >
        {/* Above the picker, for the eight hours after a race starts. This
            screen advances to the next round the moment results publish, which
            is the moment a player most wants the one that just finished. It
            renders nothing outside that window. */}
        {embedded ? null : <RaceRecapCard />}

        {embedded ? null : (
          <PageHeader race={race} selectedSession={selectedSession} now={now} />
        )}

        {(practiceResults?.length ?? 0) > 0 ? (
          <Pressable
            accessibilityRole="button"
            className="flex-row items-center justify-center gap-2 rounded-lg border border-border bg-surface py-3 active:bg-surface-elevated"
            onPress={() => {
              captureAnalyticsEvent('session_results_button_pressed', {
                race_slug: race.slug,
                platform: 'mobile',
              });
              setResultsSheetVisible(true);
              setViewedFormGuide(true);
            }}
          >
            <Ionicons color={colors.accent} name="stats-chart" size={15} />
            <Text className="text-foreground text-sm font-bold">
              View Session Results
            </Text>
          </Pressable>
        ) : null}

        {anyResult ? (
          <WeekendPointsStrip
            h2hTotal={myH2HWeekend?.totalPoints ?? 0}
            isFinal={weekendFullyScored}
            race={race}
            scoresBySession={myScoresBySession ?? null}
          />
        ) : null}

        {(hasAnyTop5 || anyResult) && weekendSessions.length > 1 ? (
          <SessionTabs
            sessions={weekendSessions}
            selected={selectedSession}
            lockState={sessionLockState}
            predictionsBySession={predictionsBySession}
            onSelect={(s) => {
              void Haptics.selectionAsync();
              setSelectedSession(s);
            }}
          />
        ) : null}

        {selectedHasResult ? (
          <ScoredSessionSection
            actual={actualTop5BySession?.[selectedSession] ?? []}
            h2hPicks={h2hPredictions?.[selectedSession] ?? {}}
            h2hScore={myH2HScoreForSession ?? null}
            matchups={matchups}
            myScore={myScoresBySession?.[selectedSession] ?? null}
            session={selectedSession}
          />
        ) : (
          <>
            {/* Only while the session can still be saved to. On a locked
                session the notice named a deadline that had already passed
                ("before this session locks on 13 Aug 2026 at 09:19", read on
                the 13th at 10:51), which is the one thing this notice exists
                to get right. There is nothing to save here either way. */}
            {!isSignedIn && !selectedSessionIsLocked ? (
              <SignedOutPicksNotice
                lockLabel={
                  selectedLockAt
                    ? formatDateTime(new Date(selectedLockAt).toISOString())
                    : undefined
                }
                onSignIn={openSignIn}
              />
            ) : null}

            {!hasAnyTop5 ? (
              <CascadeBanner hasSprint={Boolean(race.hasSprint)} />
            ) : null}

            <Top5Section
              race={race}
              drivers={drivers}
              selectedSession={selectedSession}
              selectedLockAt={selectedLockAt}
              cascadeMode={!hasAnyTop5}
              existingPicks={predictionsBySession[selectedSession] ?? []}
              onDraggingChange={(dragging) => setListScrollEnabled(!dragging)}
              sessionIsLocked={selectedSessionIsLocked}
              onSubmit={saveTop5}
            />

            {hasAnyTop5 || matchups.length === 0 ? (
              matchups.length === 0 ? null : (
                <H2HSection
                  cascadeMode={!hasAnyH2H}
                  existingPicks={h2hPredictions?.[selectedSession] ?? {}}
                  matchups={matchups}
                  race={race}
                  selectedSession={selectedSession}
                  sessionIsLocked={selectedSessionIsLocked}
                  topFivePositions={topFivePositions}
                  onSubmit={saveH2H}
                />
              )
            ) : (
              <Text className="text-muted pt-1 text-xs">
                Save your Top 5 first. Teammate picks open after that.
              </Text>
            )}
          </>
        )}
      </Container>
      <PracticeResultsSheet
        competitive={sheetCompetitive}
        hasSprint={Boolean(race.hasSprint)}
        onClose={() => setResultsSheetVisible(false)}
        practice={practiceResults ?? []}
        predictionSession={selectedSession}
        raceSlug={race.slug}
        visible={resultsSheetVisible}
      />
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Scored session — predicted vs actual + points (plan §2 result state)
// ─────────────────────────────────────────────────────────────────────────
