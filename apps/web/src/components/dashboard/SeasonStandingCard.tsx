import { api } from '@convex-generated/api';
import type { FunctionReturnType } from 'convex/server';
import { ArrowRight, Trophy } from 'lucide-react';
import { Link } from '@tanstack/react-router';

type SeasonLeaderboard = FunctionReturnType<
  typeof api.leaderboards.getCombinedSeasonLeaderboard
>;

export function SeasonStandingCard({
  leaderboard,
  hideWhenEmpty = false,
}: {
  leaderboard: SeasonLeaderboard | undefined;
  /**
   * Render nothing until the viewer has a rank, instead of the placeholder.
   *
   * For the mobile stack, where these cards are a vertical run below the picks
   * card rather than a column beside it. "Your rank appears after your first
   * scored session" is a fair thing to say in a rail that would otherwise be
   * empty, and a wasted screen on a phone. See `LatestResultCard`.
   */
  hideWhenEmpty?: boolean;
}) {
  if (leaderboard === undefined) {
    // Same reasoning as `LatestResultCard`: no skeleton for a card that may
    // never appear, so nothing below it moves.
    if (hideWhenEmpty) {
      return null;
    }

    return (
      <div className="rounded-lg border border-border bg-surface p-4">
        <SeasonStandingHeading />
        <div
          className="mt-3 h-10 animate-pulse rounded bg-surface-muted"
          aria-busy="true"
          aria-label="Loading your season standing"
        />
        <SeasonStandingLink />
      </div>
    );
  }

  const entry = leaderboard.viewerEntry;
  if (!entry && hideWhenEmpty) {
    return null;
  }

  return (
    <div className="rounded-lg border border-border bg-surface p-4">
      <SeasonStandingHeading />
      {entry ? (
        <>
          <div className="mt-4 flex items-end justify-between gap-3">
            <div>
              <p className="font-title text-3xl font-semibold text-accent">
                P{entry.rank}
              </p>
              <p className="mt-1 text-xs text-text-muted">
                of {leaderboard.totalCount} players
              </p>
            </div>
            <p className="gpp-mono text-sm font-medium text-text">
              {entry.points} pts
            </p>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-px overflow-hidden rounded-sm bg-border text-center">
            <div className="bg-surface-elevated px-2 py-2">
              <p className="gpp-mono text-sm text-text">{entry.top5Points}</p>
              <p className="text-[9px] tracking-label text-text-muted uppercase">
                Top 5
              </p>
            </div>
            <div className="bg-surface-elevated px-2 py-2">
              <p className="gpp-mono text-sm text-text">{entry.h2hPoints}</p>
              <p className="text-[9px] tracking-label text-text-muted uppercase">
                H2H
              </p>
            </div>
          </div>
        </>
      ) : (
        <p className="mt-3 text-sm text-text-muted">
          Your rank appears after your first scored session.
        </p>
      )}
      <SeasonStandingLink />
    </div>
  );
}

function SeasonStandingHeading() {
  return (
    <div className="flex items-center gap-2">
      <Trophy className="h-4 w-4 text-accent" aria-hidden />
      <h2 className="gpp-label text-text-muted">Season standing</h2>
    </div>
  );
}

function SeasonStandingLink() {
  return (
    <Link
      to="/leaderboard"
      // 17px of text is a fine mouse target and a poor thumb one. On coarse
      // pointers the row grows to the 44px touch target and the top margin
      // gives most of it back, so the card keeps its spacing.
      className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-accent hover:text-accent-hover pointer-coarse:mt-2 pointer-coarse:min-h-11"
    >
      View leaderboard
      <ArrowRight className="h-3 w-3" aria-hidden />
    </Link>
  );
}
