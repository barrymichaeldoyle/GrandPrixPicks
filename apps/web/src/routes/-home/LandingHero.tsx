import { Link } from '@tanstack/react-router';
import { ArrowRight } from 'lucide-react';
import type { ReactNode } from 'react';

import { Button, primaryButtonStyles } from '@/components/Button/Button';
import { captureAnalyticsEvent } from '@/lib/analytics';

const SUBLINE =
  'Pick the top 5 and call every teammate battle across the F1 weekend. Score points in qualifying, sprints and the race. Free to play.';

/**
 * Copy on the left, session clock on the right, picker immediately below.
 *
 * The clock is not a badge or a chip. It is the second-largest thing on the
 * page after the headline, because the deadline is the reason to act now rather
 * than bookmark the site.
 */
export function LandingHero({
  clock,
  cta,
}: {
  clock: ReactNode;
  cta: ReactNode;
}) {
  return (
    <section className="px-4 pt-10 pb-10 sm:pt-14 sm:pb-12">
      <div className="mx-auto grid w-full max-w-6xl gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:gap-14">
        <div>
          <h1 className="text-4xl leading-tight font-light tracking-display text-balance text-text sm:text-5xl">
            <span className="block">
              Everyone&apos;s a strategist on Sunday.
            </span>
            <span className="block">Prove it.</span>
          </h1>
          <p className="gpp-reading-copy-lg mt-5 max-w-[46ch] text-text-muted">
            {SUBLINE}
          </p>
          <div className="mt-7">{cta}</div>
        </div>

        {clock ? <div className="lg:justify-self-end">{clock}</div> : null}
      </div>
    </section>
  );
}

/** Scrolls to the embedded picker. Present on desktop too, since the picker sits below the fold on short viewports. */
export function ScrollToPicksCta({ targetId }: { targetId: string }) {
  return (
    <a
      href={`#${targetId}`}
      className={primaryButtonStyles('md')}
      onClick={() =>
        captureAnalyticsEvent('landing_hero_cta_clicked', {
          placement: 'hero',
        })
      }
    >
      Make your picks
      <ArrowRight size={20} aria-hidden="true" />
    </a>
  );
}

/**
 * Between seasons there is no session to lock and no picker to embed, so the
 * hero points at the calendar instead of a deadline that does not exist.
 */
export function BrowseRacesCta() {
  return (
    <Button asChild variant="primary" size="md" rightIcon={ArrowRight}>
      <Link to="/races">See the race calendar</Link>
    </Button>
  );
}
