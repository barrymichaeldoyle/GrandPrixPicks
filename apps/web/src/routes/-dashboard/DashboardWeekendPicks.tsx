import { api } from '@convex-generated/api';
import type { Doc, Id } from '@convex-generated/dataModel';
import type { FunctionReturnType } from 'convex/server';
import { useQuery } from '@/integrations/convex/query';
import { formatLockCountdown } from '@grandprixpicks/shared/picks';
import {
  ArrowRight,
  ChevronLeft,
  Clock3,
  Flag,
  Lock,
  Pencil,
  Trophy,
} from 'lucide-react';
import { Link } from '@tanstack/react-router';
import { lazy, Suspense, useEffect, useRef, useState } from 'react';

import { Button } from '@/components/Button/Button';
import type { H2HMatchup } from '@/components/H2HMatchupGrid';
import { NoticeCard } from '@/components/NoticeCard';
import { PicksFocusOverlay } from '@/components/PicksFocusOverlay';
import { PicksSaveStatus } from '@/components/PicksSaveStatus';
import { PredictionForm } from '@/components/PredictionForm';
import { RaceFlag } from '@/components/RaceFlag';
import { TopFivePicksBar } from '@/components/TopFivePicksBar';
import {
  WEEKEND_CARD_SHELL,
  WeekendCardSkeleton,
} from '@/components/WeekendCardSkeleton';
import { deferUntilAfterLoad } from '@/lib/deferUntilAfterLoad';
import { getCountryCodeForRace } from '@/lib/raceCountries';
import type { SessionType } from '@/lib/sessions';
import { SESSION_LABELS, SESSION_LABELS_SHORT } from '@/lib/sessions';
import { useNow } from '@/lib/testing/now';

import { DashboardPicksSummary } from './DashboardPicksSummary';
import {
  getDashboardWeekendAction,
  getSessionClockState,
  weekendReflectsViewer,
  type DashboardSessionState,
} from './dashboardState';

type CurrentWeekend = NonNullable<
  FunctionReturnType<typeof api.races.getCurrentWeekend>
>;

type PicksStep = 'top5' | 'h2h' | 'summary';

let h2hFormModule: Promise<
  typeof import('@/components/H2HPredictionForm')
> | null = null;

function loadH2HForm() {
  h2hFormModule ??= import('@/components/H2HPredictionForm');
  return h2hFormModule;
}

const H2HPredictionForm = lazy(() =>
  loadH2HForm().then((module) => ({
    default: module.H2HPredictionForm,
  })),
);

export function DashboardWeekendPicks({
  weekend,
  initialRace,
  initialDrivers,
  initialMatchups,
}: {
  weekend: CurrentWeekend | null | undefined;
  /** The next race from the route loader, used to name the card before the
   *  viewer's weekend payload arrives. */
  initialRace?: Doc<'races'> | null;
  initialDrivers: Doc<'drivers'>[];
  initialMatchups?: H2HMatchup[];
}) {
  if (weekend === undefined) {
    return <WeekendCardSkeleton race={initialRace} />;
  }

  if (weekend === null) {
    return (
      <NoticeCard
        level="section"
        icon={Flag}
        title="No race weekend is open yet"
        description="The next prediction window will appear here as soon as the upcoming weekend is available."
        action={
          <Button asChild size="sm" variant="secondary">
            <Link to="/races">View race calendar</Link>
          </Button>
        }
      />
    );
  }

  // Everything below reads the weekend's per-session capabilities. Rendering
  // the pre-auth payload would open the card on the wrong session and show it
  // as locked, so hold the skeleton the extra beat instead.
  if (!weekendReflectsViewer(weekend.sessions)) {
    // The pre-auth payload is not trustworthy about capabilities, but its race
    // is the right race, and it beats the loader's copy for freshness.
    return <WeekendCardSkeleton race={weekend.race ?? initialRace} />;
  }

  return (
    <DashboardWeekendPicksReady
      weekend={weekend}
      initialDrivers={initialDrivers}
      initialMatchups={initialMatchups}
    />
  );
}

