import type { Id } from '@convex-generated/dataModel';
import { lazy, Suspense, useEffect, useRef, useState } from 'react';

import { ErrorBoundary } from '@/components/error/ErrorBoundary';
import { InlineLoader } from '@/components/InlineLoader';
import type { RaceWriteupPhase } from '@/lib/raceWriteupPhase';

export const RACE_WRITEUP_PICKS_ANCHOR = 'make-picks';

const PRELOAD_MARGIN = '700px';

const RaceWriteupPicksForm = lazy(() =>
  import('./RaceWriteupPicksForm').then((module) => ({
    default: module.RaceWriteupPicksForm,
  })),
);

function copyForPhase(phase: RaceWriteupPhase, venueName: string) {
  if (phase === 'race-picks') {
    return {
      heading: 'Make your race picks',
      body: 'Qualifying picks are locked. You can change your race Top 5 until the race locks.',
    };
  }

  return {
    heading: `Make your ${venueName} picks`,
    body: 'Choose your Top 5 for qualifying and the race. You can change each set until that session locks.',
  };
}

/**
 * Keeps the editorial route light while letting its primary action finish on
 * the same page. The section heading and fallback link are server-rendered;
 * the drag-and-drop picker, its auth code and its data reads start only when a
 * reader gets within roughly one viewport of the section.
 */
export function DeferredRaceWriteupPicks({
  phase,
  raceId,
  round,
  season,
  raceSlug,
  venueName,
}: {
  phase: RaceWriteupPhase;
  raceId: Id<'races'>;
  round: number;
  season: number;
  raceSlug: string;
  venueName: string;
}) {
  const sectionRef = useRef<HTMLElement>(null);
  const [shouldLoad, setShouldLoad] = useState(false);
  const copy = copyForPhase(phase, venueName);

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
                phase={phase}
                raceId={raceId}
                round={round}
                season={season}
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
