import { SignInButton, useAuth } from '@clerk/react';
import { api } from '@convex-generated/api';
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { useMutation, useQuery } from 'convex/react';
import { AlertCircle, ArrowLeft, Check, Loader2, LogIn } from 'lucide-react';
import { useState } from 'react';

import { toUserFacingMessage } from '@/lib/userFacingError';

import { Button } from '../../components/Button/Button';
import { PageHero } from '../../components/PageHero';
import { PageLoader } from '../../components/PageLoader';
import { canonicalMeta, defaultOgImage } from '../../lib/site';

export const Route = createFileRoute('/leagues/create')({
  component: CreateLeaguePage,
  head: () => {
    const title = 'Create League | Grand Prix Picks';
    const description =
      'Create a private or public league for the 2026 Grand Prix Picks season.';
    const canonical = canonicalMeta('/leagues/create');
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

function CreateLeaguePage() {
  const { isSignedIn, isLoaded } = useAuth();

  if (!isLoaded) {
    return <PageLoader />;
  }

  if (!isSignedIn) {
    return (
      <div className="min-h-full bg-page">
        <div className="mx-auto max-w-4xl px-4 py-6">
          <div className="rounded-xl border border-border bg-surface p-8 text-center">
            <LogIn className="mx-auto mb-4 h-16 w-16 text-text-muted" />
            <h1 className="mb-2 text-2xl font-bold text-text">
              Sign In Required
            </h1>
            <p className="mb-4 text-text-muted">Sign in to create a league.</p>
            <SignInButton mode="modal">
              <Button size="sm">Sign In</Button>
            </SignInButton>
          </div>
        </div>
      </div>
    );
  }

  return <CreateLeagueContent />;
}

function CreateLeagueContent() {
  const navigate = useNavigate();
  const createLeague = useMutation(api.leagues.createLeague);
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [visibility, setVisibility] = useState<'private' | 'public'>('private');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const season = 2026;

  const leagueUsage = useQuery(api.leagues.getMyLeagueUsage, {
    season,
  });
  const hasSeasonPassFor2026 = leagueUsage?.hasSeasonPass;
  const privateCreateLimit = leagueUsage?.limits.maxPrivateLeaguesCreated;
  const privateCreatedCount = leagueUsage?.usage.createdPrivate ?? 0;
  const privateCreateLimitReached =
    typeof privateCreateLimit === 'number' &&
    Number.isFinite(privateCreateLimit) &&
    privateCreatedCount >= privateCreateLimit;

  const slugAvailable = useQuery(
    api.leagues.isSlugAvailable,
    slug.length >= 3 ? { slug } : 'skip',
  );

  function autoSlug(value: string) {
    return value
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 30);
  }

  function handleNameChange(value: string) {
    setName(value);
    if (!slug || slug === autoSlug(name)) {
      setSlug(autoSlug(value));
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const result = await createLeague({
        name,
        slug,
        description: description || undefined,
        visibility,
        password: visibility === 'private' ? password || undefined : undefined,
      });
      setIsRedirecting(true);
      void navigate({
        to: '/leagues/$slug',
        params: { slug: result.slug },
      });
    } catch (err) {
      if (
        err instanceof Error &&
        err.message.includes(
          'maximum number of private leagues you can create',
        ) &&
        typeof privateCreateLimit === 'number' &&
        Number.isFinite(privateCreateLimit)
      ) {
        setError(
          `You are at ${privateCreatedCount}/${privateCreateLimit} private leagues for ${season}. Upgrade to create more.`,
        );
        return;
      }
      setError(
        err instanceof Error
          ? toUserFacingMessage(err)
          : 'Failed to create league',
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isRedirecting) {
    return (
      <div className="min-h-full bg-page">
        <div className="mx-auto max-w-3xl px-4 py-6">
          <div className="rounded-xl border border-border bg-surface p-8 text-center">
            <Loader2 className="mx-auto mb-3 h-8 w-8 animate-spin text-accent" />
            <h2 className="mb-1 text-lg font-semibold text-text">
              League created
            </h2>
            <p className="text-sm text-text-muted">
              Redirecting you to your new league...
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-page">
      <div className="mx-auto max-w-3xl px-4 py-6">
        <PageHero
          eyebrow="League Setup"
          title="Create League"
          subtitle="Set up a league for the 2026 season and invite friends."
        />

        <div className="reveal-up reveal-delay-1 mb-6 rounded-xl border border-border bg-surface p-4">
          {leagueUsage && !leagueUsage.hasSeasonPass ? (
            <div className="mb-3 rounded-lg border border-accent/30 bg-accent-muted/40 p-3">
              <p className="text-sm font-medium text-text">
                Private leagues used: {privateCreatedCount}/
                {leagueUsage.limits.maxPrivateLeaguesCreated}
              </p>
              <p className="mt-1 text-xs text-text-muted">
                Free accounts can create up to{' '}
                {leagueUsage.limits.maxPrivateLeaguesCreated} private leagues
                per season.
              </p>
              <p className="mt-1 text-xs text-accent">
                <Link to="/pricing" className="font-semibold hover:underline">
                  Upgrade to Season Pass
                </Link>{' '}
                for higher league limits and public league creation.
              </p>
            </div>
          ) : null}

          {privateCreateLimitReached && visibility === 'private' ? (
            <div className="mb-3 rounded-lg border border-warning/30 bg-warning-muted/40 p-3">
              <p className="text-sm text-text">
                You&apos;ve reached your private league limit for {season}.
              </p>
            </div>
          ) : null}

          <form onSubmit={(e) => void handleSubmit(e)} className="space-y-3">
            <div>
              <label
                htmlFor="league-name"
                className="mb-1 block text-sm font-medium text-text"
              >
                Name
              </label>
              <input
                id="league-name"
                type="text"
                value={name}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="My F1 League"
                maxLength={50}
                required
                autoCapitalize="words"
                autoComplete="off"
                className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-text placeholder:text-text-muted focus:border-accent focus:ring-1 focus:ring-accent focus:outline-none"
              />
            </div>
            <div>
              <label
                htmlFor="league-slug"
                className="mb-1 block text-sm font-medium text-text"
              >
                Slug (URL identifier)
              </label>
              <div className="flex items-center gap-2">
                <input
                  id="league-slug"
                  type="text"
                  value={slug}
                  onChange={(e) => setSlug(autoSlug(e.target.value))}
                  placeholder="my-f1-league"
                  maxLength={30}
                  required
                  autoCapitalize="off"
                  autoComplete="off"
                  aria-describedby="league-slug-help league-slug-status"
                  className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-text placeholder:text-text-muted focus:border-accent focus:ring-1 focus:ring-accent focus:outline-none"
                />
                {slug.length >= 3 && (
                  <span className="shrink-0">
                    {slugAvailable === undefined ? (
                      <Loader2 className="h-4 w-4 animate-spin text-text-muted" />
                    ) : slugAvailable ? (
                      <Check className="h-4 w-4 text-success" />
                    ) : (
                      <AlertCircle className="h-4 w-4 text-error" />
                    )}
                  </span>
                )}
              </div>
              <p id="league-slug-help" className="mt-1 text-xs text-text-muted">
                grandprixpicks.com/leagues/{slug || '...'}
              </p>
              <p className="mt-0.5 text-xs text-text-muted">
                Use 3-30 characters (lowercase letters, numbers, hyphens). Slug
                is stored in lowercase for the URL.
              </p>
              {slug.length > 0 && slug.length < 3 ? (
                <p
                  id="league-slug-status"
                  className="mt-0.5 text-xs text-error"
                >
                  Slug must be at least 3 characters.
                </p>
              ) : (
                <p
                  id="league-slug-status"
                  className="mt-0.5 text-xs text-text-muted"
                >
                  Minimum length: 3 characters.
                </p>
              )}
            </div>
            <div>
              <label
                htmlFor="league-description"
                className="mb-1 block text-sm font-medium text-text"
              >
                Description (optional)
              </label>
              <input
                id="league-description"
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="A league for F1 fans"
                maxLength={200}
                autoCapitalize="sentences"
                className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-text placeholder:text-text-muted focus:border-accent focus:ring-1 focus:ring-accent focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-text">
                Visibility
              </label>
              <div
                className="flex gap-1 rounded-lg border border-border bg-surface p-1"
                role="tablist"
                aria-label="League visibility"
              >
                <Button
                  type="button"
                  variant="tab"
                  size="tab"
                  active={visibility === 'private'}
                  onClick={() => setVisibility('private')}
                  className="h-8 max-h-8 min-h-8 flex-1"
                >
                  Private
                </Button>
                <Button
                  type="button"
                  variant="tab"
                  size="tab"
                  active={visibility === 'public'}
                  onClick={() => setVisibility('public')}
                  disabled={hasSeasonPassFor2026 === false}
                  className="h-8 max-h-8 min-h-8 flex-1"
                  tooltip={
                    hasSeasonPassFor2026 === false
                      ? 'Public league creation requires a 2026 Season Pass.'
                      : undefined
                  }
                >
                  Public
                </Button>
              </div>
              <p className="mt-1 text-xs text-text-muted">
                Private leagues are invite-only. Public leagues can appear in
                the league directory and on member profiles; they cannot have a
                password.
              </p>
              {hasSeasonPassFor2026 === false && (
                <p className="mt-1 text-xs text-accent">
                  Public league creation requires a 2026 Season Pass.{' '}
                  <Link to="/pricing" className="font-semibold hover:underline">
                    See pricing
                  </Link>
                  .
                </p>
              )}
            </div>
            {visibility === 'private' && (
              <div>
                <label
                  htmlFor="league-password"
                  className="mb-1 block text-sm font-medium text-text"
                >
                  Password (optional)
                </label>
                <input
                  id="league-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Leave empty for open league"
                  maxLength={50}
                  className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-text placeholder:text-text-muted focus:border-accent focus:ring-1 focus:ring-accent focus:outline-none"
                />
                <p className="mt-1 text-xs text-text-muted">
                  If set, users will need this password to join your league.
                </p>
              </div>
            )}

            {error && <p className="text-sm text-error">{error}</p>}

            <div className="flex gap-2">
              <Button
                type="submit"
                size="sm"
                loading={isSubmitting}
                disabled={
                  !name ||
                  !slug ||
                  slug.length < 3 ||
                  slugAvailable === false ||
                  (visibility === 'private' && privateCreateLimitReached)
                }
              >
                Create League
              </Button>
            </div>
          </form>
        </div>
        <Button asChild size="sm" variant="text" leftIcon={ArrowLeft}>
          <Link to="/leagues">Back to leagues</Link>
        </Button>
      </div>
    </div>
  );
}
