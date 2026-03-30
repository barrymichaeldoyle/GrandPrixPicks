import { SignInButton, useAuth } from '@clerk/react';
import { api } from '@convex-generated/api';
import { createFileRoute, Link } from '@tanstack/react-router';
import { useQuery } from 'convex/react';
import { Crown, Globe, LogIn, Plus, Search, Shield, Users } from 'lucide-react';
import { useEffect, useState } from 'react';

import { Button } from '../../components/Button/Button';
import { PageHero } from '../../components/PageHero';
import { PageLoader } from '../../components/PageLoader';
import { canonicalMeta, defaultOgImage } from '../../lib/site';

export const Route = createFileRoute('/leagues/')({
  component: LeaguesPage,
  head: () => {
    const title =
      'F1 Prediction Leagues - Compete with Friends | Grand Prix Picks';
    const description =
      'Create or join private leagues to compete with friends in F1 predictions. Track standings and see who has the best picks all season.';
    const canonical = canonicalMeta('/leagues');
    return {
      meta: [
        { title },
        { name: 'description', content: description },
        { property: 'og:title', content: title },
        { property: 'og:description', content: description },
        { property: 'og:image', content: defaultOgImage },
        { name: 'twitter:title', content: title },
        { name: 'twitter:description', content: description },
        { name: 'twitter:image', content: defaultOgImage },
        ...canonical.meta,
      ],
      links: [...canonical.links],
    };
  },
});

function LeaguesPage() {
  const { isSignedIn, isLoaded } = useAuth();

  if (!isLoaded) {
    return <PageLoader />;
  }

  return <LeaguesContent isSignedIn={isSignedIn} />;
}