function DashboardWeekendPicksReady({
  weekend,
  initialDrivers,
  initialMatchups,
}: {
  weekend: CurrentWeekend;
  initialDrivers: Doc<'drivers'>[];
  initialMatchups?: H2HMatchup[];
}) {
  const now = useNow(1_000, weekend.serverNow);
  const action = getDashboardWeekendAction(weekend.sessions);
  const myPredictions = useQuery(api.predictions.myWeekendPredictions, {
    raceId: weekend.race._id,
  });
  const myH2H = useQuery(api.h2h.myH2HPredictionsForRace, {
    raceId: weekend.race._id,
  });
  // Everyone, not just the racing subset: this array feeds the saved-picks
  // summaries as well as the picker, and a summary has to be able to name a
  // driver who has since lost their seat. `PredictionForm` filters it down to
  // the pool it offers.
  const liveDrivers = useQuery(api.drivers.listDrivers, {
    round: weekend.race.round,
    season: weekend.race.season,
    includeNotRacing: true,
  });
  const drivers = liveDrivers ?? initialDrivers;

  const existingTop5 = firstWeekendTop5(myPredictions?.predictions);
  const existingH2H = firstWeekendH2H(myH2H, action?.sessionType);

  const initialStep = resolveInitialStep(action);
  const [step, setStep] = useState<PicksStep>(initialStep);
  const [topFiveComplete, setTopFiveComplete] = useState(
    Boolean(existingTop5?.length === 5) ||
      action?.kind === 'finish_h2h' ||
      action?.kind === 'review',
  );
  const [topFivePicks, setTopFivePicks] = useState<Id<'drivers'>[]>(
    existingTop5 ?? [],
  );
  const [h2hVisited, setH2HVisited] = useState(
    initialStep === 'h2h' || initialStep === 'summary',
  );
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerGeneration, setPickerGeneration] = useState(0);
  /**
   * Which session's saved card is on screen. Null follows the weekend's own
   * answer (the next session that still wants something from you); once the
   * player picks a tab, that choice sticks.
   */
  const [selectedSession, setSelectedSession] = useState<SessionType | null>(
    null,
  );
  // Back to Top 5 must stick even when the backend already says "finish H2H"
  // (otherwise the capability sync effect immediately re-advances to step 2).
  const suppressStepAutoAdvanceRef = useRef(false);
  /**
   * Read by the capability sync effect, which deliberately does not depend on
   * the open state — a ref keeps the value fresh there without re-running the
   * sync every time the overlay is toggled.
   */
  const pickerOpenRef = useRef(false);
  pickerOpenRef.current = pickerOpen;

  const actionKind = action?.kind;
  const existingTop5Key = existingTop5?.join(',') ?? '';

  // Advance with backend capabilities (e.g. after auto-save). Never pull the
  // player back from a summary they just reached — Edit owns that direction.
  useEffect(() => {
    const next = resolveInitialStep(action);
    setStep((current) => {
      if (current === 'top5' && (next === 'h2h' || next === 'summary')) {
        // While the picker is open the player drives the steps. The Top 5
        // saves the instant it is complete, so this fires on the same beat as
        // the celebration — advancing here would snatch the finished card away
        // before they had looked at it, and make the Continue button they were
        // reaching for vanish under their thumb.
        if (suppressStepAutoAdvanceRef.current || pickerOpenRef.current) {
          return current;
        }
        return next;
      }
      if (current === 'h2h' && next === 'summary') {
        return 'summary';
      }
      return current;
    });
    if (existingTop5?.length === 5) {
      setTopFiveComplete(true);
      setTopFivePicks(existingTop5);
    }
    // `action` / `existingTop5` are new references most renders; sync on the
    // stable capability + pick signature instead.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- see above
  }, [actionKind, existingTop5Key]);

  // The last duel saves itself, and that save is what moves the weekend to
  // `summary` — it does not go through the form's `onSuccess`. Without this the
  // overlay stayed open over a step that no longer renders anything, so
  // finishing the card left an empty sheet with only a close button.
  useEffect(() => {
    if (step === 'summary' && pickerOpen) {
      setPickerOpen(false);
    }
  }, [step, pickerOpen]);

  useEffect(() => {
    return deferUntilAfterLoad(() => void loadH2HForm());
  }, []);

  const liveMatchups = useQuery(
    api.h2h.getMatchupsForSeason,
    h2hVisited || step === 'h2h' || step === 'summary'
      ? { round: weekend.race.round, season: weekend.race.season }
      : 'skip',
  );
  const matchups = liveMatchups ?? initialMatchups;

  const countryCode = getCountryCodeForRace(weekend.race);
  const openSessions = weekend.sessions.filter(
    (session) => session.canCreate || session.canEdit,
  );

  const showInteractive = step === 'top5' || step === 'h2h';

  // The card on screen. During first entry there is no choice to make (picks
  // cascade), so the header only offers session tabs once there is a saved card
  // to switch between.
  const defaultSession =
    weekend.sessions.find((s) => s.sessionType === action?.sessionType) ??
    openSessions[0] ??
    weekend.sessions.at(-1) ??
    null;
  const activeSession =
    (selectedSession
      ? weekend.sessions.find((s) => s.sessionType === selectedSession)
      : null) ?? defaultSession;
  const defaultSessionType = defaultSession?.sessionType;

  // Countdown, tabs and card all describe the same session: switching a tab
  // moves the clock with it rather than leaving the header talking about a
  // session the card below is no longer showing.
  const clockSession = showInteractive ? defaultSession : activeSession;

  const topFivePositions = Object.fromEntries(
    topFivePicks.map((driverId, index) => [driverId, index + 1]),
  );

  /**
   * Latch the tab the first time a saved card is on screen.
   *
   * `action` is derived from live capability flags, so leaving the tab bound to
   * it means anything that moves the weekend's "next thing to do" swaps the card
   * out from under whoever is reading it: a session locking, or (as happened in
   * review) the round trip of a write landing on all four sessions at once. The
   * default still decides which session opens; after that the choice is the
   * player's, whether they made it or we did.
   */
  useEffect(() => {
    if (showInteractive || selectedSession !== null || !defaultSessionType) {
      return;
    }
    setSelectedSession(defaultSessionType);
  }, [showInteractive, selectedSession, defaultSessionType]);

  function continueToH2H() {
    if (!topFiveComplete) {
      return;
    }
    suppressStepAutoAdvanceRef.current = false;
    setH2HVisited(true);
    setStep('h2h');
  }

  function goBackToTop5() {
    suppressStepAutoAdvanceRef.current = true;
    setStep('top5');
  }

  function openPicker() {
    setPickerOpen(true);
    if (step === 'h2h') {
      setH2HVisited(true);
    }
  }

  /**
   * Closing is always safe: both forms save themselves the moment their set is
   * complete, so there is never an unsaved card to lose here. Remounting the
   * pickers on the next open is what keeps a half-finished attempt from being
   * restored into a card that has since been saved from another device.
   */
  function closePicker() {
    setPickerOpen(false);
    setPickerGeneration((generation) => generation + 1);
  }

  return (
    <section
      id="dashboard-weekend-picks"
      className={`scroll-mt-28 ${WEEKEND_CARD_SHELL}`}
      aria-labelledby="dashboard-weekend-title"
      data-testid="dashboard-weekend-hero"
    >
      <div className="border-b border-border p-4 sm:p-5">
        {/* No wrap: the link belongs in the corner, level with the eyebrow.
            Wrapping dropped it under the race name, where it read as part of
            the card's own controls rather than a way out of it. */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 flex-wrap items-center gap-3">
            {countryCode ? (
              <RaceFlag
                countryCode={countryCode}
                size="lg"
                className="overflow-hidden rounded-sm border border-border"
              />
            ) : null}
            <div className="min-w-0">
              <p className="gpp-label text-text-muted">
                Round {weekend.race.round}
                {weekend.race.hasSprint ? ' · Sprint weekend' : ''}
              </p>
              <h2
                id="dashboard-weekend-title"
                className="mt-1 text-xl font-semibold tracking-tight text-text sm:text-2xl"
              >
                {weekend.race.name}
              </h2>
            </div>
          </div>
          {/* There used to be an "N open" pill next to this. The tab row below
              already names every session and its state, so the count was the
              same fact in a louder font. */}
          <Link
            to="/races/$raceSlug"
            params={{ raceSlug: weekend.race.slug }}
            search={{ from: 'home' }}
            className="mt-0.5 inline-flex shrink-0 items-center gap-1 text-sm whitespace-nowrap text-text-muted underline underline-offset-4 transition-colors hover:text-text focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:outline-none"
          >
            Full weekend
            <ArrowRight className="size-3.5 shrink-0" aria-hidden />
          </Link>
        </div>

        {/* This line keeps its slot whatever the selected session is. It used to
            render only for an open session, so switching to a locked tab
            removed it and jumped everything below up by a line. A locked
            session has something to say here anyway. */}
        <SessionClockLine session={clockSession} now={now} />

        {/* One session row, two jobs. While the picks are still being made it
            is status only — the picks cascade, so offering a session to choose
            would be asking a question with no consequence. Once there is a
            saved card it becomes the tab strip for it, which is what keeps
            per-session edits on the dashboard instead of on the race page. */}
        {/* `nowrap` is the contract, and the overflow is the safety net for it:
            shortened copy fits four sprint sessions at 320px, but a longer
            session name or a large text setting must scroll rather than
            reflow. `-mx-*`/`px-*` keeps the scroll edge flush with the card
            while the chips stay aligned to its padding. */}
        <div
          className="-mx-4 mt-4 flex [scrollbar-width:none] gap-x-4 overflow-x-auto px-4 [-ms-overflow-style:none] sm:-mx-5 sm:px-5 [&::-webkit-scrollbar]:hidden"
          role={showInteractive ? undefined : 'tablist'}
          aria-label={showInteractive ? undefined : 'Weekend sessions'}
        >
          {weekend.sessions.map((session) => (
            <SessionChip
              key={session.sessionType}
              session={session}
              selected={
                !showInteractive &&
                session.sessionType === activeSession?.sessionType
              }
              onSelect={
                showInteractive
                  ? undefined
                  : () => setSelectedSession(session.sessionType)
              }
            />
          ))}
        </div>
      </div>

      <div className="p-4 sm:p-5">
        {showInteractive ? (
          <PicksInvitation
            step={step}
            topFivePicks={topFivePicks}
            drivers={drivers}
            onOpen={openPicker}
          />
        ) : activeSession ? (
          <DashboardPicksSummary
            key={activeSession.sessionType}
            raceId={weekend.race._id}
            raceSlug={weekend.race.slug}
            session={activeSession}
            picks={{
              top5:
                myPredictions?.predictions?.[activeSession.sessionType] ??
                (topFivePicks.length === 5 ? topFivePicks : null),
              h2h: myH2H?.[activeSession.sessionType] ?? null,
            }}
            drivers={drivers}
            matchups={matchups}
          />
        ) : null}
      </div>

      {/* Both steps live in here, and the card outside is only ever an
          invitation into it. Picking is the one thing on this page that wants
          the whole screen: twenty-two drivers and then eleven duels do not fit
          beside a leagues rail, and inline they pushed everything else on the
          dashboard below the fold. */}
      <PicksFocusOverlay
        open={pickerOpen}
        onClose={closePicker}
        title={step === 'h2h' ? 'Team-mate picks' : 'Your Top 5'}
        subtitle={
          step === 'h2h'
            ? 'Step 2 of 2'
            : 'Step 1 of 2 · applies to every open session'
        }
      >
        <div className="pb-4 sm:pb-0">
          {step === 'h2h' && topFiveComplete ? (
            <button
              type="button"
              className="gpp-label mb-4 -ml-1 inline-flex items-center gap-0.5 text-accent transition-colors hover:text-accent-hover"
              onClick={goBackToTop5}
            >
              <ChevronLeft className="size-3.5" aria-hidden />
              Back to your Top 5
            </button>
          ) : null}

          {step === 'top5' ? (
            <PredictionForm
              key={`picker-${pickerGeneration}`}
              raceId={weekend.race._id}
              initialDrivers={drivers}
              // Server truth only. Seeding this from the live `topFivePicks`
              // tells the form its current picks are already saved, so `dirty`
              // goes false on the fifth tap and the auto-save never fires —
              // the picks then exist nowhere but this component's state.
              existingPicks={existingTop5 ?? undefined}
              enableNavigationBlocker={false}
              mobileActionFirst
              onCompletionStateChange={setTopFiveComplete}
              onPicksChange={setTopFivePicks}
              renderActionArea={({ complete, saveState, saveNow }) =>
                complete ? (
                  <div
                    className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2"
                    data-testid="top5-handoff"
                  >
                    <Button
                      variant="primary"
                      size="md"
                      className="w-full sm:w-auto"
                      // Step 2 unmounts this form, which cancels any debounced
                      // edit save with it. The first save is immediate and has
                      // already landed by now; a reorder made just before
                      // tapping Continue has not.
                      onClick={async () => {
                        await saveNow();
                        continueToH2H();
                      }}
                    >
                      Continue to team-mate picks
                    </Button>
                    <PicksSaveStatus state={saveState} />
                  </div>
                ) : null
              }
            />
          ) : null}

          {step === 'h2h' && h2hVisited ? (
            matchups === undefined ? (
              <H2HPickerSkeleton />
            ) : (
              <Suspense fallback={<H2HPickerSkeleton />}>
                <H2HPredictionForm
                  key={`h2h-${pickerGeneration}`}
                  raceId={weekend.race._id}
                  matchups={matchups}
                  existingPicks={existingH2H ?? undefined}
                  entryMethod="top5_handoff"
                  topFivePositions={topFivePositions}
                  onSuccess={closePicker}
                  onExitPrevious={goBackToTop5}
                  renderCardIntro={() => (
                    <TopFiveStrip
                      topFivePicks={topFivePicks}
                      drivers={drivers}
                      // Editing the Top 5 from step 2 rewinds this overlay
                      // rather than stacking a second one on top of it.
                      onEditTopFive={goBackToTop5}
                    />
                  )}
                />
              </Suspense>
            )
          ) : null}
        </div>
      </PicksFocusOverlay>
    </section>
  );
}

