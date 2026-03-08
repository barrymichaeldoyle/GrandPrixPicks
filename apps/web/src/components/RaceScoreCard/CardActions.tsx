import { SignInButton } from '@clerk/react';
import { Link } from '@tanstack/react-router';
import { Lock, LogIn } from 'lucide-react';

import { formatDate, formatTime } from '../../lib/date';
import { Button } from '../Button';
import type { CardDisplayState } from './state';
import type { WeekendCardData } from './types';

interface CardActionsProps {
  data: WeekendCardData;
  cardState: CardDisplayState;
  variant: 'full' | 'compact';
}

export function CardActions({ data, cardState, variant }: CardActionsProps) {
  const currentUrl =
    typeof window === 'undefined'
      ? undefined
      : `${window.location.pathname}${window.location.search}${window.location.hash}`;

  if (cardState === 'not_yet_open') {
    return (
      <div className="p-4">
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
      </div>
    );
  }

  if (cardState === 'open_no_picks_unauth' && variant === 'full') {
    return (
      <div className="rounded-lg border-2 border-dashed border-border py-8 text-center">
        <LogIn className="mx-auto mb-4 h-12 w-12 text-text-muted" />
        <p className="mb-4 text-text-muted">Sign in to make your prediction</p>
        <SignInButton
          mode="modal"
          fallbackRedirectUrl={currentUrl}
          signUpFallbackRedirectUrl={currentUrl}
        >
          <Button size="sm">Sign In</Button>
        </SignInButton>
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

  if (cardState === 'fully_locked') {
    if (variant === 'compact') {
      return null;
    }
    return (
      <div className="p-4">
        <h2 className="mb-2 text-xl font-semibold text-text">
          Predictions Locked
        </h2>
        <p className="text-sm text-text-muted">
          Predictions are closed. Results will be available after the race.
        </p>
      </div>
    );
  }

  if (cardState === 'hidden_upcoming') {
    return (
      <div className="flex items-center justify-center gap-1.5 border-t border-border/60 px-4 py-3">
        <Lock className="h-3.5 w-3.5 text-text-muted/50" />
        <span className="text-sm text-text-muted">
          Picks submitted — revealed when session locks
        </span>
      </div>
    );
  }

  return null;
}
