import { api } from '@convex-generated/api';
import type { Doc, Id } from '@convex-generated/dataModel';
import {
  getWebH2HDraftStorageKey,
  getWebTop5DraftStorageKey,
} from '@grandprixpicks/shared/picks';
import { useQuery } from 'convex/react';
import { ChevronLeft } from 'lucide-react';
import { lazy, Suspense, useEffect, useRef, useState } from 'react';

import { Button } from '@/components/Button/Button';
import { FALLBACK_TEAM_COLOR, TEAM_COLORS } from '@/components/DriverBadge';
import { abbreviateGrandPrix } from '@/lib/display';
import {
  clearPendingSubmit,
  clearPredictionDraft,
  setPendingSubmit,
} from '@/lib/predictionDrafts';
import { captureAnalyticsEvent } from '@/lib/analytics';

type PicksStep = 'top5' | 'h2h';
export type LandingPicksInitialStep =
  | 'top5'
  | 'teammate-handoff'
  | 'teammate-manual';

const LandingTopFivePicker = lazy(() =>
  import('./LandingTopFivePicker').then((module) => ({
    default: module.LandingTopFivePicker,
  })),
);
const H2HPredictionForm = lazy(() =>
  import('@/components/H2HPredictionForm').then((module) => ({
    default: module.H2HPredictionForm,
  })),
);

export const LANDING_PICKS_ANCHOR = 'make-picks';

/**
 * The real picker, embedded in the landing page. Not a screenshot and not a
 * scripted animation: a signed-out visitor completes both prediction steps,
 * the picks are kept as device drafts, and only the full card asks for an
 * account.
 */
