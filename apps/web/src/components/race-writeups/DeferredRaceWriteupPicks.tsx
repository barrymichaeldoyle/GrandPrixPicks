import type { Id } from '@convex-generated/dataModel';
import { lazy, Suspense, useEffect, useRef, useState } from 'react';

import { ErrorBoundary } from '@/components/error/ErrorBoundary';
import { InlineLoader } from '@/components/InlineLoader';
import { useViewerSession } from '@/integrations/clerk/useViewerSession';
import { captureAnalyticsEvent } from '@/lib/analytics';
import { PICKS_ANCHOR, useRegisterPicksAnchor } from '@/lib/picksAnchor';
import {
  isRaceWriteupLive,
  type RaceWriteupPhase,
} from '@/lib/raceWriteupPhase';

import { RaceWriteupNextLinks } from './RaceWriteupNextLinks';

export const RACE_WRITEUP_PICKS_ANCHOR = PICKS_ANCHOR;

const PRELOAD_MARGIN = '700px';
/**
 * How long a live page waits before mounting the picker unprompted. Long
 * enough that the article's own images and fonts are in first, short enough
 * that a reader who taps the hero button after reading the summary finds the
 * form rather than its spinner.
 */
const IDLE_MOUNT_TIMEOUT_MS = 2500;

function loadPicksForm() {
  return import('./RaceWriteupPicksForm');
}

/**
 * Fetches the picker's chunk ahead of the section being reached. The hero
 * button calls it on hover, focus and touch: the tap that follows jumps the
 * reader to the bottom of a long page, and the form has to be there.
 */
export function preloadRaceWriteupPicksForm() {
  void loadPicksForm();
}

const RaceWriteupPicksForm = lazy(() =>
  loadPicksForm().then((module) => ({
    default: module.RaceWriteupPicksForm,
  })),
);

function copyForPhase(
  phase: RaceWriteupPhase,
  venueName: string,
  hasSprint: boolean,
) {
  // Deliberately says nothing about team-mate battles, even though the section
  // below carries them for a signed-in player. This copy is server-rendered and
  // the duels are not offered to a signed-out visitor, so naming them here
  // would promise a stranger something the page then withholds.
  if (phase === 'race-picks') {
    return {
      heading: 'Make your race picks',
      body: 'Qualifying picks are locked. You can change your race Top 5 until the race locks.',
    };
  }

  return {
    // The lock rule is not repeated here: the picker says it under its
    // save button, and this line said it a third time above the same form.
    heading: `Make your ${venueName} picks`,
    body: hasSprint
      ? 'Choose a Top 5 for all open sessions, or make a separate set for each.'
      : 'Choose your Top 5 for qualifying and the race.',
  };
}

/**
 * The page this section is embedded in.
 *
 * Both surfaces render the identical picker; they are distinguished only so
 * the conversion funnel can separate a reader who came for the write-up from
 * one who landed on the predictions hub.
 */
type RaceWriteupPicksSurface = 'writeup' | 'predictions_hub';

/**
 * Keeps the host route light while letting its primary action finish on the
 * same page. The section heading and fallback link are server-rendered; the
 * drag-and-drop picker, its auth code and its data reads start when the
 * browser goes idle on a live page, or when a reader gets within roughly one
 * viewport of the section on any other.
 */