function resolveInitialStep(
  action: ReturnType<typeof getDashboardWeekendAction>,
): PicksStep {
  if (!action) {
    return 'summary';
  }
  if (action.kind === 'make_top5') {
    return 'top5';
  }
  if (action.kind === 'finish_h2h') {
    return 'h2h';
  }
  return 'summary';
}

function firstWeekendTop5(
  predictions: Record<string, Id<'drivers'>[] | null> | null | undefined,
): Id<'drivers'>[] | null {
  if (!predictions) {
    return null;
  }
  for (const picks of Object.values(predictions)) {
    if (picks && picks.length === 5) {
      return picks;
    }
  }
  return null;
}

function firstWeekendH2H(
  bySession:
    | Record<string, Record<string, Id<'drivers'>> | null>
    | null
    | undefined,
  preferredSession?: string,
): Record<string, Id<'drivers'>> | null {
  if (!bySession) {
    return null;
  }
  if (preferredSession && bySession[preferredSession]) {
    return bySession[preferredSession];
  }
  for (const picks of Object.values(bySession)) {
    if (picks && Object.keys(picks).length > 0) {
      return picks;
    }
  }
  return null;
}

/**
 * The one line under the race name, describing whichever session is selected.
 *
 * It always renders, even when there is nothing to count down to: switching
 * tabs is a comparison, and a line that disappears under a locked session
 * shifts the whole card up by 24px mid-comparison. Locked and scored sessions
 * have their own thing to say in that slot.
 */
