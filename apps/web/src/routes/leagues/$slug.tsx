import { api } from '@convex-generated/api';
import {
  createFileRoute,
  Link,
  notFound,
  Outlet,
  useRouterState,
} from '@tanstack/react-router';
import { useQuery } from 'convex/react';
import { ArrowLeft, LogIn, Shield } from 'lucide-react';

import { Button } from '@/components/Button/Button';
import { AppSignInButton } from '@/integrations/clerk/sign-in-button';
import { useViewerSession } from '@/integrations/clerk/useViewerSession';
import { PageLoader } from '@/components/PageLoader';
import { convexHttp as convex } from '@/integrations/convex/client';
import { withRetry } from '@/lib/retry';
import { pageMeta } from '@/lib/site';

import { LeagueDetailContent } from './$slug/-components/LeagueDetailContent';
import type {
  GameMode,
  LeagueView,
  TimeScope,
} from './$slug/-components/types';

export const Route = createFileRoute('/leagues/$slug')({
  component: LeagueDetailPage,
  validateSearch: (
    search: Record<string, unknown>,
  ): {
    time?: TimeScope;
    mode?: GameMode;
    raceId?: string;
    view?: LeagueView;
  } => {
    const time =
      search.time === 'weekend' || search.time === 'season'
        ? search.time
        : undefined;
    const mode =
      search.mode === 'combined' ||
      search.mode === 'top5' ||
      search.mode === 'h2h'
        ? search.mode
        : undefined;
    const raceId =
      typeof search.raceId === 'string' ? search.raceId : undefined;
    const view =
      search.view === 'feed' || search.view === 'standings'
        ? search.view
        : undefined;
    return { time, mode, raceId, view };
  },
  loader: async ({ params }) => {
    const league = await withRetry(() =>
      convex.query(api.leagues.getLeagueBySlug, {
        slug: params.slug,
      }),
    );
    if (!league) {
      throw notFound();
    }
    return { league };
  },
  head: ({ loaderData, params }) => {
    const league = loaderData?.league;
    const title = league
      ? `${league.name} | Grand Prix Picks`
      : 'League Standings & Predictions | Grand Prix Picks';
    const description = league
      ? league.description
        ? `${league.name}: ${league.description}`
        : `Compete with other members in ${league.name}. View standings and make your F1 predictions on Grand Prix Picks.`
      : 'View league standings, track member rankings, and compete with friends in this private F1 prediction league.';
    return pageMeta({
      title,
      description,
      path: `/leagues/${params.slug}`,
    });
  },
});

function LeagueDetailPage() {
  const isSettingsSubroute = useRouterState({
    select: (state) => state.location.pathname.endsWith('/settings'),
  });

  if (isSettingsSubroute) {
    return <Outlet />;
  }

  const { slug } = Route.useParams();
  const { isSignedIn, isLoaded } = useViewerSession();
  const league = useQuery(api.leagues.getLeagueBySlug, { slug });
  const currentLeagueUrl =
    typeof window === 'undefined'
      ? undefined
      : `${window.location.pathname}${window.location.search}${window.location.hash}`;

  if (!isLoaded || league === undefined) {
    return <PageLoader />;
  }

  if (league === null) {
    return (
      <div className="min-h-full bg-page">
        <div className="mx-auto max-w-4xl px-4 py-6">
          <div className="rounded-xl border border-border bg-surface p-8 text-center">
            <Shield className="mx-auto mb-4 h-16 w-16 text-text-muted" />
            <h1 className="mb-2 text-2xl font-bold text-text">
              League Not Found
            </h1>
            <p className="mb-4 text-text-muted">
              This league doesn't exist or may have been deleted.
            </p>
            <Button asChild size="sm" leftIcon={ArrowLeft}>
              <Link to="/leagues">Back to Leagues</Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Not signed in — show sign-in prompt with league info
  if (!isSignedIn) {
    return (
      <div className="min-h-full bg-page">
        <div className="mx-auto max-w-lg px-4 py-16">
          <div className="rounded-xl border border-border bg-surface p-8 text-center">
            <LogIn className="mx-auto mb-4 h-16 w-16 text-text-muted" />
            <h1 className="mb-2 text-2xl font-bold text-text">{league.name}</h1>
            <p className="mb-1 text-text-muted">
              {league.memberCount} member
              {league.memberCount !== 1 ? 's' : ''}
            </p>
            {league.description && (
              <p className="mb-4 text-sm text-text-muted">
                {league.description}
              </p>
            )}
            <p className="mb-4 text-text-muted">Sign in to join this league.</p>
            <AppSignInButton
              mode="modal"
              fallbackRedirectUrl={currentLeagueUrl}
              signUpFallbackRedirectUrl={currentLeagueUrl}
            >
              <Button size="sm">Sign In</Button>
            </AppSignInButton>
          </div>
        </div>
      </div>
    );
  }

  return <LeagueDetailContent league={league} />;
}