function LeaguesContent({ isSignedIn }: { isSignedIn: boolean }) {
  const leagues = useQuery(api.leagues.getMyLeagues);
  const season = 2026;
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
    leagueUsage?.hasSeasonPass === false &&
    typeof privateCreateLimit === 'number' &&
    Number.isFinite(privateCreateLimit) &&
    privateCreatedCount >= privateCreateLimit;
  const publicJoinLimitReached =
    leagueUsage?.hasSeasonPass === false &&
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
  const [activeTab, setActiveTab] = useState<'my' | 'discover'>(
    isSignedIn ? 'my' : 'discover',
  );

  useEffect(() => {
    setActiveTab(isSignedIn ? 'my' : 'discover');
  }, [isSignedIn]);

  if (leagues === undefined) {
    return <PageLoader />;
  }

  return (
    <div className="min-h-full bg-page">
      <div className="mx-auto max-w-4xl px-4 py-6">
        <PageHero
          eyebrow="Social Play"
          title="Leagues"
          subtitle="Create, join, and discover leagues"
          icon={<Users className="h-8 w-8 text-accent" aria-hidden />}
          rightSlot={
            !isSignedIn ? (
              <SignInButton mode="modal">
                <Button leftIcon={LogIn} size="sm">
                  Sign In to Create
                </Button>
              </SignInButton>
            ) : privateCreateLimitReached ? (
              <Button
                size="sm"
                leftIcon={Plus}
                disabled
                tooltip={`Free limit reached (${privateCreatedCount}/${privateCreateLimit}). Upgrade on pricing to create more.`}
              >
                Create
              </Button>
            ) : (
              <Button asChild size="sm" leftIcon={Plus}>
                <Link to="/leagues/create">Create</Link>
              </Button>
            )
          }
        />
        {isSignedIn && leagueUsage && !leagueUsage.hasSeasonPass ? (
          <div className="reveal-up reveal-delay-1 mb-6 flex flex-wrap gap-2 text-xs">
            <span className="inline-flex items-center rounded-full border border-border bg-surface px-2.5 py-1 text-text-muted">
              Private creates: {privateCreatedCount}/
              {leagueUsage.limits.maxPrivateLeaguesCreated}
            </span>
            <span className="inline-flex items-center rounded-full border border-border bg-surface px-2.5 py-1 text-text-muted">
              Public joins: {publicJoinedCount}/
              {leagueUsage.limits.maxPublicLeaguesJoined}
            </span>
            <Link
              to="/pricing"
              className="inline-flex items-center rounded-full border border-accent/35 bg-accent-muted/45 px-2.5 py-1 font-semibold text-accent transition-colors hover:border-accent/50 hover:bg-accent-muted/70"
            >
              Upgrade to Season Pass for unlimited
            </Link>
          </div>
        ) : null}

        {isSignedIn ? (
          <div className="reveal-up reveal-delay-1 mb-6 flex gap-1 rounded-lg border border-border bg-surface p-1">
            <Button
              type="button"
              variant="tab"
              size="tab"
              active={activeTab === 'my'}
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
              onClick={() => setActiveTab('discover')}
              className="h-8 max-h-8 min-h-8 flex-1"
            >
              Discover
            </Button>
          </div>
        ) : (
          <div className="reveal-up reveal-delay-1 mb-8 rounded-xl border border-border bg-surface p-6 text-center">
            <Shield className="mx-auto mb-3 h-10 w-10 text-text-muted" />
            <h2 className="mb-1 text-lg font-semibold text-text">
              Sign in to manage your leagues
            </h2>
            <p className="text-sm text-text-muted">
              You can still browse public leagues below.
            </p>
          </div>
        )}

        {isSignedIn && activeTab === 'my' ? (
          <section>
            {leagues.length === 0 ? (
              <div className="rounded-xl border border-border bg-surface p-8 text-center">
                <Shield className="mx-auto mb-4 h-16 w-16 text-text-muted" />
                <h3 className="mb-2 text-xl font-semibold text-text">
                  No leagues yet
                </h3>
                <p className="text-text-muted">
                  Create a league to get started, or ask a friend for their
                  league link to join.
                </p>
              </div>
            ) : (
              <div className="grid gap-3">
                {leagues
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
                      className="flex items-center justify-between rounded-xl border border-border bg-surface p-4 transition-colors hover:bg-surface-muted"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="truncate font-semibold text-text">
                            {league.name}
                          </h3>
                          {league.viewerRole === 'admin' && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-warning/15 px-2 py-0.5 text-xs font-medium text-warning">
                              <Crown className="h-3 w-3" aria-hidden />
                              Admin
                            </span>
                          )}
                          {league.visibility === 'public' && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-accent/15 px-2 py-0.5 text-xs font-medium text-accent">
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

        {!isSignedIn || activeTab === 'discover' ? (
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
            ) : leagueUsage && !leagueUsage.hasSeasonPass ? (
              <div
                className={`mb-4 rounded-lg border p-3 text-sm ${
                  publicJoinLimitReached
                    ? 'border-warning/40 bg-warning/10'
                    : 'border-border bg-surface'
                }`}
              >
                <p className="text-text">
                  Public leagues joined: {publicJoinedCount}/
                  {leagueUsage.limits.maxPublicLeaguesJoined} on free plan.
                </p>
                <p className="mt-1 text-xs text-text-muted">
                  {publicJoinLimitReached ? (
                    <>
                      You&apos;ve reached your free public-join limit for{' '}
                      {season}.{' '}
                      <Link
                        to="/pricing"
                        className="text-accent hover:underline"
                      >
                        Upgrade to Season Pass
                      </Link>{' '}
                      for unlimited public joins.
                    </>
                  ) : (
                    <>
                      Upgrade to{' '}
                      <Link
                        to="/pricing"
                        className="text-accent hover:underline"
                      >
                        Season Pass
                      </Link>{' '}
                      for unlimited public joins.
                    </>
                  )}
                </p>
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
                className="w-full rounded-lg border border-border bg-surface py-2 pr-3 pl-9 text-sm text-text placeholder:text-text-muted focus:border-accent focus:ring-1 focus:ring-accent focus:outline-none"
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
              <div className="grid gap-3">
                {filteredPublicLeagues.map((league) => (
                  <div
                    key={league._id}
                    className="flex items-center justify-between rounded-xl border border-border bg-surface p-4"
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
                          <span className="inline-flex items-center rounded-full border border-border bg-surface-muted px-2 py-0.5 text-xs font-medium text-text-muted">
                            In your leagues
                          </span>
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
    </div>
  );
}