function SessionClockLine({
  session,
  now,
}: {
  session: DashboardSessionState | null;
  now: number;
}) {
  // Icon and tone follow the same state as the words, so they cannot disagree.
  // They used to be derived from the capability flags directly, which let an
  // open session with no `lockAt` pair a clock icon with the sentence "is
  // locked".
  const clock = getSessionClockState(session, now);
  const isCounting = clock?.kind === 'countdown' || clock?.kind === 'locking';
  const Icon = clock?.kind === 'results' ? Trophy : isCounting ? Clock3 : Lock;
  const tone =
    clock?.kind === 'results'
      ? 'text-success'
      : isCounting
        ? 'text-accent'
        : 'text-warning';

  return (
    <p
      // `flex-wrap` because the label and the clock are separate flex items:
      // without it, a 320px screen shrinks both instead of wrapping between
      // them, and "Qualifying locks in 00h 44m 57s" breaks mid-phrase with a
      // ragged gap. Wrapping puts the whole clock on the second line.
      className="gpp-mono mt-3 flex min-h-5 flex-wrap items-center gap-1.5 text-sm text-text-muted"
      suppressHydrationWarning
    >
      {session ? (
        <>
          <Icon className={`h-4 w-4 shrink-0 ${tone}`} aria-hidden />
          {clock?.kind === 'countdown' ? (
            <>
              {SESSION_LABELS[session.sessionType]} locks in
              <strong className="ml-1 font-medium text-text">
                {formatLockCountdown(clock.msRemaining)}
              </strong>
            </>
          ) : clock?.kind === 'locking' ? (
            <>{SESSION_LABELS[session.sessionType]} is locking now</>
          ) : clock?.kind === 'results' ? (
            <>{SESSION_LABELS[session.sessionType]} results are published</>
          ) : (
            <>{SESSION_LABELS[session.sessionType]} is locked</>
          )}
        </>
      ) : null}
    </p>
  );
}

