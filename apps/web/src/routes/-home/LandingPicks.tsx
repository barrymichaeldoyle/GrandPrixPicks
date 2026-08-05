import { api } from '@convex-generated/api';
import type { Doc, Id } from '@convex-generated/dataModel';
import {
  getWebH2HDraftStorageKey,
  getWebTop5DraftStorageKey,
} from '@grandprixpicks/shared/picks';
import { useQuery } from 'convex/react';
import { ChevronLeft, Pencil } from 'lucide-react';
import { lazy, Suspense, useEffect, useRef, useState } from 'react';

import { LandingTopFivePicker } from './LandingTopFivePicker';
import { Button } from '@/components/Button/Button';
import type { H2HMatchup } from '@/components/H2HMatchupGrid';
import { PicksFocusOverlay } from '@/components/PicksFocusOverlay';
import { TopFivePicksBar } from '@/components/TopFivePicksBar';
import {
  useClerkRuntimeControl,
  useClerkWarmHandlers,
} from '@/integrations/clerk/runtime-control';
import { deferUntilAfterLoad } from '@/lib/deferUntilAfterLoad';
import { abbreviateGrandPrix } from '@/lib/display';
import { useIsomorphicLayoutEffect } from '@/lib/useIsomorphicLayoutEffect';
import {
  clearPendingSubmit,
  clearPredictionDraft,
  loadPredictionDraft,
  setPendingSubmit,
} from '@/lib/predictionDrafts';
import { captureAnalyticsEvent } from '@/lib/analytics';

type PicksStep = 'top5' | 'h2h';
export type LandingPicksInitialStep =
  | 'top5'
  | 'teammate-handoff'
  | 'teammate-manual';

/*
 * The Top 5 picker is imported eagerly (see the import above) and the team-mate
 * form is not, which looks inconsistent but is the difference between the two:
 * that picker is server-rendered into the landing HTML and is the first thing
 * on screen, this form is a step nobody reaches without a click.
 *
 * Lazily loading a component the server already rendered costs a visible
 * shudder on every refresh. React hydrates, finds the chunk missing, throws the
 * server's markup away for the Suspense fallback, and puts it back a frame
 * later once the chunk lands: measured at ~70ms in a production build, and
 * because the skeleton was a different height, everything below it dropped 56px
 * and bounced back. Nothing was saved for it either, since the chunk is needed
 * immediately on the same page.
 */
let h2hFormModule: Promise<
  typeof import('@/components/H2HPredictionForm')
> | null = null;

/** Idempotent: the module cache dedupes, this just names the promise. */
function loadH2HForm() {
  h2hFormModule ??= import('@/components/H2HPredictionForm');
  return h2hFormModule;
}

const H2HPredictionForm = lazy(() =>
  loadH2HForm().then((module) => ({
    default: module.H2HPredictionForm,
  })),
);

export const LANDING_PICKS_ANCHOR = 'make-picks';

type LandingPicksMemory = {
  activeStep: PicksStep;
  h2hVisited: boolean;
  topFiveComplete: boolean;
  h2hEntryMethod: 'manual' | 'top5_handoff';
  topFivePicks: Id<'drivers'>[];
  h2hComplete: boolean;
};

// Purely presentational funnel state, kept in module memory so that a remount
// is never mistaken for a returning visit and does not move Step 1 to Step 2
// underneath the user. A real reload clears this map and continues to use the
// persisted draft-resume behaviour below.
//
// Opening sign-in used to be the remount that made this necessary — activating
// Clerk swapped the auth providers above this component. It no longer does (see
// ClerkSignInOverlay), so this now guards the invariant rather than a specific
// caller, and the transition it protects is the one into the signed-in app.
const landingPicksMemory = new Map<string, LandingPicksMemory>();

