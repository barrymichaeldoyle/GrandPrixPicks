import { Link } from '@tanstack/react-router';
import { ArrowDown, ArrowRight } from 'lucide-react';
import type { ReactNode } from 'react';

import { captureAnalyticsEvent } from '@/lib/analytics';
import {
  raceWriteupPrimaryAction,
  type RaceWriteupPhase,
} from '@/lib/raceWriteupPhase';

import { RACE_WRITEUP_CIRCUIT_ANCHOR } from './RaceWriteupSection';
import { useInAppView } from '@/hooks/useInAppView';

type RaceWriteupActionsProps = {
  compact?: boolean;
  /** Overrides the analytics placement a compact action reports. */
  placement?: 'race_writeup_rail';
  /** The viewer already has picks in for this round, so the label invites a review. */
  hasPicks?: boolean;
  phase: RaceWriteupPhase;
  primaryActionTargetId?: string;
  raceSlug: string;
  nextRace?: { slug: string; name: string } | null;
  /**
   * The heading of this page's circuit section. Passed so the secondary link
   * only renders on a page that has the section it scrolls to. The link's
   * text is fixed ("About the circuit"): the heading itself was the link, and
   * a noun beside a verb button read as a label rather than something to do.
   */
  signalsHeading?: string;
  venueName: string;
  /**
   * A line about the primary action. It sits directly under the button on a
   * phone, where the secondary link wraps below it and would otherwise come
   * between the two, and under the whole row from `sm`.
   */
  note?: ReactNode;
};

/**
 * The hero's actions: make picks, and read the circuit.
 *
 * The second one used to leave for `/circuits/:slug`. That page is noindex and
 * canonicalises back here, and about 70% of its body text is already on this
 * page, so the link took a reader out of the write-up and into a subset of it
 * for no gain to them or to search. It scrolls to this page's own circuit
 * section instead.
 */
export function RaceWriteupActions({
  compact = false,
  placement,
  hasPicks = false,
  phase,
  primaryActionTargetId,
  raceSlug,
  nextRace,
  signalsHeading,
  venueName,
  note,
}: RaceWriteupActionsProps) {
  // Every primary action here leads to picking on the web; from the app the
  // reader picks in the app. The circuit link and the note stay.
  const inApp = useInAppView();
  // The only button above the fold on every write-up, and until this it was
  // invisible to analytics: nobody could tell whether a reader who never
  // reached the picker had tried the shortcut to it.
  function trackPrimaryAction(
    destination: 'picks_anchor' | 'race_page' | 'next_race_page',
  ) {
    captureAnalyticsEvent('public_page_cta_clicked', {
      destination,
      placement:
        placement ?? (compact ? 'race_writeup_closing' : 'race_writeup_hero'),
      phase,
      race_slug: raceSlug,
      ...(destination === 'next_race_page'
        ? { target_race_slug: nextRace?.slug }
        : {}),
    });
  }

  return (
    <div
      className={
        compact
          ? 'mt-5 shrink-0 sm:mt-0'
          : 'mt-7 flex flex-wrap items-center gap-3'
      }
    >
      {inApp ? null : phase === 'finished' && nextRace ? (
        <>
          <Link
            to="/races/$raceSlug"
            params={{ raceSlug: nextRace.slug }}
            onClick={() => trackPrimaryAction('next_race_page')}
            className="inline-flex min-h-11 items-center gap-2 rounded-sm bg-accent px-5 font-semibold text-text-on-accent hover:bg-accent-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            Make {nextRace.name.replace(/ Grand Prix$/, '')} picks
            <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
          <Link
            to="/races/$raceSlug"
            params={{ raceSlug }}
            onClick={() => trackPrimaryAction('race_page')}
            className="order-2 inline-flex min-h-11 items-center px-1 text-sm font-semibold text-text-muted underline decoration-border-strong underline-offset-4 hover:text-text sm:order-1"
          >
            See {venueName} results
          </Link>
        </>
      ) : primaryActionTargetId ? (
        <a
          href={`#${primaryActionTargetId}`}
          onClick={() => trackPrimaryAction('picks_anchor')}
          className="inline-flex min-h-11 items-center gap-2 rounded-sm bg-accent px-5 font-semibold text-text-on-accent hover:bg-accent-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          {raceWriteupPrimaryAction(phase, venueName, compact, hasPicks)}
          {/* The rail does not know whether the picker is above or below it. */}
          {placement === 'race_writeup_rail' ? (
            <ArrowRight className="h-4 w-4" aria-hidden />
          ) : (
            <ArrowDown className="h-4 w-4" aria-hidden />
          )}
        </a>
      ) : (
        <Link
          to="/races/$raceSlug"
          params={{ raceSlug }}
          onClick={() => trackPrimaryAction('race_page')}
          className="inline-flex min-h-11 items-center gap-2 rounded-sm bg-accent px-5 font-semibold text-text-on-accent hover:bg-accent-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          {raceWriteupPrimaryAction(phase, venueName, compact, hasPicks)}
          <ArrowRight className="h-4 w-4" aria-hidden />
        </Link>
      )}
      {!compact && note ? (
        <p className="order-1 -mt-1 basis-full text-sm leading-6 text-text-muted sm:order-2 sm:mt-0 sm:max-w-xl">
          {note}
        </p>
      ) : null}
      {!compact && signalsHeading ? (
        <a
          href={`#${RACE_WRITEUP_CIRCUIT_ANCHOR}`}
          className="order-2 inline-flex min-h-11 items-center px-1 text-sm font-semibold text-text-muted underline decoration-border-strong underline-offset-4 hover:text-text sm:order-1"
        >
          About the circuit
        </a>
      ) : null}
    </div>
  );
}
