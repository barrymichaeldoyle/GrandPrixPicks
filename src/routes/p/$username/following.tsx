import { SignInButton, useAuth } from '@clerk/clerk-react';
import { createFileRoute, Link } from '@tanstack/react-router';
import { useQuery } from 'convex/react';
import { ArrowLeft, LogIn, UserPlus } from 'lucide-react';

import { api } from '../../../../convex/_generated/api';
import { Avatar } from '../../../components/Avatar';
import { Button } from '../../../components/Button';
import { FollowButton } from '../../../components/FollowButton';
import { PageLoader } from '../../../components/PageLoader';
import { canonicalMeta, defaultOgImage } from '../../../lib/site';

export const Route = createFileRoute('/p/$username/following')({
  component: FollowingPage,
  loader: ({ params }) => ({ username: params.username }),
  head: ({ params }) => {
    const title = `Who ${params.username} follows | Grand Prix Picks`;
    const description = `See who ${params.username} follows on Grand Prix Picks.`;
    const canonical = canonicalMeta(`/p/${params.username}/following`);
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

function FollowingPage() {
  const { username } = Route.useParams();
  const { isSignedIn, isLoaded } = useAuth();

  const me = useQuery(api.users.me);
  const profile = useQuery(api.users.getProfileByUsername, { username });
  const following = useQuery(
    api.follows.listFollowing,
    profile ? { userId: profile._id } : 'skip',
  );

  if (!isLoaded) {
    return <PageLoader />;
  }

  if (!isSignedIn) {
    return (
      <div className="min-h-full bg-page">
        <div className="mx-auto max-w-2xl px-4 py-6">
          <div className="rounded-xl border border-border bg-surface p-8 text-center">
            <LogIn className="mx-auto mb-4 h-16 w-16 text-text-muted" />
            <h1 className="mb-2 text-2xl font-bold text-text">
              Sign in to view following
            </h1>
            <p className="mb-4 text-text-muted">
              Sign in to see who {username} follows and discover other players.
            </p>
            <SignInButton mode="modal">
              <Button size="sm">Sign In</Button>
            </SignInButton>
          </div>
        </div>
      </div>
    );
  }

  if (profile === undefined || following === undefined) {
    return <PageLoader />;
  }

  if (!profile) {
    return (
      <div className="min-h-full bg-page">
        <div className="mx-auto max-w-2xl px-4 py-6">
          <div className="rounded-xl border border-border bg-surface p-8 text-center">
            <p className="text-text-muted">User not found.</p>
            <Link
              to="/leaderboard"
              className="mt-4 inline-block text-accent hover:underline"
            >
              View Leaderboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const displayName = profile.displayName ?? profile.username ?? username;

  return (
    <div className="min-h-full bg-page">
      <div className="mx-auto max-w-2xl px-4 py-6">
        <Link
          to="/p/$username"
          params={{ username }}
          className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-text-muted transition-colors hover:text-text"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Back to {displayName}
        </Link>

        <div className="mb-6 flex items-center gap-3">
          <UserPlus className="h-8 w-8 text-accent" aria-hidden />
          <h1 className="text-2xl font-bold text-text">
            Who {displayName} follows
          </h1>
        </div>

        {following === null ? (
          <div className="rounded-xl border border-border bg-surface p-6 text-center text-text-muted">
            You must be signed in to view this list.
          </div>
        ) : following.length === 0 ? (
          <div className="rounded-xl border border-border bg-surface p-8 text-center">
            <UserPlus className="mx-auto mb-3 h-12 w-12 text-text-muted" />
            <p className="text-text-muted">Not following anyone yet.</p>
          </div>
        ) : (
          <ul className="space-y-2">
            {following.map((user) => (
              <li key={user._id}>
                <Link
                  to="/p/$username"
                  params={{ username: user.username ?? 'anonymous' }}
                  className="flex items-center justify-between gap-3 rounded-xl border border-border bg-surface p-3 transition-colors hover:bg-surface-muted"
                >
                  <div className="flex min-w-0 flex-1 items-center gap-3">
                    <Avatar
                      avatarUrl={user.avatarUrl}
                      username={user.username}
                      size="md"
                    />
                    <div className="min-w-0">
                      <p className="truncate font-medium text-text">
                        {user.displayName ?? user.username ?? 'Anonymous'}
                      </p>
                      {user.username && (
                        <p className="truncate text-sm text-text-muted">
                          @{user.username}
                        </p>
                      )}
                    </div>
                  </div>
                  <div
                    className="shrink-0"
                    onClick={(e) => e.stopPropagation()}
                    onMouseDown={(e) => e.stopPropagation()}
                  >
                    {me && user._id === me._id ? (
                      <span className="text-sm font-medium text-text-muted">
                        You
                      </span>
                    ) : (
                      <FollowButton followeeId={user._id} />
                    )}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