/** Keeps remount-oriented tests isolated; production code never calls this. */
export function resetLandingPicksMemoryForTests() {
  landingPicksMemory.clear();
}

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
  initialMatchups,
  initialStep = 'top5',
}: {
  raceId: Id<'races'>;
  raceName: string;
  raceSlug: string;
  season: number;
  /** Session whose picks lock next, e.g. "Qualifying". */
  sessionLabel: string;
  /** SSR seed so the landing picker is usable before Convex subscriptions boot. */
  initialDrivers: Doc<'drivers'>[];
  /** Same, for the team-mate step a returning visitor resumes straight onto. */
  initialMatchups?: H2HMatchup[];
  /**
   * Initial funnel entry point. The default is the real signed-out journey;
   * focused previews can open directly on either teammate-pick state.
   */
  initialStep?: LandingPicksInitialStep;
}) {
  const rememberedState = useRef(
    landingPicksMemory.get(String(raceId)),
  ).current;
  const [activeStep, setActiveStep] = useState<PicksStep>(
    rememberedState?.activeStep ?? (initialStep === 'top5' ? 'top5' : 'h2h'),
  );
  const [h2hVisited, setH2HVisited] = useState(
    rememberedState?.h2hVisited ?? initialStep !== 'top5',
  );
  const [topFiveComplete, setTopFiveComplete] = useState(
    rememberedState?.topFiveComplete ?? initialStep === 'teammate-handoff',
  );
  const [h2hEntryMethod, setH2HEntryMethod] = useState<
    'manual' | 'top5_handoff'
  >(
    rememberedState?.h2hEntryMethod ??
      (initialStep === 'teammate-handoff' ? 'top5_handoff' : 'manual'),
  );
  const [topFivePicks, setTopFivePicks] = useState<Id<'drivers'>[]>(
    rememberedState?.topFivePicks ?? [],
  );
  const [h2hComplete, setH2HComplete] = useState(
    rememberedState?.h2hComplete ?? false,
  );
  const [top5OverlayOpen, setTop5OverlayOpen] = useState(false);
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
  // The SSR seed is what this step paints from until the live subscription
  // resolves. Team-mate pairings change at most a few times a season, so the
  // seeded copy is never meaningfully stale, and preferring it means a resumed
  // card opens on real duels rather than skeletons.
  const liveMatchups = useQuery(
    api.h2h.getMatchupsForSeason,
    h2hVisited ? { season } : 'skip',
  );
  const matchups = liveMatchups ?? initialMatchups;

  // Slot number per driver, so a team-mate battle can show the call already
  // made about that driver upstairs instead of asking twice.
  const topFivePositions = Object.fromEntries(
    topFivePicks.map((driverId, index) => [driverId, index + 1]),
  );
  function handleSelectionProgress(selected: number, total: number) {
    setH2HComplete(total > 0 && selected === total);
  }

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

  /**
   * A returning visitor whose Top 5 draft is already filled in has answered
   * step 1. Opening on it made them re-read a question they had finished and
   * hunt for "Continue" to reach the card they came back for, so the funnel
   * resumes at the team-mate step instead.
   *
   * Runs as an effect rather than in the initial state because drafts live in
   * localStorage: reading it during render would desync the SSR markup. It is
   * a layout effect so the step lands in the same frame as hydration — as a
   * passive effect the visitor watched the Top 5 picker paint, fill itself in,
   * grow a Continue button and only then be replaced by the team-mate card.
   *
   * `h2hEntryMethod` deliberately stays `manual` — a restored draft is not a
   * fresh Top 5 handoff, and counting it as one would inflate that funnel.
   */
  useIsomorphicLayoutEffect(() => {
    if (rememberedState || initialStep !== 'top5') {
      return;
    }
    const draft = loadPredictionDraft<{ picks?: Id<'drivers'>[] }>(
      getWebTop5DraftStorageKey(raceId),
    );
    if ((draft?.picks?.length ?? 0) < 5) {
      return;
    }
    // These two are invisible on their own: they arm the matchups query and
    // mount the team-mate block behind `hidden`, so its chunk and its data load
    // out of sight while the Top 5 stays on screen.
    setTopFiveComplete(true);
    setH2HVisited(true);

    // The step itself waits for the chunk. Flipping immediately swapped a real,
    // filled-in Top 5 for eleven skeleton boxes and then swapped those for the
    // card — three states to say one thing. Holding the visible step until the
    // card can actually render makes it one.
    let cancelled = false;
    void loadH2HForm().then(() => {
      if (!cancelled) {
        setActiveStep('h2h');
      }
    });
    return () => {
      cancelled = true;
    };
  }, [initialStep, raceId, rememberedState]);

  // Everyone who finishes step 1 needs this chunk, and "Continue to team-mate
  // battles" is a click we can see coming from the moment the picker is on
  // screen. Fetching it on idle keeps that handoff instant too.
  useEffect(() => {
    return deferUntilAfterLoad(() => void loadH2HForm());
  }, []);

  useEffect(() => {
    landingPicksMemory.set(String(raceId), {
      activeStep,
      h2hVisited,
      topFiveComplete,
      h2hEntryMethod,
      topFivePicks,
      h2hComplete,
    });
  }, [
    activeStep,
    h2hComplete,
    h2hEntryMethod,
    h2hVisited,
    raceId,
    topFiveComplete,
    topFivePicks,
  ]);

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
   * Editing the Top 5 from a finished card is a detour, not a step backwards.
   * Sending the visitor back to step 1 tore the card down around them and left
   * them to find their way forward again; the focus overlay is the same
   * takeover signed-in players get for an edit, so the card stays put
   * underneath and closing returns them exactly where they were.
   */
  function openTop5Overlay() {
    setTop5OverlayOpen(true);
    captureAnalyticsEvent('landing_picker_step_changed', {
      race_id: raceId,
      race_slug: raceSlug,
      prediction_type: 'top5',
    });
  }

  function closeTop5Overlay() {
    setTop5OverlayOpen(false);
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
    setH2HComplete(false);
    setH2HVisited(false);
    setTop5OverlayOpen(false);
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

  /**
   * Every pick is in and the save wall is showing. Drives the "less chrome once
   * there is nothing left to decide" state in the step header.
   */
  const cardComplete = activeStep === 'h2h' && topFiveComplete && h2hComplete;

  return (
    <section
      ref={sectionRef}
      id={LANDING_PICKS_ANCHOR}
      // Top padding stays deliberately short of the section rhythm used lower
      // down the page: this section has to start above the fold on a laptop, so
      // the first pick slots are visible rather than merely reachable.
      className="scroll-mt-28 border-t border-border px-4 pt-8 pb-10 sm:pb-12"
    >
      {/* The Top 5 step needs the full width for its two-column driver grid;
          the team-mate step is a single narrow column. Sizing the container to
          the active step keeps the heading on the same left edge as the picker
          under it, instead of the heading spanning 6xl while a centred 3xl
          panel sat 192px inboard of it.

          That column has to move between the steps, then — there is no width
          that is right for both — so the point of the transition is that it
          moves rather than teleports. Continue already scrolls the step header
          up the page; a 24rem snap landing on the same frame read as the layout
          breaking rather than as one step handing over to the next. Only the
          container animates: the duel card inside is already at its own 3xl and
          simply re-centres as the box closes around it.

          `ease-in-out`, not the `ease-out` the rest of the page uses for
          entrances. Over 384px an ease-out spends three quarters of the travel
          in the first 100ms, which is the snap again with a slow tail bolted
          on; a symmetric curve is the one that reads as the column moving. */}
      <div
        className={`mx-auto w-full transition-[max-width] duration-300 ease-in-out motion-reduce:transition-none ${activeStep === 'top5' ? 'max-w-6xl' : 'max-w-3xl'}`}
      >
        {/* No rule under the step heading: the section already opens on a
            hairline, and a second one here reads as a divider between the
            heading and the picker it introduces, not as a heading underline. */}
        <div ref={stepHeaderRef} className="scroll-mt-28">
          <span className="sr-only">
            {abbreviateGrandPrix(raceName)} · {sessionLabel}
          </span>
          {/* The draft notice keeps its slot on a finished card: "Start over"
              is the only reset, and losing it with the stepper would strand a
              returning visitor on picks they wanted to bin. */}
          <div className="flex min-h-5 flex-wrap items-start justify-between gap-x-3 gap-y-1">
            <div className="flex items-center gap-1">
              {/* Going back to the Top 5 is navigation, not an action on this
                  step, so it reads as a back arrow on the step counter rather
                  than a labelled button competing with the picks below. */}
              {activeStep === 'h2h' && topFiveComplete && !cardComplete ? (
                <Button
                  variant="text"
                  size="inline"
                  className="-ml-1.5"
                  aria-label="Back to your Top 5"
                  leftIcon={ChevronLeft}
                  onClick={editTopFive}
                />
              ) : null}
              {cardComplete ? null : (
                <p className="gpp-label text-accent">
                  Step {activeStep === 'top5' ? '1' : '2'} of 2
                </p>
              )}
            </div>
            <div ref={setDraftNoticeTarget} />
          </div>
          {/* Once every pick is in, the stepper and its instruction are spent:
              nothing is left to step through, and "Pick each team-mate winner"
              contradicts the finished card below it. The card's own heading
              takes over, so the visible chrome drops to the card and the ask.
              The heading stays in the accessibility tree to keep the panel's
              `aria-labelledby` target and the section's name. */}
          <h2
            id="landing-picks-step-heading"
            className={
              cardComplete
                ? 'sr-only'
                : 'mt-1 text-xl font-semibold text-text sm:text-2xl'
            }
          >
            {activeStep === 'top5'
              ? 'Choose your Top 5'
              : 'Pick each team-mate winner'}
          </h2>
        </div>

        <div
          ref={panelRef}
          id="landing-prediction-panel"
          className="pt-4"
          aria-labelledby="landing-picks-step-heading"
          tabIndex={-1}
        >
          {/* Exactly one Top 5 picker is mounted at a time: this one and the
              overlay's share a draft key, so two would race each other on
              every reorder. Remounting between them is safe because the draft
              is written synchronously on each change, and re-reading it is how
              the overlay arrives pre-filled. */}
          <div hidden={activeStep !== 'top5'}>
            {top5OverlayOpen ? null : (
              <LandingTopFivePicker
                key={pickerGeneration}
                raceId={raceId}
                initialDrivers={initialDrivers}
                initialDraftPicks={rememberedState?.topFivePicks}
                suppressDraftRestoredNotice={Boolean(rememberedState)}
                onComplete={handleTopFiveComplete}
                onContinue={continueToH2H}
                onCompletionStateChange={setTopFiveComplete}
                onPicksChange={setTopFivePicks}
                onStartOver={startOver}
                draftNoticeTarget={
                  activeStep === 'top5' ? draftNoticeTarget : null
                }
              />
            )}
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
                      // The finished card here sits above the sign-in button
                      // and below the Top 5, so reopening a battle inline
                      // pushed both away from the reader mid-decision. One
                      // battle in a takeover leaves the card where it was.
                      collapsedEdit="modal"
                      onSaveIntent={prepareCombinedSave}
                      onStartOver={startOver}
                      onSelectionProgress={handleSelectionProgress}
                      topFivePositions={topFivePositions}
                      draftNoticeTarget={
                        activeStep === 'h2h' ? draftNoticeTarget : null
                      }
                      renderCardIntro={() => (
                        <PredictionCardIntro
                          topFivePicks={topFivePicks}
                          drivers={initialDrivers}
                          onEditTopFive={openTop5Overlay}
                        />
                      )}
                      renderSaveWall={({ lockIn }) => (
                        <PredictionCardSaveWall onLockIn={lockIn} />
                      )}
                    />
                  </Suspense>
                )}
              </>
            ) : null}
          </div>
        </div>
      </div>

      <PicksFocusOverlay
        open={top5OverlayOpen}
        onClose={closeTop5Overlay}
        title="Your Top 5"
        subtitle="Applies to every session this weekend"
      >
        {/* The overlay body has no mobile bottom padding (see
            PicksFocusOverlay); this form has no sticky bar of its own. */}
        <div className="pb-4 sm:pb-0">
          <LandingTopFivePicker
            key={`overlay-${pickerGeneration}`}
            raceId={raceId}
            initialDrivers={initialDrivers}
            initialDraftPicks={rememberedState?.topFivePicks}
            suppressDraftRestoredNotice={Boolean(rememberedState)}
            onComplete={handleTopFiveComplete}
            onContinue={closeTop5Overlay}
            continueLabel="Done"
            onCompletionStateChange={setTopFiveComplete}
            onPicksChange={setTopFivePicks}
            onStartOver={startOver}
            // Keeps the restored-draft notice in the card's header slot
            // rather than banner-ing it inside the modal. Someone who just
            // pressed Edit does not need telling their picks were kept.
            draftNoticeTarget={draftNoticeTarget}
          />
        </div>
      </PicksFocusOverlay>
    </section>
  );
}

