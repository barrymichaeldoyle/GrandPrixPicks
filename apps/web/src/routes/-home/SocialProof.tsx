import { Link } from '@tanstack/react-router';
import { ArrowRight } from 'lucide-react';

export function SocialProof({
  playerCount,
  raceSlug,
}: {
  playerCount: number;
  raceSlug: string | null;
}) {
  return (
    <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
      <p className="text-sm text-text-muted">
        <span className="font-semibold text-text">
          {playerCount.toLocaleString()}{' '}
          {playerCount === 1 ? 'player' : 'players'}
        </span>{' '}
        made picks last race. Think you can beat them?
      </p>
      {raceSlug && (
        <Link
          to="/races/$raceSlug"
          params={{ raceSlug }}
          search={{ from: 'home' }}
          className="inline-flex shrink-0 items-center gap-1 text-sm font-medium text-accent hover:text-accent-hover"
        >
          Make your picks
          <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
        </Link>
      )}
    </div>
  );
}
