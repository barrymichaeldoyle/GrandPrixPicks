import { SignInButton, useAuth } from '@clerk/clerk-react';
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { useMutation, useQuery } from 'convex/react';
import {
  AlertCircle,
  Check,
  Crown,
  Globe,
  Loader2,
  LogIn,
  Plus,
  Shield,
  Users,
} from 'lucide-react';
import { useState } from 'react';

import { api } from '../../../convex/_generated/api';
import { Button } from '../../components/Button';
import { PageLoader } from '../../components/PageLoader';
import { canonicalMeta, ogBaseUrl } from '../../lib/site';

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
        { property: 'og:image', content: `${ogBaseUrl}/og/home.png` },
        { name: 'twitter:title', content: title },
        { name: 'twitter:description', content: description },
        { name: 'twitter:image', content: `${ogBaseUrl}/og/home.png` },
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

  if (!isSignedIn) {
    return (
      <div className="min-h-full bg-page">
        <div className="mx-auto max-w-4xl px-4 py-6">
          <div className="rounded-xl border border-border bg-surface p-8 text-center">
            <LogIn className="mx-auto mb-4 h-16 w-16 text-text-muted" />
            <h1 className="mb-2 text-2xl font-bold text-text">
              Sign In Required
            </h1>
            <p className="mb-4 text-text-muted">
              Sign in to create or join leagues.
            </p>
            <SignInButton mode="modal">
              <Button size="sm">Sign In</Button>
            </SignInButton>
          </div>
        </div>
      </div>
    );
  }

  return <LeaguesContent />;
}

function LeaguesContent() {
  const leagues = useQuery(api.leagues.getMyLeagues);
  const [showCreate, setShowCreate] = useState(false);

  if (leagues === undefined) {
    return <PageLoader />;
  }

  return (
    <div className="min-h-full bg-page">
      <div className="mx-auto max-w-4xl px-4 py-6">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-text">Leagues</h1>
            <p className="text-text-muted">
              Compete with friends in private leagues
            </p>
          </div>
          <Button size="sm" onClick={() => setShowCreate(!showCreate)}>
            <Plus className="h-4 w-4" />
            Create
          </Button>
        </div>

        {showCreate && (
          <CreateLeagueForm onClose={() => setShowCreate(false)} />
        )}

        {leagues.length === 0 ? (
          <div className="rounded-xl border border-border bg-surface p-8 text-center">
            <Shield className="mx-auto mb-4 h-16 w-16 text-text-muted" />
            <h2 className="mb-2 text-xl font-semibold text-text">
              No leagues yet
            </h2>
            <p className="text-text-muted">
              Create a league to get started, or ask a friend for their league
              link to join.
            </p>
          </div>
        ) : (
          <div className="grid gap-3">
            {leagues
              .filter(
                (league): league is NonNullable<typeof league> =>
                  league != null,
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
                        <Crown className="h-4 w-4 shrink-0 text-warning" />
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
      </div>
    </div>
  );
}

function CreateLeagueForm({ onClose }: { onClose: () => void }) {
  const navigate = useNavigate();
  const createLeague = useMutation(api.leagues.createLeague);
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [visibility, setVisibility] = useState<'private' | 'public'>('private');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const hasSeasonPassFor2026 = useQuery(api.users.hasSeasonPassForSeason, {
    season: 2026,
  });

  const slugAvailable = useQuery(
    api.leagues.isSlugAvailable,
    slug.length >= 3 ? { slug } : 'skip',
  );

  const autoSlug = (value: string) => {
    return value
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 30);
  };

  const handleNameChange = (value: string) => {
    setName(value);
    // Auto-generate slug from name if slug hasn't been manually edited
    if (!slug || slug === autoSlug(name)) {
      setSlug(autoSlug(value));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
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
      void navigate({
        to: '/leagues/$slug',
        params: { slug: result.slug },
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create league');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mb-6 rounded-xl border border-border bg-surface p-4">
      <h3 className="mb-3 text-lg font-semibold text-text">Create League</h3>
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
          <p className="mt-1 text-xs text-text-muted">
            grandprixpicks.com/leagues/{slug || '...'}
          </p>
          <p className="mt-0.5 text-xs text-text-muted">
            Slug is stored in lowercase for the URL.
          </p>
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
          <div className="flex gap-4">
            <label className="inline-flex cursor-pointer items-center gap-2">
              <input
                type="radio"
                name="visibility"
                checked={visibility === 'private'}
                onChange={() => setVisibility('private')}
                className="border-border text-accent focus:ring-accent"
              />
              <span className="text-sm text-text">Private</span>
            </label>
            <label className="inline-flex cursor-pointer items-center gap-2">
              <input
                type="radio"
                name="visibility"
                checked={visibility === 'public'}
                onChange={() => setVisibility('public')}
                disabled={hasSeasonPassFor2026 === false}
                className="border-border text-accent focus:ring-accent"
              />
              <span
                className={`text-sm ${
                  hasSeasonPassFor2026 === false
                    ? 'text-text-muted'
                    : 'text-text'
                }`}
              >
                Public
              </span>
            </label>
          </div>
          <p className="mt-1 text-xs text-text-muted">
            Private leagues are invite-only. Public leagues can appear in the
            league directory and on member profiles; they cannot have a
            password.
          </p>
          {hasSeasonPassFor2026 === false && (
            <p className="mt-1 text-xs text-accent">
              Public leagues will be available with a 2026 Season Pass soon.
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
              !name || !slug || slug.length < 3 || slugAvailable === false
            }
          >
            Create League
          </Button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-4 py-2 text-sm font-medium text-text-muted transition-colors hover:bg-surface-muted hover:text-text"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
