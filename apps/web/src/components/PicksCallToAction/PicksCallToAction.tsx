import { api } from '@convex-generated/api';
import type { Doc } from '@convex-generated/dataModel';
import { Link } from '@tanstack/react-router';
import { ArrowRight, Flag as FlagIcon } from 'lucide-react';
import { lazy, Suspense, useState } from 'react';

import { Button } from '@/components/Button/Button';
import { ErrorBoundary } from '@/components/error/ErrorBoundary';
import { Flag } from '@/components/Flag';
import { InlineLoader } from '@/components/InlineLoader';
import { PicksFocusOverlay } from '@/components/PicksFocusOverlay';
import { useViewerSession } from '@/integrations/clerk/useViewerSession';
import { useQuery } from '@/integrations/convex/query';
import { captureAnalyticsEvent } from '@/lib/analytics';
import { abbreviateGrandPrix } from '@/lib/display';
import { type PicksCtaState, picksCtaCopy } from '@/lib/picksCta';
import { getCountryCodeForRace } from '@/lib/raceCountries';
import { formatViewerLockDate } from '@/lib/raceLockTime';
import { getNextSessionLock } from '@/lib/raceSessions';
import { getRaceWriteupPhase, isRaceWriteupLive } from '@/lib/raceWriteupPhase';
import { SESSION_LABELS } from '@/lib/sessions';
import { useNow } from '@/lib/testing/now';

/**
 * The same picker the write-ups and the predictions hub embed, opened in the
 * same overlay the dashboard and landing page use. Nothing here is new: the
 * form resolves its own drivers, saved picks and duels from the round, and it
 * already handles a signed-out save by storing the draft and asking Clerk for
 * a sign-in, after which `PendingPickSubmitter` submits it.
 *
 * Lazy because the reference pages that render this panel are read-mostly: the
 * drag-and-drop picker, its auth code and its data reads should not be in the
 * bundle a reader gets for an article they never act on.
 */
const RaceWriteupPicksForm = lazy(() =>
  import('@/components/race-writeups/RaceWriteupPicksForm').then((module) => ({
    default: module.RaceWriteupPicksForm,
  })),
);

/**
 * Which public page the panel is closing. Kept finite so the funnel can rank
 * the reference pages against each other rather than reading one merged total.
 */
type PicksCtaPlacement =
  | 'about'
  | 'circuits_index'
  | 'f1_calendar_2027'
  | 'f1_line_up_2027'
  | 'f1_qualifying_standings'
  | 'f1_standings'
  | 'guide'
  | 'guides_index'
  | 'how_to_play'
  | 'team_mate_battles';

type PicksCallToActionProps = {
  className?: string;
  /** Whether the viewer already has picks in for this round, when known. */
  hasPicks?: boolean;
  placement: PicksCtaPlacement;
  /** The round to send the reader to. Without one the hub resolves it. */
  raceSlug?: string;
  venueName?: string;
};