/**
 * Head of the conversion moment. It used to ask for an account while showing a
 * single team-mate duel, so the thing being saved was mostly out of sight; the
 * whole card is now on screen at the point of the ask.
 *
 * Order matters as much as presence. The team-mate calls are the secondary half
 * of a prediction card and used to lead it simply because the H2H form owns
 * the page at that point, which read as though eleven duels were the headline
 * and the Top 5 an afterthought stapled underneath. This renders above the
 * duels (see `renderCardIntro`), so the card goes Top 5 → team-mate battles →
 * the ask, primary first.
 */
function PredictionCardIntro({
  topFivePicks,
  drivers,
  onEditTopFive,
}: {
  topFivePicks: Id<'drivers'>[];
  drivers: Doc<'drivers'>[];
  /**
   * The finished card hides the step header's back arrow, so the way back to
   * the Top 5 lives here, next to the picks it edits. The team-mate calls
   * already say "tap a battle to change your mind"; this is the same offer for
   * the half of the card that isn't tappable.
   */
  onEditTopFive?: () => void;
}) {
  const pickedDrivers = topFivePicks
    .map((driverId) => drivers.find((driver) => driver._id === driverId))
    .filter((driver): driver is Doc<'drivers'> => driver !== undefined);
  const includesTopFive = pickedDrivers.length === 5;
  return (
    <div className="mb-6" data-testid="prediction-card-intro">
      {/* No supporting line under this heading: it used to read "Sign in to
          submit your Top 5 and team-mate picks", which is the button's job.
          Saying the ask twice, once as prose and once as the action, made the
          moment feel like two requests instead of one. */}
      <p className="text-xl font-medium text-text">
        {includesTopFive
          ? 'That’s your prediction card.'
          : 'Every team-mate battle called.'}
      </p>

      {includesTopFive ? (
        <>
          <div className="mt-4 flex items-center justify-between gap-3">
            <p className="gpp-label text-text-muted">Your Top 5</p>
            {onEditTopFive ? (
              <Button
                variant="text"
                size="inline"
                leftIcon={Pencil}
                onClick={onEditTopFive}
              >
                Edit
              </Button>
            ) : null}
          </div>
          <TopFivePicksBar picks={topFivePicks} drivers={drivers} />
        </>
      ) : null}
    </div>
  );
}

