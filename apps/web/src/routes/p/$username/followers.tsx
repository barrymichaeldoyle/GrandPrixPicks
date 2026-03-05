import { SignInButton, useAuth } from '@clerk/react';
import { api } from '@convex-generated/api';
import { createFileRoute, Link } from '@tanstack/react-router';
import { useQuery } from 'convex/react';
import { ArrowLeft, LogIn, Users } from 'lucide-react';

import { Avatar } from '../../../components/Avatar';
import { Button } from '../../../components/Button';
import { FollowButton } from '../../../components/FollowButton';
import { PageLoader } from '../../../components/PageLoader';
import { canonicalMeta, defaultOgImage } from '../../../lib/site';

export const Route = createFileRoute('/p/$username/followers')({
  component: FollowersPage,
  loader: ({ params }) => ({ username: params.username }),
  head: ({ params }) => {
    const title = `${params.username}'s followers | Grand Prix Picks`;
    const description = `See who follows ${params.username} on Grand Prix Picks.`;
    const canonical = canonicalMeta(`/p/${params.username}/followers`);
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

function FollowersPage() {
  const { username } = Route.useParams();
  const { isSignedIn, isLoaded } = useAuth();

  const me = useQuery(api.users.me);
  const profile = useQuery(api.users.getProfileByUsername, { username });
  const followers = useQuery(
    api.follows.listFollowers,
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
              Sign in to view followers
            </h1>
            <p className="mb-4 text-text-muted">
              Sign in to see who follows {username} and discover other players.
            </p>
            <SignInButton mode="modal">
              <Button size="sm">Sign In</Button>
            </SignInButton>
          </div>
        </div>
      </div>
    );
  }

  if (profile === undefined || followers === undefined) {
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
        <Button asChild size="sm" leftIcon={ArrowLeft} className="mb-4">
          <Link to="/p/$username" params={{ username }}>
            Back to {displayName}
          </Link>
        </Button>
        <div className="mb-6 flex items-center gap-3">
          <Users className="h-8 w-8 text-accent" aria-hidden />
          <h1 className="text-2xl font-bold text-text">
            {displayName}&apos;s followers
          </h1>
        </div>

        {followers === null ? (
          <div className="rounded-xl border border-border bg-surface p-6 text-center text-text-muted">
            You must be signed in to view this list.
          </div>
        ) : followers.length === 0 ? (
          <div className="rounded-xl border border-border bg-surface p-8 text-center">
            <Users className="mx-auto mb-3 h-12 w-12 text-text-muted" />
            <p className="text-text-muted">No followers yet.</p>
          </div>
        ) : (
          <ul className="space-y-2">
            {followers.map((user) => (
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