/**
 * The panel that ends a public reference page, pointed at a surface that takes
 * a pick.
 *
 * ## Why it branches on the viewer
 *
 * None of the public pages knew who was reading them. That produced the two
 * bad cases this fixes: a signed-in reader was pitched the game they had
 * already joined, and a reader with picks already in was told to go and make
 * them. `useViewerSession` is the Clerk-free way to ask — it reads the
 * SSR-resolved signal and Clerk's client state through a plain context, so it
 * works on the routes in `clerk-free-routes.ts` without putting the auth
 * runtime on the page for an anonymous visitor.
 *
 * ## Why the destination can be the hub
 *
 * A page cached as static content must not name a specific round in its SSR
 * HTML: the edge holds that markup for an hour, and a race slug baked into it
 * goes stale inside the window. Those callers pass no `raceSlug` and get
 * `/f1-predictions-this-weekend`, which is a stable URL that resolves the round
 * itself. Callers already loading race data pass the slug and get a direct
 * link. Either way the link is in the server-rendered HTML, so a crawler sees
 * it — a `<Link>` behind a client-only query is not there at all.
 *
 * ## Why the weekend is named on the client
 *
 * A panel reading "This weekend's picks" under a generic flag is the same
 * panel on nine pages in every week of the season, and it reads like a
 * template because it is one. Naming the round is what makes it current, and
 * the round is exactly what cannot go into cached SSR markup.
 *
 * So it resolves the round itself, client-side, and upgrades in place: the
 * heading names the Grand Prix, the icon becomes that country's flag, and a
 * line appears saying which session locks next and when. Cached HTML keeps the
 * generic wording and the hub link, which is what a crawler and a first paint
 * should see anyway.
 *
 * ## Why the button opens a picker instead of leaving
 *
 * Sending a reader who just finished an article to another page to start over
 * is a hand-off that costs most of them. Once the round has resolved there is
 * nothing left to fetch on arrival, so the panel finishes the job in place: the
 * click opens the picks overlay over the page they are on.
 *
 * It stays an ordinary link underneath. The `href` is what the SSR HTML
 * carries, so a crawler follows it, a middle-click opens it in a tab, and a
 * reader whose JavaScript has not booted still gets the hub. Only a plain
 * left-click with a resolved round is intercepted.
 *
 * The hub link is also the fallback when the round has not resolved, which is
 * why the destination never changes with the copy: the panel has one
 * destination and one overlay, not two destinations.
 */
