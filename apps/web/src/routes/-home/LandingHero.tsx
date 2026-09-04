import { Link } from '@tanstack/react-router';
import { ArrowRight } from 'lucide-react';
import type { ReactNode } from 'react';

import { Button, primaryButtonStyles } from '@/components/Button/Button';
import { captureAnalyticsEvent } from '@/lib/analytics';

/**
 * Copy on the left, session clock on the right, picker immediately below.
 *
 * On phones the deadline is a compact chip between the subtext and the CTA —
 * never above the headline. Stacking the full clock first made race data the
 * lead before a visitor knew what the site was; the hook has to land first.
 */
export function LandingHero({
  clock,
  clockCompact,
  cta,
}: {
  /** Full-size clock for the desktop second column. */
  clock: ReactNode;
  /**
   * Compact deadline chip at `sm`, between the subtext and the CTA on phones.
   * Exactly one of the two clocks is ever displayed, so only one reaches the
   * accessibility tree.
   */
  clockCompact: ReactNode;
  cta: ReactNode;
}) {
  return (
    // Padding is deliberately tight for a hero: the picker sits directly below
    // and a visitor on a 13" laptop has to see the first slots without
    // scrolling. Whitespace here is paid for in conversion.
    <section
      className="px-4 pt-8 pb-8 sm:pt-10 sm:pb-10"
      aria-labelledby="landing-hero-title"
    >
      {/* The deadline gets a deliberate second column instead of floating in
          the wide gap between the hook and the edge of the page. */}
      <div className="mx-auto grid w-full max-w-6xl gap-8 lg:grid-cols-[minmax(0,1.15fr)_minmax(20rem,0.85fr)] lg:items-center lg:gap-x-12 xl:gap-x-16">
        <div className="flex flex-col justify-center">
          <p className="gpp-label">F1 prediction game</p>
          {/*
           * The break is authored, not left to the browser. Balanced wrapping
           * of the whole sentence strands "Everyone's a" on its own line,
           * because balance minimises the longest line rather than reading the
           * phrase. Two lines of roughly equal weight, each a complete thought,
           * beat three ragged ones — and save ~50px above the fold.
           *
           * "Everyone's a strategist" is the constraint: it needs ~374px at
           * text-4xl, which a phone does not have. Rather than let the authored
           * break collapse back into three ragged lines, phones take the step
           * down to text-3xl, where both lines fit with room to spare — two
           * clean lines at 32px beat three broken ones at 40px, and the shorter
           * hero puts the picker that much closer to the fold.
           * `text-balance` stays as the safety net.
           */}
          <h1
            id="landing-hero-title"
            className="mt-4 max-w-2xl text-3xl leading-[1.08] font-light tracking-display text-balance text-text min-[430px]:text-4xl sm:text-5xl lg:text-[3.5rem]"
          >
            {/*
             * The space between the spans is load-bearing despite being
             * invisible: both are `block`, so it collapses on screen, but
             * without it the heading's text content is "strategiston Sunday"
             * — which is what a screen reader, a search snippet and the OG
             * scraper all read.
             */}
            <span className="block">Everyone&apos;s a strategist</span>{' '}
            <span className="block">
              on Sunday. <span className="text-accent">Prove it.</span>
            </span>
          </h1>
          <p className="gpp-reading-copy-lg mt-5 max-w-[48ch] text-text-muted">
            Pick your Top 5. Choose who finishes ahead in each team. Score
            points across qualifying, sprints and race day.
          </p>
          {/*
           * Mobile order: headline → subtext → deadline chip → CTA. The chip
           * is secondary context once the visitor knows what the site is; the
           * CTA is what they touch next with nothing in between except the
           * friction-killer under the button.
           */}
          {clockCompact ? (
            <div className="mt-5 lg:hidden">{clockCompact}</div>
          ) : null}
          <div className="mt-6">{cta}</div>
        </div>

        {/* The full clock is contextual, not the page's primary action. One
            timing rail anchors it without turning it into another card. */}
        {clock ? (
          <aside
            className="hidden border-l-2 border-accent py-5 pl-8 lg:block"
            aria-label="Next prediction deadline"
          >
            {clock}
          </aside>
        ) : null}
      </div>
    </section>
  );
}

/** Scrolls to the embedded picker. Present on desktop too, since the picker sits below the fold on short viewports. */
export function ScrollToPicksCta({ targetId }: { targetId: string }) {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
      <a
        href={`#${targetId}`}
        className={primaryButtonStyles('md')}
        // Suppresses the duplicate CTA in the app header while this page owns
        // the action (see `.gpp-public-header-cta` in styles.css). The header
        // button takes it back the moment this scrolls away.
        data-landing-hero-cta="true"
        onClick={() =>
          captureAnalyticsEvent('landing_hero_cta_clicked', {
            placement: 'hero',
          })
        }
      >
        Make your picks
        <ArrowRight size={20} aria-hidden="true" />
      </a>
      <p className="text-sm text-text-muted">
        Free to play. No account needed until you save.
      </p>
    </div>
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
