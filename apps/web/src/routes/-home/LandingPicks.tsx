import { api } from '@convex-generated/api';
import type { Doc, Id } from '@convex-generated/dataModel';
import { getWebTop5DraftStorageKey } from '@grandprixpicks/shared/picks';
import { useQuery } from 'convex/react';
import { lazy, Suspense, useEffect, useRef, useState } from 'react';

import { Button } from '@/components/Button/Button';
import { FALLBACK_TEAM_COLOR, TEAM_COLORS } from '@/components/DriverBadge';
import { TabSwitch } from '@/components/TabSwitch';
import { abbreviateGrandPrix } from '@/lib/display';
import { setPendingSubmit } from '@/lib/predictionDrafts';
import { captureAnalyticsEvent } from '@/lib/analytics';

type PicksTab = 'top5' | 'h2h';
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
 * scripted animation: a signed-out visitor fills all five slots, the picks are
 * kept as a device draft, and the save-wall below converts that into an account.
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
  const [activeTab, setActiveTab] = useState<PicksTab>(
    initialStep === 'top5' ? 'top5' : 'h2h',
  );
  const [topFiveComplete, setTopFiveComplete] = useState(
    initialStep === 'teammate-handoff',
  );
  const [h2hEntryMethod, setH2HEntryMethod] = useState<
    'manual' | 'top5_handoff'
  >(initialStep === 'teammate-handoff' ? 'top5_handoff' : 'manual');
  const [topFivePicks, setTopFivePicks] = useState<Array<Id<'drivers'>>>([]);
  const [h2hProgress, setH2HProgress] = useState({ selected: 0, total: 0 });
  const sectionRef = useRef<HTMLElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const viewedRef = useRef(false);
  const handoffCapturedRef = useRef(false);
  const handoffCompletedRef = useRef(false);
  const matchups = useQuery(api.h2h.getMatchupsForSeason, { season });

  // Slot number per driver, so a teammate battle can show the call already
  // made about that driver upstairs instead of asking twice.
  const topFivePositions = Object.fromEntries(
    topFivePicks.map((driverId, index) => [driverId, index + 1]),
  );

  const h2hTabLabel =
    h2hProgress.total > 0 && h2hProgress.selected === h2hProgress.total
      ? 'Teammate H2H ✓'
      : h2hProgress.selected > 0
        ? `Teammate H2H ${h2hProgress.selected}/${h2hProgress.total}`
        : 'Teammate H2H';

  // Returning the same object when nothing moved keeps this a no-op render,
  // which is what stops the reporting effect downstream from looping.
  function handleH2HProgress(selected: number, total: number) {
    setH2HProgress((current) =>
      current.selected === selected && current.total === total
        ? current
        : { selected, total },
    );
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

  function changeTab(tab: PicksTab) {
    // Entry method is how they first reached the battles, so a later tab click
    // must not rewrite it. It used to, which also silently dropped the handoff
    // confirmation for anyone who glanced back at their Top 5.
    if (tab === 'h2h' && !handoffCapturedRef.current) {
      setH2HEntryMethod('manual');
    }
    setActiveTab(tab);
    captureAnalyticsEvent('landing_picker_tab_changed', {
      race_id: raceId,
      race_slug: raceSlug,
      prediction_type: tab,
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
    setActiveTab('h2h');
    if (!handoffCompletedRef.current) {
      handoffCompletedRef.current = true;
      captureAnalyticsEvent('landing_top5_to_h2h_handoff_completed', {
        race_id: raceId,
        race_slug: raceSlug,
        session_label: sessionLabel,
      });
    }
    window.requestAnimationFrame(() => panelRef.current?.focus());
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
        <div className="flex flex-col gap-5 border-b border-border pb-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            {/*
             * Flag, race and session are already the first three things the
             * hero clock says, and on a phone that block ends 65px above this
             * one — close enough that repeating them reads as the page
             * stuttering rather than as a section header. The hero owns
             * identity for everything above the fold; this section only has to
             * say what to do. The heading stays in the tree as text so the
             * document outline and the "which race is this" question still
             * have an answer for anyone not reading the layout.
             */}
            <h2 className="sr-only">
              {abbreviateGrandPrix(raceName)} · {sessionLabel}
            </h2>
            <p className="gpp-reading-copy max-w-2xl text-text-muted">
              Start with your top 5, then call every teammate battle.
            </p>
          </div>
          <TabSwitch
            value={activeTab}
            onChange={changeTab}
            ariaLabel="Prediction type"
            id="landing-prediction-type"
            panelId="landing-prediction-panel"
            options={[
              {
                value: 'top5',
                label: topFiveComplete ? 'Top 5 ✓' : 'Top 5',
              },
              { value: 'h2h', label: h2hTabLabel },
            ]}
            className="flex shrink-0 gap-1"
          />
        </div>

        <div
          ref={panelRef}
          id="landing-prediction-panel"
          className="pt-5"
          role="tabpanel"
          aria-labelledby={`landing-prediction-type-${activeTab}`}
          tabIndex={0}
        >
          <div hidden={activeTab !== 'top5'}>
            <Suspense fallback={<TopFivePickerSkeleton />}>
              <LandingTopFivePicker
                raceId={raceId}
                initialDrivers={initialDrivers}
                onComplete={handleTopFiveComplete}
                onContinue={continueToH2H}
                onCompletionStateChange={setTopFiveComplete}
                onPicksChange={setTopFivePicks}
              />
            </Suspense>
          </div>
          <div hidden={activeTab !== 'h2h'}>
            {topFiveComplete &&
            h2hEntryMethod === 'top5_handoff' &&
            h2hProgress.selected === 0 ? (
              <p className="mb-5 flex items-center gap-2 text-sm text-accent">
                <span
                  className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-accent text-xs font-bold text-text-on-accent"
                  aria-hidden="true"
                >
                  ✓
                </span>
                Top 5 drafted. Now call the teammate battles.
              </p>
            ) : null}
            {matchups === undefined ? (
              <H2HPickerSkeleton />
            ) : (
              <Suspense fallback={<H2HPickerSkeleton />}>
                <H2HPredictionForm
                  raceId={raceId}
                  matchups={matchups}
                  analyticsSource="landing"
                  entryMethod={h2hEntryMethod}
                  onSaveIntent={prepareCombinedSave}
                  onSelectionProgress={handleH2HProgress}
                  topFivePositions={topFivePositions}
                  renderSaveWall={({ lockIn }) => (
                    <PredictionCardSaveWall
                      topFivePicks={topFivePicks}
                      drivers={initialDrivers}
                      onLockIn={lockIn}
                      onFinishTopFive={() => changeTab('top5')}
                    />
                  )}
                />
              </Suspense>
            )}
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
  onFinishTopFive,
}: {
  topFivePicks: Array<Id<'drivers'>>;
  drivers: Array<Doc<'drivers'>>;
  onLockIn: () => void;
  onFinishTopFive: () => void;
}) {
  const pickedDrivers = topFivePicks
    .map((driverId) => drivers.find((driver) => driver._id === driverId))
    .filter((driver): driver is Doc<'drivers'> => driver !== undefined);
  const includesTopFive = pickedDrivers.length === 5;
  // A part-filled Top 5 never submits: it stays a device draft while only the
  // teammate picks save. Saying so beats letting them find out later.
  const partialTopFive = pickedDrivers.length > 0 && !includesTopFive;

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
          ? 'Create a free account to save your Top 5 and teammate picks.'
          : 'Create a free account to save your teammate picks.'}
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

      {partialTopFive ? (
        <p className="mt-4 text-sm text-warning">
          Your Top 5 is only {pickedDrivers.length} of 5, so it won’t be saved
          with this card.{' '}
          <Button variant="text" size="inline" onClick={onFinishTopFive}>
            Finish your Top 5
          </Button>
        </p>
      ) : null}

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <Button variant="primary" size="md" onClick={onLockIn}>
          Save my picks
        </Button>
        <Button variant="text" size="md" onClick={onLockIn}>
          I have an account
        </Button>
      </div>
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
          <p className="text-lg font-semibold text-text">Select Drivers</p>
          <span className="text-sm text-text-muted">Loading the grid…</span>
        </div>
        <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-4 sm:gap-2 lg:grid-cols-4">
          {Array.from({ length: 22 }).map((_, index) => (
            <span
              // This skeleton intentionally mirrors the timing-sheet driver
              // cells so the picker never collapses into a generic spinner.
              key={index}
              className="h-9 rounded-sm border border-border bg-surface-muted"
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