export function PicksCallToAction({
  className,
  hasPicks,
  placement,
  raceSlug,
  venueName,
}: PicksCallToActionProps) {
  const { isSignedIn } = useViewerSession();

  /*
   * Only when the caller named neither the round nor the venue: a page already
   * holding race data has better answers than this query, and asking anyway
   * would put a second subscription on it.
   *
   * `getQuickPickRace` is the query the hub resolves too, so the panel and the
   * page its button leads to can never name different weekends.
   */
  const needsWeekend = !raceSlug && !venueName;
  const weekendRace = useQuery(
    api.races.getQuickPickRace,
    needsWeekend ? {} : 'skip',
  );
  // Coarse: the panel names a lock date, it does not count seconds, and the
  // live/locked boundary is the only thing that has to notice the clock.
  const now = useNow(30_000);

  const state: PicksCtaState = !isSignedIn
    ? 'signed-out'
    : hasPicks
      ? 'has-picks'
      : 'no-picks';
  const resolvedVenue =
    venueName ??
    (weekendRace ? abbreviateGrandPrix(weekendRace.name) : undefined);
  const copy = picksCtaCopy(state, resolvedVenue);
  const destination = raceSlug ? 'race_page' : 'predictions_hub';
  const deadline = weekendRace ? nextLockLine(weekendRace, now) : null;
  const countryCode = weekendRace ? getCountryCodeForRace(weekendRace) : null;

  const [picksOpen, setPicksOpen] = useState(false);

  /*
   * Only while the weekend can still take a pick. After the race locks the
   * overlay would open on a picker that can save nothing, so the button goes
   * back to being a link and the hub explains the state.
   */
  const phase = weekendRace ? getRaceWriteupPhase(weekendRace, now) : null;
  const canPickHere = Boolean(weekendRace && phase && isRaceWriteupLive(phase));

  function track(openedOverlay: boolean) {
    captureAnalyticsEvent('public_page_cta_clicked', {
      destination: openedOverlay ? 'picks_overlay' : destination,
      placement,
      state,
    });
  }

  /**
   * Intercepts only the click a reader means as "start picking here".
   *
   * Modified clicks (new tab, new window, download) and anything but the
   * primary button are left to the browser, so the link keeps behaving like a
   * link.
   */
  function handleCtaClick(event: React.MouseEvent<HTMLAnchorElement>) {
    const plainClick =
      event.button === 0 &&
      !event.metaKey &&
      !event.ctrlKey &&
      !event.shiftKey &&
      !event.altKey;

    if (canPickHere && plainClick) {
      event.preventDefault();
      setPicksOpen(true);
      track(true);
      return;
    }

    track(false);
  }

  return (
    <section
      className={`rounded-sm border border-accent/25 bg-accent-muted/20 p-6 text-center sm:p-8 ${className ?? ''}`}
    >
      {countryCode ? (
        <Flag code={countryCode} size="lg" className="mx-auto mb-3" />
      ) : (
        <FlagIcon className="mx-auto mb-3 h-7 w-7 text-accent" aria-hidden />
      )}
      <h2 className="font-title text-xl font-semibold text-text">
        {copy.heading}
      </h2>
      {/* The one line that makes the panel current rather than evergreen. It
          is absent until the round resolves, and once the whole weekend is
          locked, so it never counts down to a deadline that has gone. */}
      {deadline ? (
        <p className="gpp-reading-meta mt-1 text-text-muted">{deadline}</p>
      ) : null}
      <p className="gpp-reading-copy mx-auto mt-2 max-w-xl text-text-muted">
        {copy.body}
      </p>
      <Button asChild size="md" rightIcon={ArrowRight} className="mt-5">
        {raceSlug ? (
          <Link
            to="/races/$raceSlug"
            params={{ raceSlug }}
            onClick={handleCtaClick}
          >
            {copy.action}
          </Link>
        ) : (
          <Link to="/f1-predictions-this-weekend" onClick={handleCtaClick}>
            {copy.action}
          </Link>
        )}
      </Button>
      {/* Signed-out only. A signed-in reader has the leaderboard in the header
          and the footer of the page they are standing on, so a third link to
          it under the one button that matters competed with that button
          instead of helping. The signed-out line survives because scoring is
          the question a stranger actually has before they pick. */}
      {isSignedIn ? null : (
        <p className="mt-4 text-sm leading-6 text-text-muted">
          <Link
            to="/how-to-play"
            className="font-semibold text-text underline decoration-border-strong underline-offset-4 hover:text-accent"
          >
            How scoring works
          </Link>{' '}
          covers the points for each position.
        </p>
      )}

      {/* Mounted only once opened, so the picker's chunk and its Convex reads
          are paid for by the reader who asked for them. */}
      {weekendRace && picksOpen ? (
        <PicksFocusOverlay
          open
          onClose={() => setPicksOpen(false)}
          title={`Your ${resolvedVenue ?? 'weekend'} Top 5`}
          subtitle="Applies to every session this weekend"
        >
          <div className="pb-4 text-left sm:pb-0">
            <ErrorBoundary>
              <Suspense
                fallback={
                  <InlineLoader
                    label="Loading the prediction picker"
                    className="min-h-96"
                  />
                }
              >
                <RaceWriteupPicksForm
                  analyticsSource="predictions_hub"
                  phase={phase ?? 'preview'}
                  raceId={weekendRace._id}
                  round={weekendRace.round}
                  season={weekendRace.season}
                />
              </Suspense>
            </ErrorBoundary>
          </div>
        </PicksFocusOverlay>
      ) : null}
    </section>
  );
}

/**
 * "Qualifying picks lock Sat 12 Sept, 16:00", in the reader's own timezone.
 *
 * Client-only by construction: the server runs in UTC, so formatting a local
 * instant there formats it for the wrong person. The line only exists once the
 * round has resolved on the client, so there is no server rendering of it to
 * mismatch.
 */
function nextLockLine(race: Doc<'races'>, now: number): string | null {
  const next = getNextSessionLock(race, now);
  if (!next) {
    return null;
  }

  const lock = formatViewerLockDate(next.lockAt);
  if (!lock) {
    return null;
  }

  return `${SESSION_LABELS[next.session]} picks lock ${lock.date}, ${lock.time}`;
}