/**
 * Picks cascade across the weekend, so per-session *pick* state is almost
 * always identical and saying it four times adds nothing. These report the
 * thing that does vary per session, and once a card is saved they double as the
 * control that switches which session's card is on screen.
 */
function SessionChip({
  session,
  selected = false,
  onSelect,
}: {
  session: DashboardSessionState;
  selected?: boolean;
  /** Omit to render status only (no session choice during first entry). */
  onSelect?: () => void;
}) {
  const isOpen = session.canCreate || session.canEdit;
  const status = session.hasResult ? 'Results' : isOpen ? 'Open' : 'Locked';
  const Icon = session.hasResult ? Trophy : isOpen ? Clock3 : Lock;
  const tone = session.hasResult
    ? 'text-success'
    : isOpen
      ? 'text-accent'
      : 'text-warning';
  // This row must never wrap. Four chips reading "Sprint Quali · Locked" ran
  // past the card at every width that mattered, and a tab strip that reflows
  // to a second line stops reading as one control.
  //
  // The status word is what got cut. The icon carries it (lock / clock /
  // trophy) and so does the colour, so spelling it out was the third copy of
  // the same fact — it stays for screen readers, which get neither. Names go
  // short below `sm` on top of that.
  const label = (
    <>
      <Icon className="h-3 w-3 shrink-0" aria-hidden />
      <span className="sm:hidden">
        {SESSION_LABELS_SHORT[session.sessionType]}
      </span>
      <span className="hidden sm:inline">
        {SESSION_LABELS[session.sessionType]}
      </span>
      <span className="sr-only">· {status}</span>
    </>
  );
  const base =
    'inline-flex shrink-0 items-center gap-1 rounded-sm text-[11px] font-semibold tracking-label whitespace-nowrap uppercase transition-colors';

  if (!onSelect) {
    return <span className={`${base} ${tone}`}>{label}</span>;
  }

  return (
    <button
      type="button"
      role="tab"
      aria-selected={selected}
      tabIndex={selected ? 0 : -1}
      onClick={onSelect}
      data-testid={`session-tab-${session.sessionType}`}
      className={`${base} ${tone} -mx-1 px-1 decoration-2 underline-offset-[6px] focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:outline-none ${
        selected ? 'underline' : 'opacity-60 hover:opacity-100'
      }`}
    >
      {label}
    </button>
  );
}

