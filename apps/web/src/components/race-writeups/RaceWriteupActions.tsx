import { Link } from '@tanstack/react-router';
import { ArrowRight } from 'lucide-react';

import {
  raceWriteupPrimaryAction,
  type RaceWriteupPhase,
} from '@/lib/raceWriteupPhase';

type RaceWriteupActionsProps = {
  circuitName?: string;
  circuitSlug?: string;
  compact?: boolean;
  phase: RaceWriteupPhase;
  raceSlug: string;
  venueName: string;
};

export function RaceWriteupActions({
  circuitName,
  circuitSlug,
  compact = false,
  phase,
  raceSlug,
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
      <Link
        to="/races/$raceSlug"
        params={{ raceSlug }}
        className="inline-flex min-h-11 items-center gap-2 rounded-sm bg-accent px-5 font-semibold text-text-on-accent hover:bg-accent-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      >
        {raceWriteupPrimaryAction(phase, venueName, compact)}
        <ArrowRight className="h-4 w-4" aria-hidden />
      </Link>
      {!compact && circuitName && circuitSlug ? (
        <Link
          to="/circuits/$circuitSlug"
          params={{ circuitSlug }}
          className="inline-flex min-h-11 items-center px-1 text-sm font-semibold text-text-muted underline decoration-border-strong underline-offset-4 hover:text-text"
        >
          Read the {circuitName} circuit guide
        </Link>
      ) : null}
    </div>
  );
}
