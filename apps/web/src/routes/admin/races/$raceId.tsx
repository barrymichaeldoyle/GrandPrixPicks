import { api } from '@convex-generated/api';
import type { DriverStatus } from '@grandprixpicks/shared/driverStatus';
import type { Id } from '@convex-generated/dataModel';
import type { DragEndEvent, DragStartEvent } from '@dnd-kit/core';
import {
  DndContext,
  PointerSensor,
  pointerWithin,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { arrayMove } from '@dnd-kit/sortable';
import { createFileRoute, Link, useBlocker } from '@tanstack/react-router';
import { useAction, useMutation } from 'convex/react';
import { useQuery } from '@/integrations/convex/query';
import {
  ArrowLeft,
  Check,
  CircleAlert,
  Copy,
  ListChecks,
  Loader2,
  RefreshCw,
  Save,
  Trophy,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import { Button } from '@/components/Button/Button';
import { PageLoader } from '@/components/PageLoader';
import { ShareOnXButton } from '@/components/ShareOnXButton';
import { captureAnalyticsEvent } from '@/lib/analytics';
import { encodeShareCardSearch } from '@/lib/og/shareCard';
import {
  buildOfficialH2HResultReplyText,
  buildRaceResultShareText,
} from '@/lib/share';
import { siteConfig } from '@/lib/site';

import type { SessionType } from '@/lib/sessions';
import {
  getMissingEarlierSessions,
  getSessionsForWeekend,
  SESSION_LABELS,
} from '@/lib/sessions';
import { NotFoundPage } from '@/routes/__root';

import {
  findNextEmptyLane,
  parseLaneId,
} from './$raceId/-components/laneUtils';
import { PositionLane } from './$raceId/-components/PositionLane';
import { PracticeSocialPanel } from './$raceId/-components/PracticeSocialPanel';
import { SocialCardsPanel } from './$raceId/-components/SocialCardsPanel';
import { RaceStatusHeader } from './$raceId/-components/RaceStatusHeader';
import { UpdateModeSelector } from './$raceId/-components/UpdateModeSelector';

export const Route = createFileRoute('/admin/races/$raceId')({
  component: AdminRaceDetailPage,
  head: () => ({
    meta: [
      { title: 'Admin Race Detail | Grand Prix Picks' },
      { name: 'robots', content: 'noindex, nofollow' },
    ],
  }),
});

/**
 * Existing results may predate per-driver statuses, in which case the old
 * "did not classify" list means a plain DNF.
 */
function toStatusMap(
  result: {
    dnfDriverIds?: Id<'drivers'>[];
    driverStatuses?: { driverId: Id<'drivers'>; status: DriverStatus }[];
  } | null,
): Record<string, DriverStatus> {
  if (!result) {
    return {};
  }
  if (result.driverStatuses && result.driverStatuses.length > 0) {
    return Object.fromEntries(
      result.driverStatuses.map((entry) => [entry.driverId, entry.status]),
    );
  }
  return Object.fromEntries(
    (result.dnfDriverIds ?? []).map((driverId) => [driverId, 'dnf' as const]),
  );
}

function AdminRaceDetailPage() {
  const { raceId } = Route.useParams();
  const typedRaceId = raceId as Id<'races'>;
  const isAdmin = useQuery(api.users.amIAdmin);
  const race = useQuery(api.races.getRace, { raceId: typedRaceId });
  // The grid for this round, ordered by it, but including drivers who are not
  // in a car: publishing must record who actually finished, and reality can
  // differ from the lineup we declared (a late reserve call-up). An admin
  // being unable to enter the true classification is worse than an extra name
  // in the search box.
  const drivers = useQuery(
    api.drivers.listDrivers,
    race
      ? { round: race.round, season: race.season, includeNotRacing: true }
      : 'skip',
  );
  const submittedSessions = useQuery(api.results.getAllResultsForRace, {
    raceId: typedRaceId,
  });
  const practiceSummary = useQuery(
    api.practiceResults.getPracticeSessionSummariesForRace,
    { raceId: typedRaceId },
  );
  const practiceOperations = useQuery(
    api.practiceResults.getAdminPracticeOperations,
    { raceId: typedRaceId },
  );

  const [selectedSession, setSelectedSession] = useState<SessionType>('race');

  const existingResult = useQuery(api.results.getResultForRace, {
    raceId: typedRaceId,
    sessionType: selectedSession,
  });
  const openF1Fallback = useQuery(api.openF1Results.getAdminPollStatus, {
    raceId: typedRaceId,
    sessionType: selectedSession,
  });
  const h2hResults = useQuery(api.h2h.getH2HResultsForRace, {
    raceId: typedRaceId,
    sessionType: selectedSession,
  });

  /** Per-position driver selection; length = drivers.length, null = empty slot */
  const [selectedDrivers, setSelectedDrivers] = useState<
    (Id<'drivers'> | null)[]
  >([]);
  /** Only non-classified drivers appear here; absent = a ranked finisher. */
  const [driverStatuses, setDriverStatuses] = useState<
    Record<string, DriverStatus>
  >({});
  const publishResults = useMutation(api.results.adminPublishResults);
  const setUnattended = useMutation(api.openF1Results.adminSetUnattended);
  const fetchResultsNow = useAction(api.openF1Results.adminFetchResultsNow);
  const previewLiveResults = useAction(
    api.openF1Results.adminPreviewLiveResults,
  );
  const cancelRace = useMutation(api.races.adminCancelRace);
  const restoreRace = useMutation(api.races.adminRestoreRace);
  const [isPublishing, setIsPublishing] = useState(false);
  const [isUpdatingUnattended, setIsUpdatingUnattended] = useState(false);
  const [isFetchingNow, setIsFetchingNow] = useState(false);
  // The outcome of the last manual fetch, kept per session so switching tabs
  // never shows one session's answer under another's heading.
  const [fetchNowOutcome, setFetchNowOutcome] = useState<{
    sessionType: SessionType;
    ok: boolean;
    message: string;
  } | null>(null);
  const [isPreviewingLive, setIsPreviewingLive] = useState(false);
  // The last live-timing preview, kept per session for the same reason as
  // fetchNowOutcome: switching tabs must never show one session's grid under
  // another's heading.
  const [livePreview, setLivePreview] = useState<{
    sessionType: SessionType;
    ok: boolean;
    message: string;
    provisional?: boolean;
    settled?: boolean;
    settledAt?: number;
    order?: {
      position: number;
      driverId: Id<'drivers'>;
      driverNumber: number;
      code: string;
      displayName: string;
      team: string;
      blocked: boolean;
    }[];
    stewardsMessages?: string[];
  } | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);
  const [h2hCopyStatus, setH2hCopyStatus] = useState<
    'idle' | 'copied' | 'error'
  >('idle');
  const h2hCopyResetTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  // Republishing an existing result is either a quiet data-entry fix or an
  // official amendment that notifies players (with a required note).
  const [updateMode, setUpdateMode] = useState<'correction' | 'amendment'>(
    'correction',
  );
  const [amendmentNote, setAmendmentNote] = useState('');
  // Auto-reconciliation re-checks this session against the official feed for
  // three days after publication. Opt out when the feed is wrong and the
  // hand-entered order should stand.
  const [pauseRecheck, setPauseRecheck] = useState(false);

  // One lane per driver actually in a car this round. `drivers` deliberately
  // carries the ones who are not, so an admin can enter a reserve who really
  // took the start, but sizing the grid off that list asks for a P23 nobody
  // can fill the moment a mid-season swap retires a seat. A saved
  // classification wins when it is longer, so a published result that already
  // records more finishers stays editable.
  const racingDriverCount =
    drivers?.filter((driver) => driver.racing).length ?? 0;
  const driverCount = Math.max(
    racingDriverCount,
    existingResult?.classification?.length ?? 0,
  );
  const availableSessions = getSessionsForWeekend(race?.hasSprint ?? false);
  const availableSessionsKey = availableSessions.join(',');
  const submittedSessionsKey = submittedSessions?.join(',') ?? '';

  // Results must go in weekend order (quali before race, etc.). Republishing
  // an already-submitted session is always fine — only first-time publishes
  // for a session are blocked while earlier sessions are missing.
  const missingEarlierSessions =
    submittedSessions === undefined ||
    submittedSessions.includes(selectedSession)
      ? []
      : getMissingEarlierSessions(
          race?.hasSprint ?? false,
          selectedSession,
          submittedSessions,
        );
  const sessionOrderBlocked = missingEarlierSessions.length > 0;

  useEffect(() => {
    if (race === undefined || submittedSessions === undefined) {
      return;
    }

    const firstUnsubmittedSession = availableSessions.find(
      (session) => !submittedSessions.includes(session),
    );
    const defaultSession =
      firstUnsubmittedSession ??
      availableSessions[availableSessions.length - 1];

    setSelectedSession((currentSession) =>
      currentSession === defaultSession ? currentSession : defaultSession,
    );
    // The array deps are keyed by content, not identity: `availableSessions`
    // and `submittedSessions` are derived fresh every render, so listing them
    // would re-run this on every render and fight the reader's session choice.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [availableSessionsKey, race?.hasSprint, submittedSessionsKey]);

  // Initialize/reset when session or existing result changes
  useEffect(() => {
    if (driverCount === 0) {
      return;
    }
    if (
      existingResult?.classification &&
      existingResult.classification.length
    ) {
      const classification = existingResult.classification;
      const grid: (Id<'drivers'> | null)[] = Array.from(
        { length: driverCount },
        (_, i) => classification[i] ?? null,
      );
      setSelectedDrivers(grid);
      setDriverStatuses(toStatusMap(existingResult));
    } else {
      setSelectedDrivers(Array.from({ length: driverCount }, () => null));
      setDriverStatuses({});
    }
    setUpdateMode('correction');
    setAmendmentNote('');
  }, [existingResult, selectedSession, driverCount]);

  useEffect(() => {
    setH2hCopyStatus('idle');
    return () => {
      if (h2hCopyResetTimeoutRef.current) {
        clearTimeout(h2hCopyResetTimeoutRef.current);
        h2hCopyResetTimeoutRef.current = null;
      }
    };
  }, [selectedSession]);

  // Search inputs per lane (only mounted while the lane is empty), so we can
  // move focus to the next open position after a pick.
  const laneInputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const [focusLaneIndex, setFocusLaneIndex] = useState<number | null>(null);

  useEffect(() => {
    if (focusLaneIndex == null) {
      return;
    }
    laneInputRefs.current[focusLaneIndex]?.focus();
    setFocusLaneIndex(null);
  }, [focusLaneIndex]);

  function setPosition(index: number, driverId: Id<'drivers'> | null) {
    const wasEmpty = selectedDrivers[index] == null;
    const next = [...selectedDrivers];
    next[index] = driverId;
    if (driverId != null) {
      for (let j = 0; j < next.length; j++) {
        if (j !== index && next[j] === driverId) {
          next[j] = null;
        }
      }
    }
    setSelectedDrivers(next);

    // Filling an open slot advances focus to the next open slot (preferring
    // the ones below). Edits to an already-filled lane keep focus where it is.
    if (driverId != null && wasEmpty) {
      setFocusLaneIndex(findNextEmptyLane(next, index));
    }
  }

  function setDriverStatus(
    driverId: Id<'drivers'>,
    status: DriverStatus | null,
  ) {
    setDriverStatuses((current) => {
      const next = { ...current };
      if (status === null) {
        delete next[driverId];
      } else {
        next[driverId] = status;
      }
      return next;
    });
  }

  const [activeDriverId, setActiveDriverId] = useState<string | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  );
  function handleDragStart(event: DragStartEvent) {
    setActiveDriverId(String(event.active.id));
  }
  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveDriverId(null);
    if (over == null) {
      return;
    }
    const newIndex = parseLaneId(String(over.id));
    if (newIndex == null) {
      return;
    }
    const driverId = active.id as Id<'drivers'>;
    const oldIndex = selectedDrivers.indexOf(driverId);
    if (oldIndex === -1 || oldIndex === newIndex) {
      return;
    }

    setSelectedDrivers((prev) => arrayMove(prev, oldIndex, newIndex));
  }

  // Detect whether the form has changes compared to the saved result
  function computeHasChanges() {
    if (!existingResult) {
      // New result: dirty once any driver is selected
      return selectedDrivers.some((id) => id != null);
    }
    // Compare classification order
    const savedClassification = existingResult.classification;
    const currentClassification = selectedDrivers.filter(
      (id): id is Id<'drivers'> => id != null,
    );
    if (currentClassification.length !== savedClassification.length) {
      return true;
    }
    for (let i = 0; i < currentClassification.length; i++) {
      if (currentClassification[i] !== savedClassification[i]) {
        return true;
      }
    }
    // Compare per-driver statuses (order-independent)
    const saved = toStatusMap(existingResult);
    const savedIds = Object.keys(saved);
    const currentIds = Object.keys(driverStatuses);
    if (savedIds.length !== currentIds.length) {
      return true;
    }
    return savedIds.some((id) => saved[id] !== driverStatuses[id]);
  }
  const hasChanges = computeHasChanges();
  // The stored shape is a list; the editor works with a map for lookups.
  const driverStatusEntries = Object.entries(driverStatuses).map(
    ([driverId, status]) => ({ driverId: driverId as Id<'drivers'>, status }),
  );
  const dnfDriverIds = driverStatusEntries.map((entry) => entry.driverId);

  // Warn before navigating away with unsaved changes
  const blocker = useBlocker({
    shouldBlockFn: () => hasChanges,
    enableBeforeUnload: true,
    withResolver: true,
    disabled: !hasChanges,
  });

  useEffect(() => {
    if (blocker.status !== 'blocked') {
      return;
    }
    const confirmLeave = window.confirm(
      'You have unsaved changes to the results. Leave this page?',
    );
    if (confirmLeave) {
      blocker.proceed();
    } else {
      blocker.reset();
    }
  }, [blocker]);

  const allFilledForHooks =
    selectedDrivers.length === driverCount &&
    selectedDrivers.every((id) => id != null);

  // Must be before early returns - hooks cannot run conditionally
  let classificationOrderError: string | null = null;
  if (allFilledForHooks && dnfDriverIds.length > 0) {
    let lastDnfIndex = -1;
    for (let i = 0; i < selectedDrivers.length; i++) {
      const driverId = selectedDrivers[i];
      const isDnf = dnfDriverIds.includes(driverId);
      if (isDnf) {
        lastDnfIndex = i;
      } else if (lastDnfIndex !== -1) {
        classificationOrderError = `A classified driver (P${i + 1}) is placed below an unclassified driver (P${lastDnfIndex + 1}). All unclassified (DNF/DNS/DSQ) drivers must be at the bottom of the grid.`;
        break;
      }
    }
  }

  if (isAdmin === undefined || race === undefined || drivers === undefined) {
    return <PageLoader />;
  }

  if (!isAdmin) {
    return <NotFoundPage />;
  }

  if (!race) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900">
        <div className="mx-auto max-w-4xl px-4 py-6">
          <p className="text-white">Race not found</p>
        </div>
      </div>
    );
  }

  const classification = selectedDrivers.filter(
    (id): id is Id<'drivers'> => id != null,
  );

  const scoringStatus = existingResult?.scoringStatus;
  const savedTopFive = existingResult?.enrichedClassification.slice(0, 5);
  const resultShareText =
    savedTopFive && savedTopFive.length === 5
      ? buildRaceResultShareText({
          raceName: race.name,
          sessionLabel: SESSION_LABELS[selectedSession],
          drivers: savedTopFive,
          accountHandle: siteConfig.social.x.handle,
        })
      : '';
  const resultShareUrl =
    savedTopFive && savedTopFive.length === 5
      ? `${siteConfig.url}/races/${race.slug}?${new URLSearchParams({
          ...encodeShareCardSearch({
            variant: 'result',
            session: selectedSession,
            picks: savedTopFive.map((driver) => driver.code),
          }),
          utm_source: 'x',
          utm_medium: 'social',
          utm_campaign: 'admin_share_results',
        }).toString()}`
      : '';
  const h2hReplyMatchups =
    h2hResults?.flatMap((result) => {
      const winner =
        result.driver1?._id === result.winnerId
          ? result.driver1
          : result.driver2?._id === result.winnerId
            ? result.driver2
            : null;
      const loser =
        result.driver1?._id === result.winnerId
          ? result.driver2
          : result.driver2?._id === result.winnerId
            ? result.driver1
            : null;
      return winner && loser
        ? [
            {
              team: result.team,
              winnerCode: winner.code,
              loserCode: loser.code,
            },
          ]
        : [];
    }) ?? [];
  const h2hWinnerCodes = h2hResults?.map((result) => result.winnerCode) ?? [];
  const h2hResultReplyText =
    h2hReplyMatchups.length > 0
      ? buildOfficialH2HResultReplyText({
          raceName: race.name,
          sessionLabel: SESSION_LABELS[selectedSession],
          matchups: h2hReplyMatchups,
        })
      : '';
  const h2hResultReplyUrl =
    h2hWinnerCodes.length > 0
      ? `${siteConfig.url}/races/${race.slug}?${new URLSearchParams({
          ...encodeShareCardSearch({
            variant: 'h2h_result',
            session: selectedSession,
            winners: h2hWinnerCodes,
          }),
          utm_source: 'x',
          utm_medium: 'social',
          utm_campaign: 'admin_h2h_results_reply',
        }).toString()}`
      : '';

  async function handleCopyH2HReply() {
    if (!race || !h2hResultReplyText || !h2hResultReplyUrl) {
      return;
    }

    try {
      await navigator.clipboard.writeText(
        `${h2hResultReplyText}\n\n${h2hResultReplyUrl}`,
      );
      captureAnalyticsEvent('admin_h2h_results_reply_copied', {
        race_id: typedRaceId,
        race_slug: race.slug,
        session_type: selectedSession,
        matchup_count: h2hReplyMatchups.length,
      });
      setH2hCopyStatus('copied');
      if (h2hCopyResetTimeoutRef.current) {
        clearTimeout(h2hCopyResetTimeoutRef.current);
      }
      h2hCopyResetTimeoutRef.current = setTimeout(() => {
        setH2hCopyStatus('idle');
        h2hCopyResetTimeoutRef.current = null;
      }, 2000);
    } catch (error) {
      console.error('Failed to copy H2H results reply:', error);
      setH2hCopyStatus('error');
    }
  }

  async function handleCancelRace() {
    if (
      race &&
      !window.confirm(
        `Mark "${race.name}" as called off? This will cancel any scheduled reminders.`,
      )
    ) {
      return;
    }
    setIsCancelling(true);
    try {
      await cancelRace({ raceId: typedRaceId });
    } catch (error) {
      console.error('Failed to cancel race:', error);
    } finally {
      setIsCancelling(false);
    }
  }

  async function handleRestoreRace() {
    if (race && !window.confirm(`Restore "${race.name}" to upcoming?`)) {
      return;
    }
    setIsCancelling(true);
    try {
      await restoreRace({ raceId: typedRaceId });
    } catch (error) {
      console.error('Failed to restore race:', error);
    } finally {
      setIsCancelling(false);
    }
  }

  const isAmendment = Boolean(existingResult) && updateMode === 'amendment';
  const trimmedAmendmentNote = amendmentNote.trim();
  const amendmentNoteMissing = isAmendment && trimmedAmendmentNote.length === 0;

  async function handlePublish() {
    if (classificationOrderError || sessionOrderBlocked) {
      return;
    }
    if (!allFilledForHooks || amendmentNoteMissing) {
      return;
    }
    const confirmMessage = isAmendment
      ? `Publish an OFFICIAL AMENDMENT to ${SESSION_LABELS[selectedSession]} results for "${race?.name}"? Everyone who predicted this session will be rescored and notified with your note.`
      : existingResult
        ? `Silently correct ${SESSION_LABELS[selectedSession]} results for "${race?.name}"? Scores are recalculated but players are not notified.`
        : `Publish ${SESSION_LABELS[selectedSession]} results for "${race?.name}"? This will trigger scoring for all users.`;
    if (race && !window.confirm(confirmMessage)) {
      return;
    }
    setIsPublishing(true);
    try {
      await publishResults({
        raceId: typedRaceId,
        classification,
        sessionType: selectedSession,
        dnfDriverIds,
        driverStatuses: driverStatusEntries,
        amendmentNote: isAmendment ? trimmedAmendmentNote : undefined,
        pauseRecheck,
      });
      captureAnalyticsEvent('admin_results_published', {
        race_id: typedRaceId,
        race_slug: race?.slug,
        session_type: selectedSession,
        classification_count: classification.length,
        dnf_count: dnfDriverIds.length,
        is_update: Boolean(existingResult),
        is_amendment: isAmendment,
      });
    } catch (error) {
      captureAnalyticsEvent('admin_results_publish_failed', {
        race_id: typedRaceId,
        race_slug: race?.slug,
        session_type: selectedSession,
        classification_count: classification.length,
        dnf_count: dnfDriverIds.length,
        is_update: Boolean(existingResult),
        is_amendment: isAmendment,
      });
      console.error('Failed to publish:', error);
    } finally {
      setIsPublishing(false);
    }
  }

  /**
   * Load what live timing currently says into the picker, without publishing.
   *
   * The point is the verification step: OpenF1's official classification can
   * lag the flag by over an hour, and the live order is right far more often
   * than not, but "far more often than not" is not a thing to publish
   * unattended. So this fills the form and leaves the existing publish button
   * (and its confirm) to do what it always does.
   */
  async function handlePreviewLive() {
    const sessionType = selectedSession;
    setIsPreviewingLive(true);
    setLivePreview(null);
    try {
      const preview = await previewLiveResults({
        raceId: typedRaceId,
        sessionType,
      });
      setLivePreview({ sessionType, ...preview });
      if (preview.ok && preview.order) {
        setSelectedDrivers((current) => {
          const next = [...current];
          preview.order?.forEach((entry, index) => {
            next[index] = entry.driverId;
          });
          return next;
        });
        // Live timing carries no DNF/DSQ flags, so anything previously marked
        // would be a leftover from a different source.
        setDriverStatuses({});
      }
    } catch (error) {
      setLivePreview({
        sessionType,
        ok: false,
        message: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setIsPreviewingLive(false);
    }
  }

  async function handleFetchResultsNow() {
    const sessionType = selectedSession;
    setIsFetchingNow(true);
    setFetchNowOutcome(null);
    try {
      const outcome = await fetchResultsNow({
        raceId: typedRaceId,
        sessionType,
      });
      setFetchNowOutcome({
        sessionType,
        ok: outcome.ok,
        message: outcome.message,
      });
    } catch (error) {
      // Only the gate and lookup failures reach here: the fetch itself
      // reports OpenF1's own answer through `outcome`.
      setFetchNowOutcome({
        sessionType,
        ok: false,
        message: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setIsFetchingNow(false);
    }
  }

  async function handleUnattendedChange(enabled: boolean) {
    setIsUpdatingUnattended(true);
    try {
      await setUnattended({
        raceId: typedRaceId,
        sessionType: selectedSession,
        enabled,
      });
    } catch (error) {
      console.error('Failed to update unattended result setting:', error);
    } finally {
      setIsUpdatingUnattended(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900">
      <div className="mx-auto max-w-4xl px-4 py-6">
        <Button
          asChild
          size="sm"
          variant="text"
          leftIcon={ArrowLeft}
          className="mb-8"
        >
          <Link to="/admin">Back to Admin</Link>
        </Button>

        <RaceStatusHeader
          race={race}
          isCancelling={isCancelling}
          onCancel={() => void handleCancelRace()}
          onRestore={() => void handleRestoreRace()}
        />

        <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-6">
          <div className="mb-4 flex items-center gap-2">
            <Trophy className="h-5 w-5 text-yellow-400" />
            <h2 className="text-xl font-semibold text-white">
              {existingResult ? 'Update Results' : 'Publish Results'}
            </h2>
          </div>

          <div className="mb-6">
            <div className="flex gap-1 rounded-lg border border-slate-700 bg-slate-900/50 p-1">
              {availableSessions.map((session) => (
                <button
                  key={session}
                  onClick={() => setSelectedSession(session)}
                  className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                    selectedSession === session
                      ? 'bg-yellow-500 text-black'
                      : 'text-slate-400 hover:bg-slate-700 hover:text-white'
                  }`}
                >
                  {SESSION_LABELS[session]}
                </button>
              ))}
            </div>
          </div>

          {sessionOrderBlocked && (
            <div className="mb-4 flex items-start gap-3 rounded-lg border border-amber-500/30 bg-amber-500/10 p-4">
              <CircleAlert className="mt-0.5 h-5 w-5 shrink-0 text-amber-400" />
              <p className="text-sm text-amber-300">
                Results are published in weekend order. Publish{' '}
                {missingEarlierSessions
                  .map((session) => SESSION_LABELS[session])
                  .join(' and ')}{' '}
                results before {SESSION_LABELS[selectedSession]}.
              </p>
            </div>
          )}

          {openF1Fallback && !existingResult && (
            <div className="mb-4 rounded-lg border border-sky-500/30 bg-sky-500/10 p-4">
              <div className="flex items-start gap-3">
                {openF1Fallback.poll?.status === 'polling' ? (
                  <Loader2 className="mt-0.5 h-5 w-5 shrink-0 animate-spin text-sky-400" />
                ) : (
                  <CircleAlert className="mt-0.5 h-5 w-5 shrink-0 text-sky-400" />
                )}
                <div className="min-w-0">
                  <p className="text-sm font-medium text-sky-200">
                    OpenF1 fallback:{' '}
                    {openF1Fallback.poll?.status.replaceAll('_', ' ') ??
                      'scheduled'}
                  </p>
                  <p className="mt-1 text-sm text-slate-300">
                    Automatic polling starts{' '}
                    {new Date(openF1Fallback.firstAttemptAt).toLocaleString()}{' '}
                    and stops at{' '}
                    {new Date(openF1Fallback.deadlineAt).toLocaleString()}.
                    Manual publication always takes priority.
                  </p>
                  <label className="mt-3 flex cursor-pointer items-start gap-2 text-sm text-slate-200">
                    <input
                      type="checkbox"
                      checked={openF1Fallback.unattended}
                      disabled={isUpdatingUnattended}
                      onChange={(event) =>
                        void handleUnattendedChange(event.target.checked)
                      }
                      className="mt-0.5 h-4 w-4 rounded border-slate-500 bg-slate-800 text-yellow-400 disabled:cursor-wait"
                    />
                    <span>
                      I won&apos;t be watching this session live
                      <span className="mt-0.5 block text-xs text-slate-400">
                        From the estimated finish until results publish, show a
                        banner saying they&apos;ll arrive around 45 minutes
                        later.
                      </span>
                    </span>
                  </label>
                  {openF1Fallback.poll &&
                    openF1Fallback.poll.attemptCount > 0 && (
                      <p className="mt-1 text-xs text-slate-400">
                        {openF1Fallback.poll.attemptCount}{' '}
                        {openF1Fallback.poll.attemptCount === 1
                          ? 'attempt'
                          : 'attempts'}
                        {openF1Fallback.poll.lastError
                          ? ` · ${openF1Fallback.poll.lastError}`
                          : ''}
                      </p>
                    )}

                  {/* Run the fetch the cron would run, now. Useful the moment
                      a session is done and the wait for the next 5-minute tick
                      (or for the first-attempt window to open at all) is the
                      only thing standing between players and their scores. */}
                  <div className="mt-3 flex flex-wrap items-center gap-3">
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      leftIcon={RefreshCw}
                      disabled={isFetchingNow}
                      onClick={() => void handleFetchResultsNow()}
                    >
                      {isFetchingNow
                        ? 'Fetching from OpenF1...'
                        : 'Fetch results now'}
                    </Button>
                    <span className="text-xs text-slate-400">
                      Publishes automatically if OpenF1 already has the
                      classification.
                    </span>
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      leftIcon={ListChecks}
                      disabled={isPreviewingLive}
                      onClick={() => void handlePreviewLive()}
                    >
                      {isPreviewingLive
                        ? 'Reading live timing...'
                        : 'Preview from live timing'}
                    </Button>
                    <span className="text-xs text-slate-400">
                      Fills the grid below from the live feed. Nothing is
                      published until you press Publish.
                    </span>
                  </div>

                  {livePreview &&
                    livePreview.sessionType === selectedSession && (
                      <div className="mt-3 rounded-lg border border-slate-600 bg-slate-900/60 p-3">
                        <p
                          className={`text-sm font-medium ${
                            livePreview.ok
                              ? livePreview.provisional
                                ? 'text-amber-300'
                                : 'text-emerald-300'
                              : 'text-red-300'
                          }`}
                        >
                          {livePreview.message}
                        </p>
                        {livePreview.ok && livePreview.settled === false && (
                          <p className="mt-1 text-xs text-amber-300">
                            The position feed is still settling. It is only
                            trusted from{' '}
                            {livePreview.settledAt
                              ? new Date(
                                  livePreview.settledAt,
                                ).toLocaleTimeString()
                              : 'shortly after the flag'}
                            . Check every place against the broadcast before
                            publishing.
                          </p>
                        )}
                        {livePreview.stewardsMessages &&
                          livePreview.stewardsMessages.length > 0 && (
                            <ul className="mt-2 space-y-1">
                              {livePreview.stewardsMessages.map((entry) => (
                                <li
                                  key={entry}
                                  className="text-xs text-amber-200"
                                >
                                  {entry}
                                </li>
                              ))}
                            </ul>
                          )}
                        {livePreview.order && (
                          <ol className="mt-3 grid grid-cols-1 gap-x-6 gap-y-1 sm:grid-cols-2">
                            {livePreview.order.map((entry) => (
                              <li
                                key={entry.driverId}
                                className={`flex items-baseline gap-2 text-sm ${
                                  entry.blocked
                                    ? 'text-amber-300'
                                    : 'text-slate-200'
                                }`}
                              >
                                <span className="w-6 shrink-0 text-right text-slate-400 tabular-nums">
                                  {entry.position}
                                </span>
                                <span className="font-medium">
                                  {entry.code}
                                </span>
                                <span className="truncate text-slate-400">
                                  {entry.displayName}
                                </span>
                                {entry.blocked && (
                                  <span className="shrink-0 text-xs">
                                    under investigation
                                  </span>
                                )}
                              </li>
                            ))}
                          </ol>
                        )}
                      </div>
                    )}
                  {fetchNowOutcome &&
                    fetchNowOutcome.sessionType === selectedSession && (
                      <p
                        role="status"
                        className={`mt-2 flex items-start gap-2 text-sm ${
                          fetchNowOutcome.ok
                            ? 'text-emerald-300'
                            : 'text-red-300'
                        }`}
                      >
                        {fetchNowOutcome.ok ? (
                          <Check className="mt-0.5 h-4 w-4 shrink-0" />
                        ) : (
                          <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" />
                        )}
                        <span>{fetchNowOutcome.message}</span>
                      </p>
                    )}
                </div>
              </div>
            </div>
          )}

          <p className="mb-4 text-slate-400">
            Enter the full classification for {SESSION_LABELS[selectedSession]}{' '}
            (P1 to P{driverCount}). Type to search, or drag the grip to reorder
            (e.g. after a penalty).
          </p>

          <DndContext
            sensors={sensors}
            collisionDetection={pointerWithin}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            <div className="mb-6 space-y-2">
              {Array.from({ length: driverCount }).map((_, index) => {
                const driverId = selectedDrivers[index] ?? null;
                const excludedIds = selectedDrivers.filter(
                  (id, j) => id != null && j !== index,
                ) as Id<'drivers'>[];

                return (
                  <PositionLane
                    key={`lane-${index}`}
                    index={index}
                    driverId={driverId}
                    excludedIds={excludedIds}
                    drivers={drivers}
                    setPosition={setPosition}
                    driverStatuses={driverStatuses}
                    setDriverStatus={setDriverStatus}
                    activeDriverId={activeDriverId}
                    registerInput={(el) => {
                      laneInputRefs.current[index] = el;
                    }}
                  />
                );
              })}
            </div>
          </DndContext>

          {classificationOrderError && (
            <div className="mb-4 flex items-start gap-3 rounded-lg border border-red-500/30 bg-red-500/10 p-4">
              <CircleAlert className="mt-0.5 h-5 w-5 shrink-0 text-red-400" />
              <p className="text-sm text-red-300">{classificationOrderError}</p>
            </div>
          )}

          {existingResult && (
            <UpdateModeSelector
              updateMode={updateMode}
              onUpdateModeChange={setUpdateMode}
              amendmentNote={amendmentNote}
              onAmendmentNoteChange={setAmendmentNote}
              amendedAt={existingResult.amendedAt}
              previousAmendmentNote={existingResult.amendmentNote}
              pauseRecheck={pauseRecheck}
              onPauseRecheckChange={setPauseRecheck}
            />
          )}

          <div className="flex items-center gap-4">
            <button
              onClick={handlePublish}
              disabled={
                !allFilledForHooks ||
                isPublishing ||
                scoringStatus === 'scoring' ||
                !!classificationOrderError ||
                sessionOrderBlocked ||
                amendmentNoteMissing ||
                (!!existingResult && !hasChanges)
              }
              className="flex items-center gap-2 rounded-lg bg-yellow-500 px-6 py-3 font-semibold text-black transition-colors hover:bg-yellow-600 disabled:cursor-not-allowed disabled:bg-slate-600"
            >
              {isPublishing ? (
                <>
                  <Loader2 size={20} className="animate-spin" />
                  Publishing...
                </>
              ) : scoringStatus === 'scoring' ? (
                <>
                  <Loader2 size={20} className="animate-spin" />
                  Scoring in progress...
                </>
              ) : isAmendment ? (
                <>
                  <Save size={20} />
                  Publish {SESSION_LABELS[selectedSession]} Amendment
                </>
              ) : existingResult ? (
                <>
                  <Save size={20} />
                  Silently Correct {SESSION_LABELS[selectedSession]} Results
                </>
              ) : (
                <>
                  <Save size={20} />
                  Publish {SESSION_LABELS[selectedSession]} Results
                </>
              )}
            </button>
            {scoringStatus === 'complete' && (
              <span className="flex items-center gap-1.5 text-sm text-emerald-400">
                <Check size={16} />
                Scored
              </span>
            )}
            {resultShareText && resultShareUrl && (
              <ShareOnXButton
                text={resultShareText}
                url={resultShareUrl}
                analyticsEvent="admin_results_shared_x"
                analyticsProps={{
                  race_id: typedRaceId,
                  race_slug: race.slug,
                  session_type: selectedSession,
                }}
                label={`Share ${SESSION_LABELS[selectedSession]} results`}
                className="border-slate-600 px-4 py-3 text-sm text-white hover:border-yellow-400 hover:text-yellow-400 focus-visible:ring-yellow-400/60 focus-visible:ring-offset-slate-800"
              />
            )}
            {h2hResultReplyText && h2hResultReplyUrl && (
              <button
                type="button"
                onClick={() => void handleCopyH2HReply()}
                aria-label={`Copy ${SESSION_LABELS[selectedSession]} H2H results reply`}
                className="inline-flex items-center gap-2 rounded-lg border border-slate-600 px-4 py-3 text-sm font-semibold text-white transition-colors hover:border-yellow-400 hover:text-yellow-400 focus-visible:ring-2 focus-visible:ring-yellow-400/60 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-800 focus-visible:outline-none"
              >
                {h2hCopyStatus === 'copied' ? (
                  <Check size={18} aria-hidden="true" />
                ) : (
                  <Copy size={18} aria-hidden="true" />
                )}
                {h2hCopyStatus === 'copied'
                  ? 'H2H reply copied'
                  : h2hCopyStatus === 'error'
                    ? 'Copy failed'
                    : 'Copy H2H reply'}
              </button>
            )}
            {!allFilledForHooks && (
              <span className="text-sm text-slate-400">
                Fill all {driverCount} positions to publish
              </span>
            )}
            {allFilledForHooks && amendmentNoteMissing && (
              <span className="text-sm text-slate-400">
                Add an amendment note to publish
              </span>
            )}
          </div>
        </div>
        <PracticeSocialPanel
          operations={practiceOperations}
          summary={practiceSummary}
        />
        <SocialCardsPanel
          practiceSessions={(practiceSummary?.sessions ?? []).map(
            (session) => session.sessionType,
          )}
          raceSlug={race?.slug}
          resultSessions={submittedSessions ?? []}
        />
      </div>
    </div>
  );
}