/**
 * What the card shows while there is still picking to do: what the step is,
 * what is already down, and one button into the full-screen picker.
 *
 * The pickers used to render here. Twenty-two driver tiles and then eleven
 * duels is more than a dashboard card can hold — it buried the rail, the
 * standings and everything else below a screen and a half of picker, and made
 * the card look like the page rather than one thing on it.
 */
function PicksInvitation({
  step,
  topFivePicks,
  drivers,
  onOpen,
}: {
  step: PicksStep;
  topFivePicks: Id<'drivers'>[];
  drivers: Doc<'drivers'>[];
  onOpen: () => void;
}) {
  const onH2H = step === 'h2h';
  const hasTopFive = topFivePicks.length === 5;

  return (
    <div data-testid="dashboard-picks-invitation">
      <p className="gpp-label text-accent">Step {onH2H ? '2' : '1'} of 2</p>
      <h3 className="mt-1 text-lg font-semibold text-text sm:text-xl">
        {onH2H ? 'Choose who finishes ahead' : 'Choose your Top 5'}
      </h3>
      <p className="mt-1 text-sm text-text-muted">
        {onH2H
          ? 'Choose one driver from each team. Each correct pick earns one point.'
          : 'Tap drivers in finishing order. One card covers every open session.'}
      </p>

      {hasTopFive ? (
        <div className="mt-4">
          <p className="gpp-label text-text-muted">Your Top 5</p>
          <TopFivePicksBar picks={topFivePicks} drivers={drivers} />
        </div>
      ) : null}

      <div className="mt-4">
        <Button
          variant="primary"
          size="md"
          className="w-full sm:w-auto"
          onClick={onOpen}
          rightIcon={ArrowRight}
          data-testid="open-picks-picker"
        >
          {onH2H
            ? 'Make your team-mate picks'
            : hasTopFive
              ? 'Edit your Top 5'
              : 'Make your picks'}
        </Button>
      </div>
    </div>
  );
}

function TopFiveStrip({
  topFivePicks,
  drivers,
  onEditTopFive,
}: {
  topFivePicks: Id<'drivers'>[];
  drivers: Doc<'drivers'>[];
  onEditTopFive?: () => void;
}) {
  if (topFivePicks.length === 0) {
    return null;
  }

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between gap-3">
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
    </div>
  );
}

function H2HPickerSkeleton() {
  return (
    <div
      className="grid grid-cols-1 gap-2 pb-2 sm:grid-cols-2"
      aria-busy="true"
      aria-label="Loading team-mate matchups"
    >
      {Array.from({ length: 6 }).map((_, index) => (
        <div
          key={index}
          className="h-[88px] rounded-lg border border-border bg-surface-muted/40"
        />
      ))}
    </div>
  );
}
