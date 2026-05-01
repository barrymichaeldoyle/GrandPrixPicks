import { SignInButton, useAuth } from '@clerk/react';
import { api } from '@convex-generated/api';
import type { Id } from '@convex-generated/dataModel';
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { ConvexHttpClient } from 'convex/browser';
import { useMutation, useQuery } from 'convex/react';
import {
  ArrowLeft,
  Check,
  Globe,
  Loader2,
  Lock,
  LogIn,
  LogOut,
  Pencil,
  Settings,
  Shield,
  Trash2,
  X,
} from 'lucide-react';
import { useState } from 'react';

import { toUserFacingMessage } from '@/lib/userFacingError';

import { Button } from '../../../components/Button/Button';
import { PageLoader } from '../../../components/PageLoader';
import { canonicalMeta, defaultOgImage } from '../../../lib/site';

const convex = new ConvexHttpClient(import.meta.env.VITE_CONVEX_URL);

export const Route = createFileRoute('/leagues/$slug/settings')({
  component: LeagueSettingsPage,
  loader: async ({ params }) => {
    const league = await convex.query(api.leagues.getLeagueBySlug, {
      slug: params.slug,
    });
    return { league };
  },
  head: ({ loaderData, params }) => {
    const league = loaderData?.league;
    const title = league
      ? `${league.name} Settings | Grand Prix Picks`
      : 'League Settings | Grand Prix Picks';
    const description = league
      ? `Manage settings for ${league.name}.`
      : 'Manage league settings.';
    const canonical = canonicalMeta(`/leagues/${params.slug}/settings`);
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

type League = NonNullable<
  ReturnType<typeof useQuery<typeof api.leagues.getLeagueBySlug>>
>;

function LeagueSettingsPage() {
  const { slug } = Route.useParams();
  const { isSignedIn, isLoaded } = useAuth();
  const league = useQuery(api.leagues.getLeagueBySlug, { slug });

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

  if (!isSignedIn) {
    return (
      <div className="min-h-full bg-page">
        <div className="mx-auto max-w-lg px-4 py-16">
          <div className="rounded-xl border border-border bg-surface p-8 text-center">
            <LogIn className="mx-auto mb-4 h-16 w-16 text-text-muted" />
            <h1 className="mb-2 text-2xl font-bold text-text">
              Sign In Required
            </h1>
            <p className="mb-4 text-text-muted">
              Sign in to manage league settings.
            </p>
            <SignInButton mode="modal">
              <Button size="sm">Sign In</Button>
            </SignInButton>
          </div>
        </div>
      </div>
    );
  }

  const isAdmin = league.viewerRole === 'admin';
  const isMember = league.viewerRole !== null;

  if (!isMember) {
    return (
      <div className="min-h-full bg-page">
        <div className="mx-auto max-w-3xl px-4 py-6">
          <div className="rounded-xl border border-border bg-surface p-8 text-center">
            <Settings className="mx-auto mb-3 h-10 w-10 text-text-muted" />
            <h1 className="mb-2 text-xl font-semibold text-text">
              Join this league to access settings
            </h1>
            <p className="mb-4 text-text-muted">
              Settings are only available to league members.
            </p>
            <Button asChild size="sm" leftIcon={ArrowLeft}>
              <Link to="/leagues/$slug" params={{ slug: league.slug }}>
                Back to League
              </Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return <LeagueSettingsContent league={league} isAdmin={isAdmin} />;
}

function LeagueSettingsContent({
  league,
  isAdmin,
}: {
  league: League;
  isAdmin: boolean;
}) {
  return (
    <div className="min-h-full bg-page">
      <div className="mx-auto max-w-3xl px-4 py-6">
        <Button
          asChild
          size="sm"
          leftIcon={ArrowLeft}
          className="mb-2"
          variant="text"
        >
          <Link to="/leagues/$slug" params={{ slug: league.slug }}>
            Back to league
          </Link>
        </Button>

        <h1 className="mb-1 text-3xl font-bold text-text">League Settings</h1>
        <p className="mb-6 text-text-muted">{league.name}</p>

        <div className="space-y-4">
          {isAdmin && <AdminGeneralSettings league={league} />}
          <DangerZone leagueId={league._id} league={league} isAdmin={isAdmin} />
        </div>
      </div>
    </div>
  );
}

function AdminGeneralSettings({ league }: { league: League }) {
  const updateLeague = useMutation(api.leagues.updateLeague);
  const setPasswordMutation = useMutation(api.leagues.setPassword);
  const removePasswordMutation = useMutation(api.leagues.removePassword);
  const [showEdit, setShowEdit] = useState(false);
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);
  const isPublic = league.visibility === 'public';

  async function handleSetPassword() {
    if (!newPassword.trim()) {
      return;
    }
    setPasswordLoading(true);
    try {
      await setPasswordMutation({
        leagueId: league._id,
        password: newPassword,
      });
      setNewPassword('');
      setShowPasswordForm(false);
    } finally {
      setPasswordLoading(false);
    }
  }

  async function handleRemovePassword() {
    setPasswordLoading(true);
    try {
      await removePasswordMutation({ leagueId: league._id });
    } finally {
      setPasswordLoading(false);
    }
  }

  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <h3 className="mb-3 text-sm font-semibold tracking-wide text-text-muted uppercase">
        General
      </h3>
      <div className="space-y-3">
        <div>
          <p className="mb-1 text-sm font-medium text-text">Visibility</p>
          <div className="rounded-xl border border-border bg-surface-muted px-4 py-3 text-sm text-text">
            <div className="flex items-center gap-2">
              {league.visibility === 'public' ? (
                <>
                  <Globe className="h-4 w-4 shrink-0 text-accent" />
                  <span className="font-medium">Public</span>
                </>
              ) : (
                <>
                  <Lock className="h-4 w-4 shrink-0 text-accent" />
                  <span className="font-medium">Private</span>
                </>
              )}
            </div>
            <p className="mt-1 text-xs text-text-muted">
              Visibility is chosen when the league is created and cannot be
              changed later.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            onClick={() => setShowEdit(!showEdit)}
            leftIcon={Pencil}
          >
            Edit League
          </Button>
          {!isPublic &&
            (league.hasPassword ? (
              <Button
                size="sm"
                loading={passwordLoading}
                onClick={handleRemovePassword}
                leftIcon={Lock}
              >
                Remove Password
              </Button>
            ) : (
              <Button
                size="sm"
                onClick={() => setShowPasswordForm(!showPasswordForm)}
                leftIcon={Lock}
              >
                Set Password
              </Button>
            ))}
        </div>

        {showPasswordForm && !league.hasPassword && !isPublic && (
          <div className="mt-4 flex items-center gap-2 border-t border-border pt-4">
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Enter password"
              aria-label="New league password"
              maxLength={50}
              className="flex-1 rounded-lg border border-border bg-surface px-3 py-2 text-text placeholder:text-text-muted focus:border-accent focus:ring-1 focus:ring-accent focus:outline-none"
            />
            <Button
              size="sm"
              loading={passwordLoading}
              disabled={!newPassword.trim()}
              onClick={() => void handleSetPassword()}
            >
              Save
            </Button>
            <button
              type="button"
              onClick={() => setShowPasswordForm(false)}
              className="rounded-lg px-3 py-2 text-sm font-medium text-text-muted transition-colors hover:bg-surface-muted hover:text-text"
            >
              Cancel
            </button>
          </div>
        )}

        {showEdit && (
          <EditLeagueForm
            league={league}
            updateLeague={updateLeague}
            onClose={() => setShowEdit(false)}
          />
        )}
      </div>
    </div>
  );
}

function DangerZone({
  leagueId,
  league,
  isAdmin,
}: {
  leagueId: Id<'leagues'>;
  league: League;
  isAdmin: boolean;
}) {
  const navigate = useNavigate();
  const deleteLeagueMutation = useMutation(api.leagues.deleteLeague);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmSlug, setDeleteConfirmSlug] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  const slugMatches = deleteConfirmSlug.trim() === league.slug;

  async function handleDelete() {
    if (!slugMatches) {
      return;
    }
    setIsDeleting(true);
    try {
      await deleteLeagueMutation({ leagueId: league._id });
      void navigate({ to: '/leagues' });
    } finally {
      setIsDeleting(false);
    }
  }

  function resetDeleteConfirm() {
    setShowDeleteConfirm(false);
    setDeleteConfirmSlug('');
  }

  return (
    <div className="overflow-hidden rounded-xl border-2 border-error/40 bg-error/5">
      <div className="border-b border-error/20 bg-error/10 px-4 py-3">
        <h3 className="text-sm font-semibold tracking-wide text-error uppercase">
          Danger zone
        </h3>
        <p className="mt-0.5 text-xs text-text-muted">
          Irreversible actions. Leave removes you from the league; delete
          removes the league for everyone.
        </p>
      </div>
      <div className="space-y-4 p-4">
        {isAdmin && league.adminCount === 1 ? (
          <div className="rounded-lg border border-warning/40 bg-warning/10 p-3">
            <p className="text-sm font-medium text-text">
              You&apos;re the only admin
            </p>
            <p className="mt-1 text-xs text-text-muted">
              Add at least one other admin (promote a member in the Members
              section) if you want to leave the league without deleting it.
              Until then, you can only delete the league.
            </p>
          </div>
        ) : (
          <LeaveButton leagueId={leagueId} />
        )}

        {isAdmin && (
          <div className="border-t border-border pt-4">
            <p className="mb-2 text-sm font-medium text-text">
              Delete this league
            </p>
            <p className="mb-3 text-xs text-text-muted">
              Permanently delete the league and remove all members. This cannot
              be undone.
            </p>
            {showDeleteConfirm ? (
              <div className="space-y-3">
                <p className="text-sm text-text">
                  Type the league slug{' '}
                  <code className="rounded bg-surface-muted px-1.5 py-0.5 font-mono text-xs">
                    {league.slug}
                  </code>{' '}
                  to confirm:
                </p>
                <input
                  type="text"
                  value={deleteConfirmSlug}
                  onChange={(e) => setDeleteConfirmSlug(e.target.value)}
                  placeholder={league.slug}
                  className="w-full rounded-lg border border-border bg-surface px-3 py-2 font-mono text-sm text-text placeholder:text-text-muted focus:border-error focus:ring-1 focus:ring-error focus:outline-none"
                  disabled={isDeleting}
                  aria-label="Type league slug to confirm deletion"
                />
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    size="sm"
                    variant="danger"
                    loading={isDeleting}
                    disabled={!slugMatches}
                    onClick={handleDelete}
                    leftIcon={Trash2}
                  >
                    Delete forever
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={resetDeleteConfirm}
                    disabled={isDeleting}
                    leftIcon={X}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(true)}
                className="inline-flex items-center gap-2 rounded-lg border border-error/50 bg-transparent px-4 py-2 text-sm font-medium text-error transition-colors hover:bg-error/10"
              >
                <Trash2 className="h-4 w-4" />
                Delete league
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function EditLeagueForm({
  league,
  updateLeague,
  onClose,
}: {
  league: League;
  updateLeague: ReturnType<typeof useMutation<typeof api.leagues.updateLeague>>;
  onClose: () => void;
}) {
  const navigate = useNavigate();
  const [name, setName] = useState(league.name);
  const [slug, setSlug] = useState(league.slug);
  const [description, setDescription] = useState(league.description ?? '');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const slugChanged = slug !== league.slug;
  const slugAvailable = useQuery(
    api.leagues.isSlugAvailable,
    slugChanged && slug.length >= 3 ? { slug } : 'skip',
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      await updateLeague({
        leagueId: league._id,
        name,
        slug,
        description,
      });
      if (slugChanged) {
        void navigate({
          to: '/leagues/$slug',
          params: { slug },
          replace: true,
        });
      }
      onClose();
    } catch (err) {
      setError(
        err instanceof Error
          ? toUserFacingMessage(err)
          : 'Failed to update league',
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={(e) => void handleSubmit(e)}
      className="mt-4 space-y-3 border-t border-border pt-4"
    >
      <div>
        <label
          htmlFor="edit-league-name"
          className="mb-1 block text-sm font-medium text-text"
        >
          Name
        </label>
        <input
          id="edit-league-name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={50}
          required
          className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-text focus:border-accent focus:ring-1 focus:ring-accent focus:outline-none"
        />
      </div>
      <div>
        <label
          htmlFor="edit-league-slug"
          className="mb-1 block text-sm font-medium text-text"
        >
          Slug
        </label>
        <div className="flex items-center gap-2">
          <input
            id="edit-league-slug"
            type="text"
            value={slug}
            onChange={(e) =>
              setSlug(
                e.target.value
                  .toLowerCase()
                  .replace(/[^a-z0-9-]/g, '-')
                  .replace(/-+/g, '-')
                  .replace(/^-|-$/g, '')
                  .slice(0, 30),
              )
            }
            maxLength={30}
            required
            className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-text focus:border-accent focus:ring-1 focus:ring-accent focus:outline-none"
          />
          {slugChanged && slug.length >= 3 && (
            <span className="shrink-0">
              {slugAvailable === undefined ? (
                <Loader2 className="h-4 w-4 animate-spin text-text-muted" />
              ) : slugAvailable ? (
                <Check className="h-4 w-4 text-success" />
              ) : (
                <span className="text-xs text-error">Taken</span>
              )}
            </span>
          )}
        </div>
      </div>
      <div>
        <label
          htmlFor="edit-league-description"
          className="mb-1 block text-sm font-medium text-text"
        >
          Description
        </label>
        <input
          id="edit-league-description"
          type="text"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          maxLength={200}
          className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-text focus:border-accent focus:ring-1 focus:ring-accent focus:outline-none"
        />
      </div>
      {error && <p className="text-sm text-error">{error}</p>}
      <div className="flex gap-2">
        <Button type="submit" size="sm" loading={isSubmitting}>
          Save Changes
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
  );
}

function LeaveButton({ leagueId }: { leagueId: Id<'leagues'> }) {
  const navigate = useNavigate();
  const leaveLeague = useMutation(api.leagues.leaveLeague);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleLeave() {
    setError(null);
    setIsLeaving(true);
    try {
      await leaveLeague({ leagueId });
      void navigate({ to: '/leagues' });
    } catch (err) {
      setError(
        err instanceof Error
          ? toUserFacingMessage(err)
          : 'Failed to leave league',
      );
      setIsLeaving(false);
    }
  }

  if (showConfirm) {
    return (
      <div>
        <p className="mb-2 text-sm text-text">
          Are you sure you want to leave this league? You can rejoin later if
          invited.
        </p>
        {error && <p className="mb-2 text-sm text-error">{error}</p>}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={isLeaving}
            onClick={() => void handleLeave()}
            className="inline-flex items-center gap-2 rounded-lg border border-error/50 bg-error/10 px-4 py-2 text-sm font-medium text-error transition-colors hover:bg-error/20 disabled:opacity-50"
          >
            {isLeaving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <LogOut className="h-4 w-4" />
            )}
            Leave league
          </button>
          <button
            type="button"
            onClick={() => setShowConfirm(false)}
            className="rounded-lg px-4 py-2 text-sm font-medium text-text-muted transition-colors hover:bg-surface-muted hover:text-text"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <p className="mb-2 text-sm font-medium text-text">Leave this league</p>
      <p className="mb-2 text-xs text-text-muted">
        Stop being a member. You can rejoin with the link if the league is still
        open.
      </p>
      <button
        type="button"
        onClick={() => setShowConfirm(true)}
        className="inline-flex items-center gap-2 rounded-lg border border-error/50 bg-transparent px-4 py-2 text-sm font-medium text-error transition-colors hover:bg-error/10"
      >
        <LogOut className="h-4 w-4" />
        Leave league
      </button>
    </div>
  );
}
