import { Link } from '@tanstack/react-router';
import { ArrowDown, ArrowRight } from 'lucide-react';

import {
  raceWriteupPrimaryAction,
  type RaceWriteupPhase,
} from '@/lib/raceWriteupPhase';

import { RACE_SIGNALS_ANCHOR } from './RaceSignalsSection';

type RaceWriteupActionsProps = {
  compact?: boolean;
  /** The viewer already has picks in for this round, so the label invites a review. */
  hasPicks?: boolean;
  phase: RaceWriteupPhase;
  primaryActionTargetId?: string;
  raceSlug: string;
  /**
   * The heading of this page's `RaceSignalsSection`, used verbatim as the
   * secondary link's text. Passing it rather than composing a label here is
   * what keeps the link and its destination from drifting apart: each write-up
   * declares the heading once and hands the same string to both.
   */
  signalsHeading?: string;
  venueName: string;
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
  hasPicks = false,
  phase,
  primaryActionTargetId,
  raceSlug,
  signalsHeading,
  venueName,
}: RaceWriteupActionsProps) {
  return (
    <div
      className={
        compact
          ? 'mt-5 shrink-0 sm:mt-0'
          : 'mt-7 flex flex-wrap items-center gap-3'
      }
    >
      {primaryActionTargetId ? (
        <a
          href={`#${primaryActionTargetId}`}
          className="inline-flex min-h-11 items-center gap-2 rounded-sm bg-accent px-5 font-semibold text-text-on-accent hover:bg-accent-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          {raceWriteupPrimaryAction(phase, venueName, compact, hasPicks)}
          <ArrowDown className="h-4 w-4" aria-hidden />
        </a>
      ) : (
        <Link
          to="/races/$raceSlug"
          params={{ raceSlug }}
          className="inline-flex min-h-11 items-center gap-2 rounded-sm bg-accent px-5 font-semibold text-text-on-accent hover:bg-accent-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          {raceWriteupPrimaryAction(phase, venueName, compact, hasPicks)}
          <ArrowRight className="h-4 w-4" aria-hidden />
        </Link>
      )}
      {!compact && signalsHeading ? (
        <a
          href={`#${RACE_SIGNALS_ANCHOR}`}
          className="inline-flex min-h-11 items-center px-1 text-sm font-semibold text-text-muted underline decoration-border-strong underline-offset-4 hover:text-text"
        >
          {signalsHeading}
        </a>
      ) : null}
    </div>
  );
}
