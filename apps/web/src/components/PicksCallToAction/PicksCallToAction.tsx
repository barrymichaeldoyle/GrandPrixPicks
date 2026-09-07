import { Link } from '@tanstack/react-router';
import { ArrowRight, Flag } from 'lucide-react';

import { Button } from '@/components/Button/Button';
import { useViewerSession } from '@/integrations/clerk/useViewerSession';
import { captureAnalyticsEvent } from '@/lib/analytics';
import { type PicksCtaState, picksCtaCopy } from '@/lib/picksCta';

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
 */
export function PicksCallToAction({
  className,
  hasPicks,
  placement,
  raceSlug,
  venueName,
}: PicksCallToActionProps) {
  const { isSignedIn } = useViewerSession();

  const state: PicksCtaState = !isSignedIn
    ? 'signed-out'
    : hasPicks
      ? 'has-picks'
      : 'no-picks';
  const copy = picksCtaCopy(state, venueName);
  const destination = raceSlug ? 'race_page' : 'predictions_hub';

  function track() {
    captureAnalyticsEvent('public_page_cta_clicked', {
      destination,
      placement,
      state,
    });
  }

  return (
    <section
      className={`rounded-sm border border-accent/25 bg-accent-muted/20 p-6 text-center sm:p-8 ${className ?? ''}`}
    >
      <Flag className="mx-auto mb-3 h-7 w-7 text-accent" aria-hidden />
      <h2 className="font-title text-xl font-semibold text-text">
        {copy.heading}
      </h2>
      <p className="gpp-reading-copy mx-auto mt-2 max-w-xl text-text-muted">
        {copy.body}
      </p>
      <Button asChild size="md" rightIcon={ArrowRight} className="mt-5">
        {raceSlug ? (
          <Link to="/races/$raceSlug" params={{ raceSlug }} onClick={track}>
            {copy.action}
          </Link>
        ) : (
          <Link to="/f1-predictions-this-weekend" onClick={track}>
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
    </section>
  );
}
