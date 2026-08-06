import { api } from '@convex-generated/api';
import {
  createFileRoute,
  Link,
  notFound,
  Outlet,
  useRouterState,
} from '@tanstack/react-router';
import { useQuery } from 'convex/react';
import { ArrowLeft, Shield } from 'lucide-react';

import { Button } from '@/components/Button/Button';
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
import { NoticeCard } from '@/components/NoticeCard';
import { SignInPrompt } from '@/components/SignInPrompt';

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
      // Member-scoped scoreboards: private by intent, and near-identical to
      // every other league page in the eyes of a crawler.
      noIndex: true,
    });
  },
});

function LeagueDetailPage() {
  const isSettingsSubroute = useRouterState({
    select: (state) => state.location.pathname.endsWith('/settings'),
  });

  const { slug } = Route.useParams();
  const { league: loadedLeague } = Route.useLoaderData();
  const { isSignedIn, isLoaded } = useViewerSession();
  const liveLeague = useQuery(api.leagues.getLeagueBySlug, { slug });

  // Every hook runs before this. It used to sit above the five below it, so a
  // client-side transition from the league to its own settings flipped the
  // condition inside one component instance and changed the hook count, which
  // is the "rendered fewer hooks than expected" crash.
  if (isSettingsSubroute) {
    return <Outlet />;
  }
  // The loader already resolved this league server-side, so an anonymous
  // visitor never waits on the subscription to say what they were invited to.
  // `??` would be wrong here: a deleted league comes back as `null`, and
  // falling back to loader data for that case would render a league that no
  // longer exists instead of the not-found state. Only `undefined` (still
  // loading) defers to the loader.
  const league = liveLeague === undefined ? loadedLeague : liveLeague;

  if (isSignedIn && (!isLoaded || liveLeague === undefined)) {
    return <PageLoader />;
  }

  if (league === null) {
    return (
      <div className="min-h-full bg-page">
        <div className="mx-auto max-w-4xl px-4 py-6">
          <NoticeCard
            level="page"
            icon={Shield}
            title="League Not Found"
            description="This league doesn't exist or may have been deleted."
            action={
              <Button asChild size="sm" leftIcon={ArrowLeft}>
                <Link to="/leagues">Back to Leagues</Link>
              </Button>
            }
          />
        </div>
      </div>
    );
  }

  // A league URL is an invite: it gets shared in a group chat and opened by
  // people without an account. So this leads with the league they were sent
  // to, from loader data so the name is in the SSR markup, rather than with a
  // generic wall. No fallbackRedirectUrl is needed to come back here, because
  // the sign-in modal never leaves the page.
  if (!isSignedIn) {
    return (
      <SignInPrompt
        eyebrow={
          league.visibility === 'public' ? 'Public league' : 'League invite'
        }
        title={league.name}
        meta={`${league.memberCount} ${
          league.memberCount === 1 ? 'member' : 'members'
        } · ${league.season} season${league.hasPassword ? ' · Password required' : ''}`}
        description={
          league.description ??
          'Same picks, scored against a table of just this league.'
        }
        actionLabel="Sign in to join"
        behind={[
          `The ${league.name} table, updated every session`,
          'Your Top 5 and head-to-head picks scored against its members',
          "The league's own activity feed",
          'Your position in it across the whole season',
        ]}
      />
    );
  }

  return <LeagueDetailContent league={league} />;
}
