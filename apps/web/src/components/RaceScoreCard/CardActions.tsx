import { Link } from '@tanstack/react-router';
import { Ban, Lock, LogIn } from 'lucide-react';

import { useUserDateFormat } from '@/lib/useUserDateFormat';
import { SignInActionButton } from '@/integrations/clerk/SignInActionButton';
import type { CardDisplayState } from './state';
import type { WeekendCardData } from './types';

interface CardActionsProps {
  data: WeekendCardData;
  cardState: CardDisplayState;
  variant: 'full' | 'compact';
}

export function CardActions({ data, cardState, variant }: CardActionsProps) {
  const { formatDate, formatTime } = useUserDateFormat();

  if (cardState === 'cancelled') {
    return (
      <>
        <div className="mb-2 flex items-center gap-2">
          <Ban className="h-5 w-5 text-error" />
          <h2 className="text-xl font-semibold text-text">Race Called Off</h2>
        </div>
        <p className="text-sm text-text-muted">
          This race has been cancelled. No predictions or results will be
          recorded for this round.
        </p>
      </>
    );
  }

  if (cardState === 'not_yet_open') {
    return (
      <>
        <div className="mb-2 flex items-center gap-2">
          <Lock className="h-5 w-5 text-text-muted" />
          <h2 className="text-xl font-semibold text-text">Not Yet Open</h2>
        </div>
        <div className="text-sm text-text-muted">
          <p>
            Predictions for this race will open after the previous race is
            complete.
          </p>
          {data.predictionOpenAt != null && (
            <p className="mt-2">
              Predictions open{' '}
              <strong className="text-text" suppressHydrationWarning>
                {formatDate(data.predictionOpenAt)} at{' '}
                {formatTime(data.predictionOpenAt)}
              </strong>
            </p>
          )}
          {data.predictionOpenAt == null && (
            <p className="mt-2">Check back soon!</p>
          )}
        </div>
      </>
    );
  }

  if (cardState === 'open_no_picks_unauth' && variant === 'full') {
    return (
      <div className="rounded-lg border-2 border-dashed border-border px-4 py-8 text-center">
        <LogIn className="mx-auto mb-4 h-12 w-12 text-text-muted" />
        <p className="mb-1 font-semibold text-text">
          Sign in to make your prediction
        </p>
        <p className="mb-4 text-sm text-text-muted">
          Pick your Top 5 for each session and choose who finishes ahead in each
          team. It&apos;s free, and each session is worth up to 25 points.
        </p>
        <SignInActionButton size="sm">Sign In</SignInActionButton>
      </div>
    );
  }

  if (cardState === 'open_no_picks_auth' && variant === 'compact') {
    return (
      <div className="border-t border-border/60 px-4 py-3 text-center">
        <Link
          to="/races/$raceSlug"
          params={{ raceSlug: data.raceSlug }}
          className="text-sm font-medium text-accent hover:text-accent/80"
        >
          Make your prediction
        </Link>
      </div>
    );
  }

  if (cardState === 'hidden_upcoming') {
    return (
      <div className="flex items-center justify-center gap-1.5 border-t border-border/60 px-4 py-3">
        <Lock className="h-3.5 w-3.5 text-text-muted/50" />
        <span className="text-sm text-text-muted">
          Picks submitted. Revealed when the session locks.
        </span>
      </div>
    );
  }

  return null;
}