/**
 * Tail of the same moment: the ask, under the card it is asking about. The
 * button is the only place the sign-in is worded, so the note beside it answers
 * the two things a signed-out visitor is actually weighing (cost, and whether
 * the picks they just made survive the account) rather than repeating the ask.
 */
function PredictionCardSaveWall({ onLockIn }: { onLockIn: () => void }) {
  const { signInPending } = useClerkRuntimeControl();
  const warmHandlers = useClerkWarmHandlers();

  return (
    <div
      // No rule above this. The button submits the card directly above it, so a
      // divider between them reads as a boundary between two things when it is
      // one thing and its action. Spacing alone carries the grouping.
      className="mt-7 flex flex-col gap-3 sm:flex-row sm:items-center"
      data-testid="h2h-save-wall"
    >
      {/* The conversion button on the page. Booting Clerk starts on the hover
          or tap that precedes the click, and the click itself gets a spinner
          in place of the label rather than a silent wait. */}
      <Button
        variant="primary"
        size="md"
        className="w-full sm:w-auto"
        loading={signInPending}
        onClick={onLockIn}
        {...warmHandlers}
      >
        Sign in to submit
      </Button>
      <p className="text-sm text-text-muted">
        Free to play. These picks come with you.
      </p>
    </div>
  );
}

function H2HPickerSkeleton() {
  return (
    <div
      className="grid grid-cols-1 gap-2 pb-2 lg:grid-cols-2 xl:grid-cols-3"
      aria-busy="true"
      aria-label="Loading team-mate matchups"
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
