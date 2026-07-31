import { Link } from '@tanstack/react-router';
import { ArrowRight } from 'lucide-react';
import type { ReactNode } from 'react';

import { Button, primaryButtonStyles } from '@/components/Button/Button';
import { captureAnalyticsEvent } from '@/lib/analytics';

const SUBLINE =
  'Pick the top 5 and call every teammate battle across the F1 weekend. Score points in qualifying, sprints and the race. Free\u00a0to\u00a0play.';

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
    <section className="px-4 pt-8 pb-8 sm:pt-10 sm:pb-9">
      {/*
       * The columns are sized to their content and packed to the left, not
       * split into two halves of the rail. Two `fr` columns gave each block
       * ~550px to hold ~460px and ~300px of content, so the leftover landed
       * between them: a 390px hole with the copy on one wall and the clock on
       * the other, which is what made the right side read as unearned space
       * rather than a second column.
       *
       * Packed, the leftover moves to the outside edge, where empty margin is
       * just margin. The rail itself stays `max-w-6xl` because the picker
       * directly below shares it, and a hero on a narrower rail than the card
       * it introduces looks like a mistake.
       */}
      <div className="mx-auto grid w-full max-w-6xl gap-8 lg:grid-cols-[auto_auto] lg:items-center lg:justify-start lg:gap-x-20 xl:gap-x-28">
        <div>
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
          <h1 className="text-3xl leading-tight font-light tracking-display text-balance text-text min-[430px]:text-4xl sm:text-5xl">
            {/*
             * The space between the spans is load-bearing despite being
             * invisible: both are `block`, so it collapses on screen, but
             * without it the heading's text content is "strategiston Sunday"
             * — which is what a screen reader, a search snippet and the OG
             * scraper all read.
             */}
            <span className="block">Everyone&apos;s a strategist</span>{' '}
            <span className="block">on Sunday. Prove it.</span>
          </h1>
          <p className="gpp-reading-copy-lg mt-4 max-w-[46ch] text-text-muted">
            {SUBLINE}
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

        {/*
         * Set left, like the copy it now sits beside. The previous right
         * alignment existed to make a block pinned to the far edge look
         * deliberate rather than adrift; with the columns packed there is no
         * far edge to answer to, and two blocks sharing a baseline grid read as
         * one composition only if they share a reading direction.
         */}
        {clock ? <div className="hidden lg:block">{clock}</div> : null}
      </div>
    </section>
  );
}

/** Scrolls to the embedded picker. Present on desktop too, since the picker sits below the fold on short viewports. */
export function ScrollToPicksCta({ targetId }: { targetId: string }) {
  return (
    <div>
      <a
        href={`#${targetId}`}
        className={primaryButtonStyles('md')}
        // Suppresses the duplicate CTA in the app header while this page owns the
        // action (see `.gpp-public-header-cta` in styles.css). The sticky strip
        // takes the action over the moment this scrolls away.
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
      <p className="mt-2 text-sm text-text-muted">
        No account needed until you save.
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