export function DeferredRaceWriteupPicks({
  phase,
  raceId,
  round,
  season,
  raceSlug,
  surface = 'writeup',
  venueName,
  hasSprint = false,
  loadImmediately = false,
}: {
  phase: RaceWriteupPhase;
  raceId: Id<'races'>;
  round: number;
  season: number;
  raceSlug: string;
  surface?: RaceWriteupPicksSurface;
  venueName: string;
  hasSprint?: boolean;
  /** A picker near the hero should be ready without waiting for a scroll. */
  loadImmediately?: boolean;
}) {
  const sectionRef = useRef<HTMLElement>(null);
  const [shouldLoad, setShouldLoad] = useState(loadImmediately);
  useRegisterPicksAnchor();
  const copy = copyForPhase(phase, venueName, hasSprint);
  // SSR-resolved, so this matches on the server and does not reflow the
  // section once Clerk boots.
  const { isSignedIn } = useViewerSession();
  /*
   * One decision for a signed-out visitor: make five picks and sign in to keep
   * them. Three links out of that decision, set between the heading and the
   * form, are the only thing standing between a stranger and the picker, so
   * both surfaces now wait until there is no conversion left to lose.
   *
   * The write-ups used to keep them either way, on the grounds that they are
   * editorial pages search sends people to and that the line is where the
   * server-rendered HTML links to the round the piece is about. The second
   * half of that is still true and is why this is gated rather than deleted:
   * the `<noscript>` link below carries the race page into the same HTML, the
   * footer carries the leaderboard, and `check:orphans` proves both against
   * the real response. What is left is a reader who has scrolled past the
   * whole article to reach a form, being offered somewhere else to go.
   */
  const showNextLinks = isSignedIn;

  // The funnel's first step. The landing has had `landing_picker_viewed`
  // since August 2026; here nothing fired before the save, so a reader who
  // scrolled the article and left could not be told from one who never got
  // this far. Visibility, not the preload margin: the picker fetches 700px
  // early, and that would count a reader still in the article.
  const viewedRef = useRef(false);
  useEffect(() => {
    const section = sectionRef.current;
    if (!section || typeof IntersectionObserver === 'undefined') {
      return;
    }
    const observer = new IntersectionObserver((entries) => {
      if (viewedRef.current || !entries.some((entry) => entry.isIntersecting)) {
        return;
      }
      viewedRef.current = true;
      captureAnalyticsEvent('picker_viewed', {
        source: surface,
        race_id: raceId,
        race_slug: raceSlug,
        phase,
      });
      observer.disconnect();
    });
    observer.observe(section);
    return () => observer.disconnect();
  }, [phase, raceId, raceSlug, surface]);

  /*
   * A live page mounts the picker once the browser is idle, without waiting
   * for the scroll. The hero's one button is an anchor to this section, and
   * with the form loading on approach that tap landed on a spinner: the jump
   * is instant, the chunk and the two Convex reads are not. The route stays
   * light (the chunk is still lazy); what changes is when it is asked for.
   * Pages that no longer take picks keep waiting for the scroll, since
   * nothing on them sends a reader here in a hurry.
   */
  useEffect(() => {
    if (shouldLoad || !isRaceWriteupLive(phase)) {
      return;
    }
    function warm() {
      setShouldLoad(true);
    }
    if (typeof window.requestIdleCallback === 'function') {
      const handle = window.requestIdleCallback(warm, {
        timeout: IDLE_MOUNT_TIMEOUT_MS,
      });
      return () => window.cancelIdleCallback(handle);
    }
    const handle = window.setTimeout(warm, IDLE_MOUNT_TIMEOUT_MS);
    return () => window.clearTimeout(handle);
  }, [shouldLoad, phase]);

  useEffect(() => {
    if (shouldLoad) {
      return;
    }
    const section = sectionRef.current;
    if (!section || typeof IntersectionObserver === 'undefined') {
      // Old browsers still get the feature instead of a permanent placeholder.
      // oxlint-disable-next-line react/set-state-in-effect
      setShouldLoad(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setShouldLoad(true);
          observer.disconnect();
        }
      },
      { rootMargin: PRELOAD_MARGIN },
    );
    observer.observe(section);
    return () => observer.disconnect();
  }, [shouldLoad]);

  const fallback = (
    <InlineLoader label="Loading the prediction picker" className="min-h-96" />
  );

  return (
    <section
      ref={sectionRef}
      id={RACE_WRITEUP_PICKS_ANCHOR}
      tabIndex={-1}
      aria-labelledby="race-writeup-picks-heading"
      className="scroll-mt-20 rounded-sm bg-surface px-5 py-7 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent sm:px-7 sm:py-9"
    >
      <div className="max-w-2xl">
        <h2
          id="race-writeup-picks-heading"
          className="font-title text-2xl font-medium text-text"
        >
          {copy.heading}
        </h2>
        <p className="gpp-reading-copy mt-2 text-text-muted">{copy.body}</p>
        {showNextLinks ? (
          <RaceWriteupNextLinks
            placement={
              surface === 'writeup' ? 'picks_section' : 'hub_picks_section'
            }
            raceSlug={raceSlug}
            venueName={venueName}
          />
        ) : null}
      </div>

      <div className="mt-7">
        {shouldLoad ? (
          <ErrorBoundary
            fallback={
              <p className="py-8 text-sm text-text-muted">
                The picker could not load.{' '}
                <a
                  href={`/races/${raceSlug}`}
                  className="font-semibold text-text underline decoration-border-strong underline-offset-4 hover:text-accent"
                >
                  Make your picks on the race page
                </a>
                .
              </p>
            }
          >
            <Suspense fallback={fallback}>
              <RaceWriteupPicksForm
                analyticsSource={surface}
                phase={phase}
                raceId={raceId}
                round={round}
                season={season}
                hasSprint={hasSprint}
              />
            </Suspense>
          </ErrorBoundary>
        ) : (
          fallback
        )}
        <noscript>
          <p className="pb-2 text-sm text-text-muted">
            <a
              href={`/races/${raceSlug}`}
              className="font-semibold text-text underline decoration-border-strong underline-offset-4"
            >
              Make your picks on the race page
            </a>
            .
          </p>
        </noscript>
      </div>
    </section>
  );
}
