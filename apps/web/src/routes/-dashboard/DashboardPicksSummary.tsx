import type { Doc, Id } from '@convex-generated/dataModel';
import { ArrowRight, Check, Pencil } from 'lucide-react';
import { Link } from '@tanstack/react-router';
import { lazy, Suspense, useState } from 'react';

import { Button } from '@/components/Button/Button';
import { H2HDuelFocusModal } from '@/components/H2HDuelFocusModal';
import type { H2HMatchup } from '@/components/H2HMatchupGrid';
import { H2HPicksBar } from '@/components/H2HPicksBar';
import { PicksFocusOverlay } from '@/components/PicksFocusOverlay';
import { PicksSaveStatus } from '@/components/PicksSaveStatus';
import { PredictionForm } from '@/components/PredictionForm';
import { TopFivePicksBar } from '@/components/TopFivePicksBar';
import { SESSION_LABELS } from '@/lib/sessions';

import type { DashboardSessionState } from './dashboardState';

/**
 * The label row above a picks bar keeps its height whether or not the session
 * is editable. The "Edit" button and the team-mate hint only exist on an open
 * session, so without a reserved slot every switch between a locked tab and an
 * open one moved both bars (and everything under them) by a few pixels. The
 * coarse-pointer floor matches the inline button's touch target for the same
 * reason.
 */
const PICKS_LABEL_ROW =
  'flex min-h-5 items-center justify-between gap-3 pointer-coarse:min-h-11';

const H2HPredictionForm = lazy(() =>
  import('@/components/H2HPredictionForm').then((module) => ({
    default: module.H2HPredictionForm,
  })),
);

export type SessionPicks = {
  top5: Id<'drivers'>[] | null;
  h2h: Record<string, Id<'drivers'>> | null;
};

/**
 * The saved prediction card, on the dashboard, for one session.
 *
 * Everything a player does with a finished card happens here rather than on the
 * race page: read it, switch which session you are reading, change one Top 5,
 * change one team-mate call. The race page is still linked for the full weekend
 * view, but it is no longer the only place picks can be edited, because sending
 * someone off the dashboard to change their mind is how a two-second edit turns
 * into a navigation.
 *
 * Scope is always this one session, and deliberately only that. The first save
 * cascades across the weekend (see DashboardWeekendPicks), so every session
 * starts from the same card and a player who never opens a tab is already done.
 * From there an edit means one session. There is no way to re-cascade: offering
 * one meant explaining scope on every edit, and the whole point of cascading
 * the first save is that scope is a question most players never have to answer.
 */
