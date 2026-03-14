import type { Id } from '@convex-generated/dataModel';
import { SignInButton } from '@clerk/react';
import { Link } from '@tanstack/react-router';
import type { LucideIcon } from 'lucide-react';
import { ArrowLeft, LogIn } from 'lucide-react';
import type { ReactNode } from 'react';

import { Avatar } from '../../../components/Avatar';
import { Button } from '../../../components/Button';
import { FollowButton } from '../../../components/FollowButton';

type FollowListUser = {
  _id: Id<'users'>;
  avatarUrl?: string | null;
  username?: string | null;
  displayName?: string | null;
};

type FollowListPageProps = {
  username: string;
  displayName: string;
  heading: string;
  signInTitle: string;
  signInDescription: string;
  emptyMessage: string;
  icon: LucideIcon;
  isSignedIn: boolean;
  profileExists: boolean;
  users: Array<FollowListUser> | null;
  viewerUserId?: Id<'users'>;
};

function FollowListStateShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-full bg-page">
      <div className="mx-auto max-w-2xl px-4 py-6">{children}</div>
    </div>
  );
}

function FollowListUserRow({
  user,
  viewerUserId,
}: {
  user: FollowListUser;
  viewerUserId?: Id<'users'>;
}) {
  return (
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
          {viewerUserId && user._id === viewerUserId ? (
            <span className="text-sm font-medium text-text-muted">You</span>
          ) : (
            <FollowButton followeeId={user._id} />
          )}
        </div>
      </Link>
    </li>
  );
}

export function FollowListPage({
  username,
  displayName,
  heading,
  signInTitle,
  signInDescription,
  emptyMessage,
  icon: Icon,
  isSignedIn,
  profileExists,
  users,
  viewerUserId,
}: FollowListPageProps) {
  if (!isSignedIn) {
    return (
      <FollowListStateShell>
        <div className="rounded-xl border border-border bg-surface p-8 text-center">
          <LogIn className="mx-auto mb-4 h-16 w-16 text-text-muted" />
          <h1 className="mb-2 text-2xl font-bold text-text">{signInTitle}</h1>
          <p className="mb-4 text-text-muted">{signInDescription}</p>
          <SignInButton mode="modal">
            <Button size="sm">Sign In</Button>
          </SignInButton>
        </div>
      </FollowListStateShell>
    );
  }

  if (!profileExists) {
    return (
      <FollowListStateShell>
        <div className="rounded-xl border border-border bg-surface p-8 text-center">
          <p className="text-text-muted">User not found.</p>
          <Link
            to="/leaderboard"
            className="mt-4 inline-block text-accent hover:underline"
          >
            View Leaderboard
          </Link>
        </div>
      </FollowListStateShell>
    );
  }

  return (
    <FollowListStateShell>
      <Button
        asChild
        size="sm"
        variant="text"
        leftIcon={ArrowLeft}
        className="mb-4"
      >
        <Link to="/p/$username" params={{ username }}>
          Back to {displayName}
        </Link>
      </Button>
      <div className="mb-6 flex items-center gap-3">
        <Icon className="h-8 w-8 text-accent" aria-hidden />
        <h1 className="text-2xl font-bold text-text">{heading}</h1>
      </div>

      {users === null ? (
        <div className="rounded-xl border border-border bg-surface p-6 text-center text-text-muted">
          You must be signed in to view this list.
        </div>
      ) : users.length === 0 ? (
        <div className="rounded-xl border border-border bg-surface p-8 text-center">
          <Icon className="mx-auto mb-3 h-12 w-12 text-text-muted" />
          <p className="text-text-muted">{emptyMessage}</p>
        </div>
      ) : (
        <ul className="space-y-2">
          {users.map((user) => (
            <FollowListUserRow
              key={user._id}
              user={user}
              viewerUserId={viewerUserId}
            />
          ))}
        </ul>
      )}
    </FollowListStateShell>
  );
}
