import { api } from '@convex-generated/api';
import { createFileRoute, Link } from '@tanstack/react-router';
import { useQuery } from '@/integrations/convex/query';
import { Crown, Globe, LogIn, Plus, Search, Shield, Users } from 'lucide-react';
import { useEffect, useState } from 'react';

import { Button } from '@/components/Button/Button';
import { AppPageLayout, RailItem } from '@/components/AppPageLayout';
import { ProfileCard } from '@/components/dashboard/ProfileCard';
import { QuickLinksCard } from '@/components/dashboard/QuickLinksCard';
import { RailFooterLinks } from '@/components/dashboard/RailFooterLinks';
import { SuggestedFollowsCard } from '@/components/dashboard/SuggestedFollowsCard';
import { AppSignInButton } from '@/integrations/clerk/sign-in-button';
import { useViewerSession } from '@/integrations/clerk/useViewerSession';
import { CURRENT_SEASON, pageMeta } from '@/lib/site';
import { PageHeader } from '@/components/PageHeader';
import { Pill } from '@/components/Pill';
import { NoticeCard } from '@/components/NoticeCard';

export const Route = createFileRoute('/leagues/')({
  component: LeaguesPage,
  head: () =>
    pageMeta({
      title: 'F1 Prediction Leagues | Grand Prix Picks',
      description:
        'Create or join private leagues to compete with friends in F1 predictions. Track standings and see who has the best picks all season.',
      path: '/leagues',
    }),
});

function LeaguesPage() {
  const { isSignedIn, isLoaded } = useViewerSession();

  // `isSignedIn` is resolved during SSR, so a signed-out visitor (and every
  // crawler) gets the real page immediately. Gating the whole route on Clerk's
  // `isLoaded` used to serve them a "Loading leagues" skeleton, which is all
  // search engines ever saw of this page.
  if (!isLoaded && isSignedIn) {
    return <LeaguesPageSkeleton />;
  }

  return <LeaguesContent isSignedIn={isSignedIn} />;
}

/**
 * Static explainer for signed-out visitors. The rest of this page is personal
 * data that cannot render until Clerk and Convex resolve, so without this the
 * page has nothing durable for a first-time visitor or a crawler to read.
 */
