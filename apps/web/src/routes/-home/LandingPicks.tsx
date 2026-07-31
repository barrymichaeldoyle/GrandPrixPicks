import { api } from '@convex-generated/api';
import type { Doc, Id } from '@convex-generated/dataModel';
import { getWebTop5DraftStorageKey } from '@grandprixpicks/shared/picks';
import { useQuery } from 'convex/react';
import { lazy, Suspense, useEffect, useRef, useState } from 'react';

import { Button } from '@/components/Button/Button';
import { Flag } from '@/components/Flag';
import { TabSwitch } from '@/components/TabSwitch';
import { abbreviateGrandPrix } from '@/lib/display';
import { setPendingSubmit } from '@/lib/predictionDrafts';
import { getCountryCodeForRace } from '@/lib/raceCountries';
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
  const sectionRef = useRef<HTMLElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const viewedRef = useRef(false);
  const handoffCapturedRef = useRef(false);
  const handoffCompletedRef = useRef(false);
  const transitionTimerRef = useRef<number | null>(null);
  const matchups = useQuery(api.h2h.getMatchupsForSeason, { season });
  const countryCode = getCountryCodeForRace({ slug: raceSlug });

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
    if (tab === 'h2h') {
      setH2HEntryMethod('manual');
    }
    setActiveTab(tab);
    captureAnalyticsEvent('landing_picker_tab_changed', {
      race_id: raceId,
      race_slug: raceSlug,
      prediction_type: tab,
    });
  }

  useEffect(
    () => () => {
      if (transitionTimerRef.current !== null) {
        window.clearTimeout(transitionTimerRef.current);
      }
    },
    [],
  );

  function moveFromTopFiveToH2H() {
    setH2HEntryMethod('top5_handoff');
    if (!handoffCapturedRef.current) {
      handoffCapturedRef.current = true;
      captureAnalyticsEvent('landing_top5_to_h2h_handoff_started', {
        race_id: raceId,
        race_slug: raceSlug,
        session_label: sessionLabel,
      });
    }
    if (transitionTimerRef.current !== null) {
      window.clearTimeout(transitionTimerRef.current);
    }
    transitionTimerRef.current = window.setTimeout(() => {
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
    }, 360);
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
      className="scroll-mt-28 border-t border-border px-4 py-10 sm:py-12"
    >
      <div className="mx-auto w-full max-w-6xl">
        <div className="flex flex-col gap-5 border-b border-border pb-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="flex flex-wrap items-center gap-2 text-lg font-medium text-text">
              {countryCode ? <Flag code={countryCode} size="sm" /> : null}
              <span>{abbreviateGrandPrix(raceName)}</span>
              <span className="text-text-muted" aria-hidden="true">
                ·
              </span>
              <span className="text-text-muted">{sessionLabel}</span>
            </h2>
            <p className="gpp-reading-copy mt-2 max-w-2xl text-text-muted">
              Start with your top 5, then call every teammate battle. No account
              needed until you save.
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
              { value: 'h2h', label: 'Teammate H2H' },
            ]}
            className="flex shrink-0 gap-1"
          />
        </div>

        <div
          ref={panelRef}
          id="landing-prediction-panel"
          className="pt-6"
          role="tabpanel"
          aria-labelledby={`landing-prediction-type-${activeTab}`}
          tabIndex={0}
        >
          <div hidden={activeTab !== 'top5'}>
            <Suspense fallback={<TopFivePickerSkeleton />}>
              <LandingTopFivePicker
                raceId={raceId}
                initialDrivers={initialDrivers}
                onComplete={moveFromTopFiveToH2H}
                onCompletionStateChange={setTopFiveComplete}
              />
            </Suspense>
          </div>
          <div hidden={activeTab !== 'h2h'}>
            {topFiveComplete && h2hEntryMethod === 'top5_handoff' ? (
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
                  renderSaveWall={({ lockIn }) => (
                    <PredictionCardSaveWall
                      includesTopFive={topFiveComplete}
                      onLockIn={lockIn}
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

function PredictionCardSaveWall({
  includesTopFive,
  onLockIn,
}: {
  includesTopFive: boolean;
  onLockIn: () => void;
}) {
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