export function LandingPicks({
  raceId,
  raceName,
  raceSlug,
  season,
  sessionLabel,
  initialDrivers,
  initialStep = 'top5',
}: {
  raceId: Id<'races'>;
  raceName: string;
  raceSlug: string;
  season: number;
  /** Session whose picks lock next, e.g. "Qualifying". */
  sessionLabel: string;
  /** SSR seed so the landing picker is usable before Convex subscriptions boot. */
  initialDrivers: Array<Doc<'drivers'>>;
  /**
   * Initial funnel entry point. The default is the real signed-out journey;
   * focused previews can open directly on either teammate-pick state.
   */
  initialStep?: LandingPicksInitialStep;
}) {
  const [activeStep, setActiveStep] = useState<PicksStep>(
    initialStep === 'top5' ? 'top5' : 'h2h',
  );
  const [h2hVisited, setH2HVisited] = useState(initialStep !== 'top5');
  const [topFiveComplete, setTopFiveComplete] = useState(
    initialStep === 'teammate-handoff',
  );
  const [h2hEntryMethod, setH2HEntryMethod] = useState<
    'manual' | 'top5_handoff'
  >(initialStep === 'teammate-handoff' ? 'top5_handoff' : 'manual');
  const [topFivePicks, setTopFivePicks] = useState<Array<Id<'drivers'>>>([]);
  /** Bumped by "Start over" to remount both pickers with empty state. */
  const [pickerGeneration, setPickerGeneration] = useState(0);
  const [draftNoticeTarget, setDraftNoticeTarget] =
    useState<HTMLDivElement | null>(null);
  const sectionRef = useRef<HTMLElement>(null);
  const stepHeaderRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const viewedRef = useRef(false);
  const handoffCapturedRef = useRef(false);
  const handoffCompletedRef = useRef(false);
  const matchups = useQuery(
    api.h2h.getMatchupsForSeason,
    h2hVisited ? { season } : 'skip',
  );

  // Slot number per driver, so a teammate battle can show the call already
  // made about that driver upstairs instead of asking twice.
  const topFivePositions = Object.fromEntries(
    topFivePicks.map((driverId, index) => [driverId, index + 1]),
  );

  function revealActiveStep() {
    window.requestAnimationFrame(() => {
      const reduceMotion =
        typeof window.matchMedia === 'function' &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      stepHeaderRef.current?.scrollIntoView?.({
        behavior: reduceMotion ? 'auto' : 'smooth',
        block: 'start',
      });
      panelRef.current?.focus({ preventScroll: true });
    });
  }

  useEffect(() => {
    const section = sectionRef.current;
    if (!section || typeof IntersectionObserver === 'undefined') {
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting || viewedRef.current) {
          return;
        }
        viewedRef.current = true;
        captureAnalyticsEvent('landing_picker_viewed', {
          race_id: raceId,
          race_slug: raceSlug,
          session_label: sessionLabel,
        });
        observer.disconnect();
      },
      { threshold: 0.2 },
    );
    observer.observe(section);
    return () => observer.disconnect();
  }, [raceId, raceSlug, sessionLabel]);

  function editTopFive() {
    setActiveStep('top5');
    captureAnalyticsEvent('landing_picker_step_changed', {
      race_id: raceId,
      race_slug: raceSlug,
      prediction_type: 'top5',
    });
    revealActiveStep();
  }

  /**
   * Both steps are one prediction card, so "Start over" empties the card:
   * either draft is cleared, the funnel returns to step 1 and both pickers
   * remount on a bumped key so no stale in-memory selection survives the reset.
   */
  function startOver() {
    const top5Key = getWebTop5DraftStorageKey(raceId);
    const h2hKey = getWebH2HDraftStorageKey(raceId);
    for (const key of [top5Key, h2hKey]) {
      clearPredictionDraft(key);
      clearPendingSubmit(key);
    }
    setTopFivePicks([]);
    setTopFiveComplete(false);
    setH2HVisited(false);
    setH2HEntryMethod('manual');
    setActiveStep('top5');
    setPickerGeneration((generation) => generation + 1);
    captureAnalyticsEvent('landing_picks_started_over', {
      race_id: raceId,
      race_slug: raceSlug,
      from_step: activeStep,
    });
  }

  function handleTopFiveComplete() {
    setH2HEntryMethod('top5_handoff');
    if (!handoffCapturedRef.current) {
      handoffCapturedRef.current = true;
      captureAnalyticsEvent('landing_top5_to_h2h_handoff_started', {
        race_id: raceId,
        race_slug: raceSlug,
        session_label: sessionLabel,
      });
    }
  }

  function continueToH2H() {
    if (!topFiveComplete) {
      return;
    }
    setH2HEntryMethod('top5_handoff');
    setH2HVisited(true);
    setActiveStep('h2h');
    if (!handoffCompletedRef.current) {
      handoffCompletedRef.current = true;
      captureAnalyticsEvent('landing_top5_to_h2h_handoff_completed', {
        race_id: raceId,
        race_slug: raceSlug,
        session_label: sessionLabel,
      });
    }
    revealActiveStep();
  }

  function prepareCombinedSave() {
    if (topFiveComplete) {
      setPendingSubmit(getWebTop5DraftStorageKey(raceId));
    }
    captureAnalyticsEvent('landing_prediction_card_save_started', {
      race_id: raceId,
      race_slug: raceSlug,
      includes_top_five: topFiveComplete,
      includes_h2h: true,
      h2h_entry_method: h2hEntryMethod,
    });
  }

  return (
    <section
      ref={sectionRef}
      id={LANDING_PICKS_ANCHOR}
      // Top padding stays deliberately short of the section rhythm used lower
      // down the page: this section has to start above the fold on a laptop, so
      // the first pick slots are visible rather than merely reachable.
      className="scroll-mt-28 border-t border-border px-4 pt-8 pb-10 sm:pb-12"
    >
      <div className="mx-auto w-full max-w-6xl">
        {/* No rule under the step heading: the section already opens on a
            hairline, and a second one here reads as a divider between the
            heading and the picker it introduces, not as a heading underline. */}
        <div ref={stepHeaderRef} className="scroll-mt-28">
          <span className="sr-only">
            {abbreviateGrandPrix(raceName)} · {sessionLabel}
          </span>
          <div className="flex min-h-5 flex-wrap items-start justify-between gap-x-3 gap-y-1">
            <div className="flex items-center gap-1">
              {/* Going back to the Top 5 is navigation, not an action on this
                  step, so it reads as a back arrow on the step counter rather
                  than a labelled button competing with the picks below. */}
              {activeStep === 'h2h' && topFiveComplete ? (
                <Button
                  variant="text"
                  size="inline"
                  className="-ml-1.5"
                  aria-label="Back to your Top 5"
                  leftIcon={ChevronLeft}
                  onClick={editTopFive}
                />
              ) : null}
              <p className="gpp-label text-accent">
                Step {activeStep === 'top5' ? '1' : '2'} of 2
              </p>
            </div>
            <div ref={setDraftNoticeTarget} />
          </div>
          <h2
            id="landing-picks-step-heading"
            className="mt-1 text-xl font-semibold text-text sm:text-2xl"
          >
            {activeStep === 'top5'
              ? 'Choose your Top 5'
              : 'Pick each teammate winner'}
          </h2>
        </div>

        <div
          ref={panelRef}
          id="landing-prediction-panel"
          className="pt-4"
          aria-labelledby="landing-picks-step-heading"
          tabIndex={-1}
        >
          <div hidden={activeStep !== 'top5'}>
            <Suspense fallback={<TopFivePickerSkeleton />}>
              <LandingTopFivePicker
                key={pickerGeneration}
                raceId={raceId}
                initialDrivers={initialDrivers}
                onComplete={handleTopFiveComplete}
                onContinue={continueToH2H}
                onCompletionStateChange={setTopFiveComplete}
                onPicksChange={setTopFivePicks}
                onStartOver={startOver}
                draftNoticeTarget={
                  activeStep === 'top5' ? draftNoticeTarget : null
                }
              />
            </Suspense>
          </div>
          <div hidden={activeStep !== 'h2h'}>
            {h2hVisited ? (
              <>
                {matchups === undefined ? (
                  <H2HPickerSkeleton />
                ) : (
                  <Suspense fallback={<H2HPickerSkeleton />}>
                    <H2HPredictionForm
                      key={pickerGeneration}
                      raceId={raceId}
                      matchups={matchups}
                      analyticsSource="landing"
                      entryMethod={h2hEntryMethod}
                      onSaveIntent={prepareCombinedSave}
                      onStartOver={startOver}
                      topFivePositions={topFivePositions}
                      draftNoticeTarget={
                        activeStep === 'h2h' ? draftNoticeTarget : null
                      }
                      renderSaveWall={({ lockIn }) => (
                        <PredictionCardSaveWall
                          topFivePicks={topFivePicks}
                          drivers={initialDrivers}
                          onLockIn={lockIn}
                        />
                      )}
                    />
                  </Suspense>
                )}
              </>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}

/**
 * The conversion moment. It used to ask for an account while showing a single
 * teammate duel, so the thing being saved was mostly out of sight. The whole
 * card is now on screen at the point of the ask: the Top 5 in order here, and
 * the eleven calls in the grid the form swaps in once the sequence is done.
 */
function PredictionCardSaveWall({
  topFivePicks,
  drivers,
  onLockIn,
}: {
  topFivePicks: Array<Id<'drivers'>>;
  drivers: Array<Doc<'drivers'>>;
  onLockIn: () => void;
}) {
  const pickedDrivers = topFivePicks
    .map((driverId) => drivers.find((driver) => driver._id === driverId))
    .filter((driver): driver is Doc<'drivers'> => driver !== undefined);
  const includesTopFive = pickedDrivers.length === 5;
  return (
    <div
      className="mx-auto mt-6 max-w-3xl border-t border-border pt-5"
      data-testid="h2h-save-wall"
    >
      <p className="text-xl font-medium text-text">
        {includesTopFive
          ? 'That’s your prediction card.'
          : 'Every teammate battle called.'}
      </p>
      <p className="gpp-reading-copy mt-1 text-text-muted">
        {includesTopFive
          ? 'Sign in to submit your Top 5 and teammate picks.'
          : 'Sign in to submit your teammate picks.'}
      </p>

      {includesTopFive ? (
        <ol
          className="mt-4 grid grid-cols-5 gap-1"
          aria-label="Your Top 5, in order"
        >
          {pickedDrivers.map((driver, index) => (
            <li
              key={driver._id}
              className="gpp-team-bar flex min-w-0 items-center justify-center gap-1.5 rounded-sm border border-border bg-surface-elevated py-1.5 pr-1 pl-2"
              style={
                {
                  '--team-colour':
                    (driver.team && TEAM_COLORS[driver.team]) ||
                    FALLBACK_TEAM_COLOR,
                } as React.CSSProperties
              }
            >
              <span className="gpp-mono text-[10px] leading-none text-accent">
                P{index + 1}
              </span>
              <span className="gpp-mono truncate text-xs leading-none text-text">
                {driver.code}
              </span>
            </li>
          ))}
        </ol>
      ) : null}

      <Button
        variant="primary"
        size="md"
        className="mt-4 w-full sm:w-auto"
        onClick={onLockIn}
      >
        Sign in to submit my picks
      </Button>
    </div>
  );
}

function TopFivePickerSkeleton() {
  return (
    <div
      className="flex flex-col gap-4 sm:gap-6 lg:flex-row lg:items-start lg:gap-8"
      aria-busy="true"
      aria-label="Loading driver grid"
    >
      <div className="order-2 lg:order-1 lg:min-w-[400px] lg:flex-1">
        <p className="mb-3 text-lg font-semibold text-text">Your Picks</p>
        <div className="overflow-hidden rounded-xl border border-border bg-surface">
          {[1, 2, 3, 4, 5].map((position) => (
            <div
              key={position}
              className="grid h-14 grid-cols-[3rem_1fr] border-b border-border last:border-b-0 sm:h-16"
            >
              <span className="gpp-mono flex items-center justify-center border-r border-border text-sm text-accent">
                P{position}
              </span>
              <span className="flex items-center px-3 text-sm text-text-muted">
                Select a driver
              </span>
            </div>
          ))}
        </div>
        <div className="mt-3 h-11 rounded-sm bg-surface-muted" />
      </div>

      <div className="order-1 lg:order-2 lg:min-w-0 lg:flex-2">
        <div className="mb-3 flex items-baseline gap-2">
          {/* Hidden below lg to match the live picker, so the heading does not
              pop in and out as the skeleton swaps for the real form. */}
          <p className="hidden text-lg font-semibold text-text lg:block">
            Select Drivers
          </p>
          <span className="text-sm text-text-muted">Loading the grid…</span>
        </div>
        <div className="grid grid-cols-2 gap-2 min-[480px]:grid-cols-3 md:grid-cols-4">
          {Array.from({ length: 22 }).map((_, index) => (
            <span
              // This skeleton intentionally mirrors the timing-sheet driver
              // cells so the picker never collapses into a generic spinner.
              key={index}
              className="h-11 rounded-sm border border-border bg-surface-muted"
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function H2HPickerSkeleton() {
  return (
    <div
      className="grid grid-cols-1 gap-2 pb-2 lg:grid-cols-2 xl:grid-cols-3"
      aria-busy="true"
      aria-label="Loading teammate matchups"
    >
      {Array.from({ length: 11 }).map((_, index) => (
        <div
          key={index}
          className="h-[88px] rounded-lg border border-border bg-surface"
        />
      ))}
    </div>
  );
}