function LeaguesExplainer() {
  const points = [
    {
      icon: Shield,
      title: 'Private leagues',
      body: 'Create a league, share the link, and only people with it can join. Ideal for a group of friends, a workplace, or a Discord server.',
    },
    {
      icon: Globe,
      title: 'Public leagues',
      body: 'Browse open leagues and join any of them to play against people outside your circle for the rest of the season.',
    },
    {
      icon: Users,
      title: 'League standings',
      body: 'Every league has its own leaderboard and activity feed, scored from the same Top 5 and Head-to-Head picks you already make.',
    },
    {
      icon: Crown,
      title: 'Season-long',
      body: 'Leagues run across the whole season, so a bad weekend costs you places rather than the title. Join at any point in the year.',
    },
  ] as const;

  return (
    <section aria-labelledby="leagues-explainer" className="mb-8">
      <h2
        id="leagues-explainer"
        className="font-title text-xl font-semibold text-text"
      >
        How F1 prediction leagues work
      </h2>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-text-muted">
        A league is a private scoreboard for the same picks you already make
        each race weekend. Your Top 5 and Head-to-Head predictions are scored
        once, then counted towards every league you belong to.
      </p>
      <dl className="mt-6 grid gap-5 sm:grid-cols-2">
        {points.map((point) => (
          <div key={point.title}>
            <dt className="flex items-center gap-2 font-semibold text-text">
              <point.icon className="h-4 w-4 text-accent" aria-hidden />
              {point.title}
            </dt>
            <dd className="mt-1 text-sm leading-6 text-text-muted">
              {point.body}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

function LeaguesContent({ isSignedIn }: { isSignedIn: boolean }) {
  const leagues = useQuery(api.leagues.getMyLeagues);
  // Rail only; skipped for signed-out viewers, who get no rails at all.
  const me = useQuery(api.users.me, isSignedIn ? {} : 'skip');
  // Derived so league limits and the public directory follow the season the
  // app is actually in.
  const season = useQuery(api.races.getCurrentSeasonNumber) ?? CURRENT_SEASON;
  const leagueUsage = useQuery(api.leagues.getMyLeagueUsage, {
    season,
  });
  const publicLeagues = useQuery(api.leagues.listPublicLeagues, {
    season,
    limit: 100,
  });
  const [discoverQuery, setDiscoverQuery] = useState('');

  const privateCreateLimit = leagueUsage?.limits.maxPrivateLeaguesCreated;
  const privateCreatedCount = leagueUsage?.usage.createdPrivate ?? 0;
  const publicJoinLimit = leagueUsage?.limits.maxPublicLeaguesJoined;
  const publicJoinedCount = leagueUsage?.usage.joinedPublic ?? 0;
  const privateCreateLimitReached =
    leagueUsage?.isPro === false &&
    typeof privateCreateLimit === 'number' &&
    Number.isFinite(privateCreateLimit) &&
    privateCreatedCount >= privateCreateLimit;
  const publicJoinLimitReached =
    leagueUsage?.isPro === false &&
    typeof publicJoinLimit === 'number' &&
    Number.isFinite(publicJoinLimit) &&
    publicJoinedCount >= publicJoinLimit;
  const filteredPublicLeagues = (() => {
    if (!publicLeagues) {
      return [];
    }
    const query = discoverQuery.trim().toLowerCase();
    if (!query) {
      return publicLeagues;
    }
    return publicLeagues.filter((league) => {
      const haystack =
        `${league.name} ${league.description ?? ''}`.toLowerCase();
      return haystack.includes(query);
    });
  })();
  const hasPublicLeagues =
    publicLeagues === undefined || publicLeagues.length > 0;
  const shouldShowDiscoverTab = isSignedIn && hasPublicLeagues;
  const [activeTab, setActiveTab] = useState<'my' | 'discover'>(
    isSignedIn ? 'my' : 'discover',
  );

  useEffect(() => {
    setActiveTab(isSignedIn ? 'my' : hasPublicLeagues ? 'discover' : 'my');
  }, [hasPublicLeagues, isSignedIn]);

  // Only the signed-in view needs this query. Waiting on it for everyone meant
  // signed-out visitors and crawlers only ever got the skeleton, since the
  // query never resolves for them.
  if (isSignedIn && leagues === undefined) {
    return <LeaguesPageSkeleton />;
  }
  const myLeagues = leagues ?? [];

  return (
    <AppPageLayout
      // Public route: signed-out visitors get the explainer and the public
      // league directory full width, with none of the signed-in furniture.
      // MyLeaguesCard is deliberately absent from the rails here — this page is
      // already the long form of that card.
      leftLabel={isSignedIn ? 'Profile and quick links' : undefined}
      left={
        isSignedIn ? (
          <>
            <RailItem hideOnMobile>
              <ProfileCard me={me} />
            </RailItem>
            <RailItem order={2}>
              <QuickLinksCard />
            </RailItem>
          </>
        ) : undefined
      }
      rightLabel={isSignedIn ? 'Suggested players' : undefined}
      right={
        isSignedIn ? (
          <>
            <RailItem order={1}>
              <SuggestedFollowsCard />
            </RailItem>
            <RailItem order={3}>
              <RailFooterLinks />
            </RailItem>
          </>
        ) : undefined
      }
    >
      <div>
        <div className="mb-7">
          <PageHeader
            eyebrow="Social play"
            title="Leagues"
            subtitle="Create, join, and compete with friends."
            actionsPlacement="trailing"
            className="mb-0"
            actions={
              <div>
                {isSignedIn ? (
                  privateCreateLimitReached ? (
                    <Button
                      size="sm"
                      leftIcon={Plus}
                      disabled
                      tooltip={`League creation limit reached (${privateCreatedCount}/${privateCreateLimit}).`}
                    >
                      Create
                    </Button>
                  ) : (
                    <Button asChild size="sm" leftIcon={Plus}>
                      <Link to="/leagues/create">Create</Link>
                    </Button>
                  )
                ) : null}
              </div>
            }
          />
        </div>

        {shouldShowDiscoverTab ? (
          <div
            className="reveal-up reveal-delay-1 mb-6 flex max-w-md gap-1 rounded-sm bg-surface-muted/55 p-1"
            role="group"
            aria-label="League view"
          >
            <Button
              type="button"
              variant="tab"
              size="tab"
              active={activeTab === 'my'}
              aria-pressed={activeTab === 'my'}
              onClick={() => setActiveTab('my')}
              className="h-8 max-h-8 min-h-8 flex-1"
            >
              My Leagues
            </Button>
            <Button
              type="button"
              variant="tab"
              size="tab"
              active={activeTab === 'discover'}
              aria-pressed={activeTab === 'discover'}
              onClick={() => setActiveTab('discover')}
              className="h-8 max-h-8 min-h-8 flex-1"
            >
              Discover
            </Button>
          </div>
        ) : !isSignedIn ? (
          <>
            <LeaguesExplainer />
            <div className="reveal-up reveal-delay-1 mb-8 rounded-xl border border-border bg-surface p-6 text-center">
              <Shield className="mx-auto mb-3 h-10 w-10 text-text-muted" />
              <h2 className="mb-1 text-lg font-semibold text-text">
                Sign in to manage your leagues
              </h2>
              <p className="text-sm text-text-muted">
                Sign in to create leagues and track your standings with other
                players.
              </p>
              <AppSignInButton mode="modal">
                <Button className="mt-4" leftIcon={LogIn} size="sm">
                  Sign In
                </Button>
              </AppSignInButton>
            </div>
          </>
        ) : null}

        {isSignedIn && activeTab === 'my' ? (
          <section>
            {myLeagues.length === 0 ? (
              <NoticeCard
                level="subsection"
                icon={Shield}
                title="No leagues yet"
                description="Create a league to get started, or ask a friend for their league link to join."
              />
            ) : (
              <div className="divide-y divide-border/50">
                {myLeagues
                  .filter(
                    (league): league is NonNullable<typeof league> =>
                      league != null,
                  )
                  .sort((a, b) =>
                    a.viewerRole === 'admin' && b.viewerRole !== 'admin'
                      ? -1
                      : a.viewerRole !== 'admin' && b.viewerRole === 'admin'
                        ? 1
                        : 0,
                  )
                  .map((league) => (
                    <Link
                      key={league._id}
                      to="/leagues/$slug"
                      params={{ slug: league.slug }}
                      className="flex items-center justify-between px-1 py-4 transition-colors hover:bg-surface-muted/35 sm:px-3"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="truncate font-semibold text-text">
                            {league.name}
                          </h3>
                          {league.viewerRole === 'admin' && (
                            <span className="inline-flex items-center gap-1 rounded-sm bg-warning/15 px-2 py-0.5 text-xs font-medium text-warning">
                              <Crown className="h-3 w-3" aria-hidden />
                              Admin
                            </span>
                          )}
                          {league.visibility === 'public' && (
                            <span className="inline-flex items-center gap-1 rounded-sm bg-accent/15 px-2 py-0.5 text-xs font-medium text-accent">
                              <Globe className="h-3 w-3" />
                              Public
                            </span>
                          )}
                        </div>
                        {league.description && (
                          <p className="mt-0.5 truncate text-sm text-text-muted">
                            {league.description}
                          </p>
                        )}
                      </div>
                      <div className="ml-4 flex items-center gap-1.5 text-sm text-text-muted">
                        <Users className="h-4 w-4" />
                        {league.memberCount}
                      </div>
                    </Link>
                  ))}
              </div>
            )}
          </section>
        ) : null}

        {hasPublicLeagues && (!isSignedIn || activeTab === 'discover') ? (
          <section className={isSignedIn ? '' : 'mt-2'}>
            <div className="mb-4">
              <h2 className="text-xl font-semibold text-text">
                Discover Public Leagues
              </h2>
              <p className="text-sm text-text-muted">
                Browse open leagues and join the communities you want to compete
                in.
              </p>
            </div>

            {!isSignedIn ? (
              <div className="mb-4 rounded-lg border border-border bg-surface p-3 text-sm text-text-muted">
                Sign in to join public leagues and track your joined-league
                limit.
              </div>
            ) : publicJoinLimitReached && leagueUsage ? (
              <div className="mb-4 flex flex-col gap-3 rounded-lg border border-warning/40 bg-warning/10 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-semibold text-text">
                    You&apos;ve used all five public league spots
                  </p>
                  <p className="mt-1 text-sm text-text-muted">
                    Unlock more spots to keep joining leagues this season.
                  </p>
                </div>
                <Button asChild size="sm" className="shrink-0">
                  <Link to="/pricing">Unlock more leagues</Link>
                </Button>
              </div>
            ) : null}

            <div className="relative mb-4">
              <Search
                className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-text-muted"
                aria-hidden
              />
              <input
                type="text"
                value={discoverQuery}
                onChange={(e) => setDiscoverQuery(e.target.value)}
                placeholder="Search public leagues..."
                className="w-full rounded-lg border border-border bg-surface py-2 pr-3 pl-9 text-base text-text placeholder:text-text-muted focus:border-accent focus:ring-1 focus:ring-accent focus:outline-none"
              />
            </div>

            {publicLeagues === undefined ? (
              <div className="rounded-xl border border-border bg-surface p-6 text-sm text-text-muted">
                Loading public leagues...
              </div>
            ) : filteredPublicLeagues.length === 0 ? (
              <div className="rounded-xl border border-border bg-surface p-6 text-sm text-text-muted">
                {discoverQuery.trim()
                  ? 'No public leagues match your search.'
                  : 'No public leagues available yet.'}
              </div>
            ) : (
              <div className="divide-y divide-border/50">
                {filteredPublicLeagues.map((league) => (
                  <div
                    key={league._id}
                    className="flex items-center justify-between px-1 py-4 sm:px-3"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="truncate font-semibold text-text">
                          {league.name}
                        </h3>
                        <span className="inline-flex items-center gap-1 rounded-full bg-accent/15 px-2 py-0.5 text-xs font-medium text-accent">
                          <Globe className="h-3 w-3" />
                          Public
                        </span>
                        {league.viewerRole === 'admin' ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-warning/15 px-2 py-0.5 text-xs font-medium text-warning">
                            <Crown className="h-3 w-3" aria-hidden />
                            Admin
                          </span>
                        ) : league.viewerRole === 'member' ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-success/15 px-2 py-0.5 text-xs font-medium text-success">
                            Member
                          </span>
                        ) : null}
                        {league.viewerRole ? (
                          <Pill>In your leagues</Pill>
                        ) : null}
                      </div>
                      {league.description ? (
                        <p className="mt-0.5 truncate text-sm text-text-muted">
                          {league.description}
                        </p>
                      ) : (
                        <p className="mt-0.5 text-sm text-text-muted">
                          No description yet.
                        </p>
                      )}
                    </div>
                    <div className="ml-4 flex items-center gap-2 text-sm text-text-muted">
                      <span className="inline-flex items-center gap-1.5">
                        <Users className="h-4 w-4" />
                        {league.memberCount}
                      </span>
                      <Button asChild variant="secondary" size="sm">
                        <Link
                          to="/leagues/$slug"
                          params={{ slug: league.slug }}
                        >
                          View
                        </Link>
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        ) : null}
      </div>
    </AppPageLayout>
  );
}

function LeaguesPageSkeleton() {
  return (
    <AppPageLayout>
      <div>
        <PageHeader
          eyebrow="Social play"
          title="Leagues"
          subtitle="Create, join, and compete with friends."
        />
        <div
          className="animate-pulse"
          role="status"
          aria-label="Loading leagues"
        >
          <span className="sr-only">Loading leagues</span>
          <div className="rounded-xl border border-border bg-surface p-6">
            <div className="mx-auto h-10 w-10 rounded-full bg-surface-muted" />
            <div className="mx-auto mt-5 h-6 w-64 max-w-full rounded bg-surface-muted" />
            <div className="mx-auto mt-3 h-4 w-96 max-w-full rounded bg-surface-muted/70" />
            <div className="mx-auto mt-5 h-9 w-24 rounded-lg bg-surface-muted" />
          </div>
          <div className="mt-8 h-7 w-64 rounded bg-surface-muted" />
          <div className="mt-3 h-12 rounded-xl border border-border bg-surface" />
          <div className="mt-3 h-20 rounded-xl border border-border bg-surface" />
        </div>
      </div>
    </AppPageLayout>
  );
}
