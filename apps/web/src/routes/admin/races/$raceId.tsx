import { api } from '@convex-generated/api';
import type { Doc, Id } from '@convex-generated/dataModel';
import type { DragEndEvent, DragStartEvent } from '@dnd-kit/core';
import {
  DndContext,
  PointerSensor,
  pointerWithin,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { arrayMove } from '@dnd-kit/sortable';
import { createFileRoute, Link, useBlocker } from '@tanstack/react-router';
import { useMutation, useQuery } from 'convex/react';
import {
  ArrowLeft,
  Ban,
  Check,
  CircleAlert,
  GripVertical,
  Loader2,
  RotateCcw,
  Save,
  Trophy,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import { Button } from '@/components/Button/Button';
import { DriverSearchSelect } from '@/components/DriverSearchSelect';
import { PageLoader } from '@/components/PageLoader';
import { ShareOnXButton } from '@/components/ShareOnXButton';
import { captureAnalyticsEvent } from '@/lib/analytics';
import { encodeShareCardSearch } from '@/lib/og/shareCard';
import {
  buildOfficialH2HResultShareText,
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

const LANE_ID_PREFIX = 'lane-';

function parseLaneId(id: string): number | null {
  if (!id.startsWith(LANE_ID_PREFIX)) {
    return null;
  }
  const n = parseInt(id.slice(LANE_ID_PREFIX.length), 10);
  return Number.isNaN(n) ? null : n;
}

/** Nearest empty lane below `fromIndex`, falling back to the nearest one above. */
function findNextEmptyLane(
  lanes: ReadonlyArray<Id<'drivers'> | null>,
  fromIndex: number,
): number | null {
  for (let i = fromIndex + 1; i < lanes.length; i++) {
    if (lanes[i] == null) {
      return i;
    }
  }
  for (let i = fromIndex - 1; i >= 0; i--) {
    if (lanes[i] == null) {
      return i;
    }
  }
  return null;
}

type DraggableDriverCardProps = {
  driverId: Id<'drivers'>;
  index: number;
  excludedIds: Id<'drivers'>[];
  drivers: Doc<'drivers'>[];
  setPosition: (index: number, driverId: Id<'drivers'> | null) => void;
  toggleClassified: (driverId: Id<'drivers'>) => void;
  dnfDriverIds: Id<'drivers'>[];
  registerInput: (el: HTMLInputElement | null) => void;
};

function DraggableDriverCard({
  driverId,
  index,
  excludedIds,
  drivers,
  setPosition,
  toggleClassified,
  dnfDriverIds,
  registerInput,
}: DraggableDriverCardProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id: driverId,
      data: { index },
    });

  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
      }
    : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-2 rounded-lg ${
        isDragging
          ? 'z-20 cursor-grabbing bg-slate-800 shadow-xl ring-2 ring-yellow-500/50'
          : ''
      }`}
    >
      <div
        {...attributes}
        {...listeners}
        className="flex shrink-0 cursor-grab touch-none items-center rounded p-1 text-slate-400 hover:bg-slate-600 hover:text-slate-200 active:cursor-grabbing"
        aria-label="Drag to reorder"
      >
        <GripVertical size={20} />
      </div>
      <div className="min-w-0 flex-1">
        <DriverSearchSelect
          drivers={drivers}
          value={driverId}
          excludedIds={excludedIds}
          onChange={(id) => setPosition(index, id)}
          placeholder="Search by name or code…"
          inputRef={registerInput}
        />
      </div>
      <label className="flex shrink-0 items-center gap-2 text-xs text-slate-400">
        <input
          type="checkbox"
          checked={!dnfDriverIds.includes(driverId)}
          onChange={() => toggleClassified(driverId)}
          className="h-3 w-3 rounded border-slate-500 bg-slate-800 text-yellow-400"
        />
        Classified
      </label>
    </div>
  );
}

type PositionLaneProps = {
  index: number;
  driverId: Id<'drivers'> | null;
  excludedIds: Id<'drivers'>[];
  drivers: Doc<'drivers'>[];
  setPosition: (index: number, driverId: Id<'drivers'> | null) => void;
  toggleClassified: (driverId: Id<'drivers'>) => void;
  dnfDriverIds: Id<'drivers'>[];
  activeDriverId: string | null;
  registerInput: (el: HTMLInputElement | null) => void;
};

function PositionLane({
  index,
  driverId,
  excludedIds,
  drivers,
  setPosition,
  toggleClassified,
  dnfDriverIds,
  activeDriverId,
  registerInput,
}: PositionLaneProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: `${LANE_ID_PREFIX}${index}`,
    data: { index },
  });

  const isPlaceholder = driverId != null && activeDriverId === driverId;

  return (
    <div className="flex items-stretch gap-2">
      {/* Fixed position label */}
      <div
        className="flex w-12 shrink-0 items-center justify-center rounded-l-lg border border-r-0 border-slate-600 bg-slate-800/80 text-sm font-bold text-yellow-400"
        aria-hidden
      >
        P{index + 1}
      </div>
      {/* Droppable lane */}
      <div
        ref={setNodeRef}
        className={`min-h-[52px] min-w-0 flex-1 rounded-r-lg border border-slate-600 transition-colors ${
          isOver ? 'border-yellow-500 bg-yellow-500/10' : 'bg-slate-800/30'
        } ${isPlaceholder ? 'border-dashed' : ''}`}
      >
        {driverId != null && !isPlaceholder ? (
          <div className="p-1.5">
            <DraggableDriverCard
              driverId={driverId}
              index={index}
              excludedIds={excludedIds}
              drivers={drivers}
              setPosition={setPosition}
              toggleClassified={toggleClassified}
              dnfDriverIds={dnfDriverIds}
              registerInput={registerInput}
            />
          </div>
        ) : isPlaceholder ? (
          <div className="flex h-full min-h-[50px] items-center justify-center rounded border-2 border-dashed border-slate-500 text-sm text-slate-500">
            Drop here
          </div>
        ) : (
          <div className="p-1.5">
            {/* Mirrors the filled-lane row (grip + select + checkbox) with
                invisible placeholders so picking a driver causes no layout shift. */}
            <div className="flex items-center gap-2">
              <div className="invisible shrink-0 p-1" aria-hidden>
                <GripVertical size={20} />
              </div>
              <div className="min-w-0 flex-1">
                <DriverSearchSelect
                  drivers={drivers}
                  value={null}
                  excludedIds={excludedIds}
                  onChange={(id) => setPosition(index, id)}
                  placeholder="Search by name or code…"
                  inputRef={registerInput}
                />
              </div>
              <span
                className="invisible flex shrink-0 items-center gap-2 text-xs"
                aria-hidden
              >
                <span className="h-3 w-3" />
                Classified
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export const Route = createFileRoute('/admin/races/$raceId')({
  component: AdminRaceDetailPage,
  head: () => ({
    meta: [
      { title: 'Admin Race Detail | Grand Prix Picks' },
      { name: 'robots', content: 'noindex, nofollow' },
    ],
  }),
});

function AdminRaceDetailPage() {
  const { raceId } = Route.useParams();
  const typedRaceId = raceId as Id<'races'>;
  const isAdmin = useQuery(api.users.amIAdmin);
  const race = useQuery(api.races.getRace, { raceId: typedRaceId });
  const drivers = useQuery(api.drivers.listDrivers);
  const submittedSessions = useQuery(api.results.getAllResultsForRace, {
    raceId: typedRaceId,
  });

  const [selectedSession, setSelectedSession] = useState<SessionType>('race');

  const existingResult = useQuery(api.results.getResultForRace, {
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
  const [dnfDriverIds, setDnfDriverIds] = useState<Id<'drivers'>[]>([]);
  const publishResults = useMutation(api.results.adminPublishResults);
  const cancelRace = useMutation(api.races.adminCancelRace);
  const restoreRace = useMutation(api.races.adminRestoreRace);
  const [isPublishing, setIsPublishing] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  // Republishing an existing result is either a quiet data-entry fix or an
  // official amendment that notifies players (with a required note).
  const [updateMode, setUpdateMode] = useState<'correction' | 'amendment'>(
    'correction',
  );
  const [amendmentNote, setAmendmentNote] = useState('');

  const driverCount = drivers?.length ?? 0;
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
      setDnfDriverIds(existingResult.dnfDriverIds ?? []);
    } else {
      setSelectedDrivers(Array.from({ length: driverCount }, () => null));
      setDnfDriverIds([]);
    }
    setUpdateMode('correction');
    setAmendmentNote('');
  }, [existingResult, selectedSession, driverCount]);

  // Search inputs per lane (only mounted while the lane is empty), so we can
  // move focus to the next open position after a pick.
  const laneInputRefs = useRef<Array<HTMLInputElement | null>>([]);
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

  function toggleClassified(driverId: Id<'drivers'>) {
    setDnfDriverIds((current) =>
      current.includes(driverId)
        ? current.filter((id) => id !== driverId)
        : [...current, driverId],
    );
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
    // Compare DNF lists (order-independent)
    const savedDnf = [...(existingResult.dnfDriverIds ?? [])].sort();
    const currentDnf = [...dnfDriverIds].sort();
    if (savedDnf.length !== currentDnf.length) {
      return true;
    }
    for (let i = 0; i < savedDnf.length; i++) {
      if (savedDnf[i] !== currentDnf[i]) {
        return true;
      }
    }
    return false;
  }
  const hasChanges = computeHasChanges();

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

  const driverCountForHooks = drivers?.length ?? 0;
  const allFilledForHooks =
    selectedDrivers.length === driverCountForHooks &&
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
        classificationOrderError = `A classified driver (P${i + 1}) is placed below an unclassified driver (P${lastDnfIndex + 1}). All unclassified (DNF/DSQ) drivers must be at the bottom of the grid.`;
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
          raceHashtag: race.hashtag,
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
  const h2hWinnerCodes = h2hResults?.map((result) => result.winnerCode) ?? [];
  const h2hResultShareText =
    h2hWinnerCodes.length > 0
      ? buildOfficialH2HResultShareText({
          raceName: race.name,
          sessionLabel: SESSION_LABELS[selectedSession],
          winnerCodes: h2hWinnerCodes,
          accountHandle: siteConfig.social.x.handle,
          raceHashtag: race.hashtag,
        })
      : '';
  const h2hResultShareUrl =
    h2hWinnerCodes.length > 0
      ? `${siteConfig.url}/races/${race.slug}?${new URLSearchParams({
          ...encodeShareCardSearch({
            variant: 'h2h_result',
            session: selectedSession,
            winners: h2hWinnerCodes,
          }),
          utm_source: 'x',
          utm_medium: 'social',
          utm_campaign: 'admin_share_h2h_results',
        }).toString()}`
      : '';

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
        amendmentNote: isAmendment ? trimmedAmendmentNote : undefined,
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

        <div className="mb-6 rounded-xl border border-slate-700 bg-slate-800/50 p-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <span className="text-sm font-medium text-slate-500">
                Round {race.round} - {race.season}
              </span>
              <h1 className="mt-1 text-2xl font-bold text-white">
                {race.name}
              </h1>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <span
                className={`rounded-full px-3 py-1 text-sm ${
                  race.status === 'upcoming'
                    ? 'bg-emerald-500/20 text-emerald-400'
                    : race.status === 'locked'
                      ? 'bg-amber-500/20 text-amber-400'
                      : race.status === 'cancelled'
                        ? 'bg-red-500/20 text-red-400'
                        : 'bg-slate-500/20 text-slate-400'
                }`}
              >
                {race.status === 'cancelled' ? 'Called Off' : race.status}
              </span>
              {race.status !== 'finished' &&
                race.status !== 'locked' &&
                (race.status === 'cancelled' ? (
                  <button
                    onClick={handleRestoreRace}
                    disabled={isCancelling}
                    className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isCancelling ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <RotateCcw size={14} />
                    )}
                    Restore
                  </button>
                ) : (
                  <button
                    onClick={handleCancelRace}
                    disabled={isCancelling}
                    className="flex items-center gap-1.5 rounded-lg bg-red-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isCancelling ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <Ban size={14} />
                    )}
                    Mark Called Off
                  </button>
                ))}
            </div>
          </div>
        </div>

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
                    toggleClassified={toggleClassified}
                    dnfDriverIds={dnfDriverIds}
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
            <div className="mb-6 rounded-lg border border-slate-700 bg-slate-900/50 p-4">
              <p className="mb-3 text-sm font-semibold text-white">
                How should this update go out?
              </p>
              <div className="space-y-2">
                <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-slate-700 p-3 transition-colors has-checked:border-yellow-500/60 has-checked:bg-yellow-500/5">
                  <input
                    type="radio"
                    name="update-mode"
                    checked={updateMode === 'correction'}
                    onChange={() => setUpdateMode('correction')}
                    className="mt-0.5 accent-yellow-500"
                  />
                  <span>
                    <span className="block text-sm font-medium text-white">
                      Silent correction
                    </span>
                    <span className="block text-sm text-slate-400">
                      I entered the results wrong. Recalculate scores quietly —
                      players are not notified.
                    </span>
                  </span>
                </label>
                <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-slate-700 p-3 transition-colors has-checked:border-yellow-500/60 has-checked:bg-yellow-500/5">
                  <input
                    type="radio"
                    name="update-mode"
                    checked={updateMode === 'amendment'}
                    onChange={() => setUpdateMode('amendment')}
                    className="mt-0.5 accent-yellow-500"
                  />
                  <span>
                    <span className="block text-sm font-medium text-white">
                      Official amendment
                    </span>
                    <span className="block text-sm text-slate-400">
                      The real-world result changed (penalty, stewards&apos;
                      decision). Players who predicted this session are rescored
                      and notified, and your note is shown on the race page.
                    </span>
                  </span>
                </label>
              </div>
              {updateMode === 'amendment' && (
                <div className="mt-3">
                  <textarea
                    value={amendmentNote}
                    onChange={(e) => setAmendmentNote(e.target.value)}
                    rows={2}
                    maxLength={280}
                    placeholder={`e.g. "Stewards' decision: Gasly retains P3 after post-race review"`}
                    className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:border-yellow-500 focus:outline-none"
                  />
                  <p className="mt-1 text-xs text-slate-500">
                    Shown to players word-for-word — say what changed and why.
                  </p>
                </div>
              )}
              {existingResult.amendedAt != null &&
                existingResult.amendmentNote && (
                  <p className="mt-3 text-xs text-slate-500">
                    Previously amended{' '}
                    {new Date(existingResult.amendedAt).toLocaleString()}:
                    &ldquo;{existingResult.amendmentNote}&rdquo;
                  </p>
                )}
            </div>
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
                label={`Share ${SESSION_LABELS[selectedSession]} results on X`}
                className="border-slate-600 px-4 py-3 text-sm text-white hover:border-yellow-400 hover:text-yellow-400 focus-visible:ring-yellow-400/60 focus-visible:ring-offset-slate-800"
              />
            )}
            {h2hResultShareText && h2hResultShareUrl && (
              <ShareOnXButton
                text={h2hResultShareText}
                url={h2hResultShareUrl}
                analyticsEvent="admin_h2h_results_shared_x"
                analyticsProps={{
                  race_id: typedRaceId,
                  race_slug: race.slug,
                  session_type: selectedSession,
                  matchup_count: h2hWinnerCodes.length,
                }}
                label={`Share ${SESSION_LABELS[selectedSession]} H2H on X`}
                className="border-slate-600 px-4 py-3 text-sm text-white hover:border-yellow-400 hover:text-yellow-400 focus-visible:ring-yellow-400/60 focus-visible:ring-offset-slate-800"
              />
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
      </div>
    </div>
  );
}