export function DashboardPicksSummary({
  raceId,
  raceSlug,
  session,
  picks,
  drivers,
  matchups,
}: {
  raceId: Id<'races'>;
  raceSlug: string;
  session: DashboardSessionState;
  picks: SessionPicks;
  drivers: Doc<'drivers'>[];
  matchups: H2HMatchup[] | undefined;
}) {
  const [top5OverlayOpen, setTop5OverlayOpen] = useState(false);
  const [h2hOverlayOpen, setH2HOverlayOpen] = useState(false);
  const [duelIndex, setDuelIndex] = useState<number | null>(null);

  const editable = session.canCreate || session.canEdit;
  const top5 = picks.top5 ?? [];
  const h2hSelections = picks.h2h ?? {};
  const h2hCalled = matchups
    ? matchups.filter((matchup) => h2hSelections[matchup._id]).length
    : 0;
  const h2hTotal = matchups?.length ?? 0;
  const h2hComplete = h2hTotal > 0 && h2hCalled === h2hTotal;

  const topFivePositions = Object.fromEntries(
    top5.map((driverId, index) => [driverId, index + 1]),
  );

  const sessionLabel = SESSION_LABELS[session.sessionType];
  const activeDuel =
    duelIndex === null ? null : (matchups?.[duelIndex] ?? null);
  // A session can be missing a card entirely: the cascade skips sessions that
  // were already locked when the picks were first submitted.
  const hasCard = top5.length > 0;

  return (
    <div data-testid="dashboard-picks-summary">
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
        <div className="min-w-0">
          {/* `h2` for the same reason as the invitation heading it swaps
              with: the card title above it is the page `h1`. */}
          <h2 className="text-xl font-normal text-text">
            {!hasCard
              ? `No ${sessionLabel.toLowerCase()} picks`
              : session.hasResult
                ? `${sessionLabel} results are in`
                : editable
                  ? `Your ${sessionLabel.toLowerCase()} picks`
                  : `${sessionLabel} picks are locked`}
          </h2>
          <p className="mt-1 text-sm text-text-muted">
            {summaryDetail({ session, editable, h2hComplete, hasCard })}
          </p>
        </div>
        {!hasCard && editable ? (
          <Button
            size="sm"
            variant="primary"
            onClick={() => setTop5OverlayOpen(true)}
          >
            Make {sessionLabel.toLowerCase()} picks
          </Button>
        ) : session.hasResult ? (
          <Button asChild size="sm" variant="secondary" rightIcon={ArrowRight}>
            <Link
              to="/races/$raceSlug"
              params={{ raceSlug }}
              search={{ from: 'home', session: session.sessionType }}
            >
              View results
            </Link>
          </Button>
        ) : null}
      </div>

      {hasCard ? (
        <>
          <div className="mt-5">
            <div className={PICKS_LABEL_ROW}>
              <p className="gpp-label text-text-muted">Your Top 5</p>
              {editable ? (
                <Button
                  variant="text"
                  size="inline"
                  leftIcon={Pencil}
                  onClick={() => setTop5OverlayOpen(true)}
                  data-testid="summary-edit-top5"
                >
                  Edit
                </Button>
              ) : null}
            </div>
            <TopFivePicksBar picks={top5} drivers={drivers} />
          </div>

          <div className="mt-5">
            <div className={PICKS_LABEL_ROW}>
              <p className="gpp-label flex items-center gap-1.5 text-text-muted">
                {h2hComplete ? (
                  <Check size={14} className="text-accent" aria-hidden="true" />
                ) : null}
                Team-mate picks
              </p>
              {/* A hint, not a heading: quiet, and on the row it belongs to. */}
              {editable && h2hTotal > 0 ? (
                <p className="text-xs text-text-muted">
                  {h2hComplete
                    ? 'Tap one to change it'
                    : `${h2hTotal - h2hCalled} left to pick`}
                </p>
              ) : null}
            </div>
            {matchups === undefined ? (
              <div
                className="mt-2 h-7 animate-pulse rounded-sm bg-surface-muted"
                aria-hidden
              />
            ) : (
              <H2HPicksBar
                matchups={matchups}
                selections={h2hSelections}
                onSelectIndex={editable ? setDuelIndex : undefined}
                testId="summary-h2h-bar"
              />
            )}
            {editable && matchups && !h2hComplete ? (
              <div className="mt-3">
                <Button
                  size="sm"
                  variant="primary"
                  onClick={() => setH2HOverlayOpen(true)}
                  data-testid="summary-finish-h2h"
                >
                  {h2hCalled === 0
                    ? 'Make your team-mate picks'
                    : 'Finish team-mate picks'}
                </Button>
              </div>
            ) : null}
          </div>
        </>
      ) : null}

      <PicksFocusOverlay
        open={top5OverlayOpen}
        onClose={() => setTop5OverlayOpen(false)}
        title="Your Top 5"
        subtitle={`${sessionLabel} only`}
      >
        <div className="pb-4 sm:pb-0">
          <PredictionForm
            raceId={raceId}
            sessionType={session.sessionType}
            initialDrivers={drivers}
            existingPicks={picks.top5 ?? undefined}
            enableNavigationBlocker={false}
            // No `onSuccess` close. This card is already saved, so every write
            // in here is a background auto-save of an edit, and letting one
            // close the overlay meant the screen vanished mid-swap: drag a
            // driver, pause, and the debounce fired the exit for you. Leaving
            // is the player's move and theirs only.
            //
            // Matches the weekend card's overlay. Without it this one ended on
            // a disabled "Saved" button: the picks were safe, but the only way
            // out was the X in the corner, so the state that means "you're
            // finished" looked like the state that means "this is broken".
            renderActionArea={({ complete, saveState, saveNow }) =>
              complete ? (
                <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
                  <Button
                    variant="primary"
                    size="md"
                    className="w-full sm:w-auto"
                    // Flush first: an edit made in the last second is still
                    // sitting behind the debounce, and closing unmounts the
                    // form that owns the timer.
                    onClick={async () => {
                      await saveNow();
                      setTop5OverlayOpen(false);
                    }}
                    data-testid="summary-top5-done"
                  >
                    Done
                  </Button>
                  <PicksSaveStatus state={saveState} />
                </div>
              ) : null
            }
          />
        </div>
      </PicksFocusOverlay>

      <PicksFocusOverlay
        open={h2hOverlayOpen}
        onClose={() => setH2HOverlayOpen(false)}
        title="Team-mate picks"
        subtitle={`${sessionLabel} only`}
      >
        {matchups ? (
          <Suspense fallback={<div className="h-40" aria-busy />}>
            <H2HPredictionForm
              // A half-called card opens as an empty one on purpose. Resuming
              // mid-sequence drops the player on battle four of eleven with no
              // account of the three behind it, and the calls it skips are
              // exactly the ones they stopped to think about. Eleven quick
              // questions from the top is the shape this flow is good at, and
              // re-answering three is cheaper than wondering what they were.
              // A single call they want to revisit has its own duel modal.
              existingPicks={h2hComplete ? (picks.h2h ?? undefined) : undefined}
              raceId={raceId}
              sessionType={session.sessionType}
              matchups={matchups}
              topFivePositions={topFivePositions}
              onSuccess={() => setH2HOverlayOpen(false)}
              // Eleven stacked rows in a full-screen takeover is a scroll, not
              // a decision.
              layout="sequential"
            />
          </Suspense>
        ) : null}
      </PicksFocusOverlay>

      <H2HDuelFocusModal
        open={activeDuel !== null}
        onClose={() => setDuelIndex(null)}
        raceId={raceId}
        sessionType={session.sessionType}
        matchup={activeDuel}
        selectedDriverId={
          activeDuel ? h2hSelections[activeDuel._id] : undefined
        }
        topFivePositions={topFivePositions}
      />
    </div>
  );
}

function summaryDetail({
  session,
  editable,
  h2hComplete,
  hasCard,
}: {
  session: DashboardSessionState;
  editable: boolean;
  h2hComplete: boolean;
  hasCard: boolean;
}): string {
  if (!hasCard) {
    return editable
      ? 'Nothing saved for this session yet.'
      : 'This session locked before you picked for it.';
  }
  if (session.hasResult) {
    return 'This is the card you submitted for this session.';
  }
  if (!editable) {
    return 'Locked in. Points land once the results are published.';
  }
  if (!h2hComplete) {
    return 'Your Top 5 is saved. Finish your team-mate picks to complete the card.';
  }
  return 'Saved. Change anything here until this session locks.';
}
