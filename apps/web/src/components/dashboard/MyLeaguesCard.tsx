import { api } from '@convex-generated/api';
import type { FunctionReturnType } from 'convex/server';
import { ArrowRight, Users } from 'lucide-react';
import { Link } from '@tanstack/react-router';
import { useQuery } from '@/integrations/convex/query';

import { railCardActionClass } from '@/components/dashboard/RailCardAction';

type MyLeagues = FunctionReturnType<typeof api.leagues.getMyLeagues>;

export function MyLeaguesCard({
  leagues: leaguesProp,
}: {
  /** Pass from a parent that already subscribed; otherwise self-fetches. */
  leagues?: MyLeagues | undefined;
}) {
  const leaguesQuery = useQuery(
    api.leagues.getMyLeagues,
    leaguesProp === undefined ? {} : 'skip',
  );
  const leagues = leaguesProp !== undefined ? leaguesProp : leaguesQuery;

  if (leagues === undefined) {
    return (
      <div className="rounded-lg border border-border bg-surface p-4">
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-accent" aria-hidden />
          <h2 className="gpp-label text-text-muted">Your leagues</h2>
        </div>
        <div aria-busy="true" aria-label="Loading your leagues">
          <div className="mt-3 h-10 animate-pulse rounded bg-surface-muted" />
          <div className="mt-4 h-9 animate-pulse rounded bg-surface-muted" />
        </div>
      </div>
    );
  }

  const visibleLeagues = leagues
    .filter((league): league is NonNullable<typeof league> => league != null)
    .slice(0, 3);

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-surface">
      <div className="p-4">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-accent" aria-hidden />
            <h2 className="gpp-label text-text-muted">Your leagues</h2>
          </div>
          {/* Only once there are leagues to see all of. In the empty state the
              foot of the card already points at the same page, and two links
              to /leagues in one small card is a choice that isn't one. */}
          {visibleLeagues.length > 0 ? (
            <Link
              to="/leagues"
              // Sits beside the card heading, so the touch target is grown with
              // a negative margin absorbing part of it: the row still gets
              // taller on a phone, but not by the full 27px.
              className="inline-flex items-center gap-1 text-xs font-semibold text-accent hover:text-accent-hover pointer-coarse:-my-2 pointer-coarse:min-h-11"
            >
              See all
            </Link>
          ) : null}
        </div>

        {visibleLeagues.length > 0 ? (
          <ul className="mt-3 divide-y divide-border">
            {visibleLeagues.map((league) => (
              <li key={league._id}>
                <Link
                  to="/leagues/$slug"
                  params={{ slug: league.slug }}
                  className="flex items-center justify-between gap-2 py-2.5 text-sm hover:text-accent"
                >
                  <span className="truncate font-medium text-text">
                    {league.name}
                  </span>
                  <span className="gpp-mono inline-flex shrink-0 items-center gap-1 text-xs text-text-muted">
                    <Users className="h-3 w-3" aria-hidden />
                    {league.memberCount}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-sm text-text-muted">
            Start a league for your group chat and use the same picks in every
            competition.
          </p>
        )}
      </div>

      {visibleLeagues.length === 0 ? (
        <Link to="/leagues" className={railCardActionClass}>
          Find or create a league
          <ArrowRight className="h-4 w-4 shrink-0" aria-hidden />
        </Link>
      ) : null}
    </div>
  );
}
