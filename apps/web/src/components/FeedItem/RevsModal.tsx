import { api } from '@convex-generated/api';
import type { Id } from '@convex-generated/dataModel';
import { Link } from '@tanstack/react-router';
import { useQuery } from 'convex/react';
import { createPortal } from 'react-dom';
import { Avatar } from '../Avatar';
import { FollowButton } from '../FollowButton';
import { resolveDisplayName } from '@grandprixpicks/shared/displayName';
import { X } from 'lucide-react';

export function RevsModal({
  feedEventId,
  onClose,
}: {
  feedEventId: Id<'feedEvents'>;
  onClose: () => void;
}) {
  const users = useQuery(api.feed.getRevUsers, { feedEventId });
  const me = useQuery(api.users.me, {});
  const followedIds = useQuery(api.follows.getViewerFollowedIds, {});
  const followedSet = new Set(followedIds ?? []);

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-sm border border-border bg-surface"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h2 className="text-sm font-semibold text-text">Rev'd by</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-sm p-1 text-text-muted hover:bg-surface-muted hover:text-text"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="h-72 overflow-y-auto py-2">
          {users === undefined ? (
            <div className="space-y-1 px-4 py-2">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="flex items-center gap-3 py-2">
                  <div className="h-8 w-8 animate-pulse rounded-full bg-surface-muted" />
                  <div className="h-3 w-32 animate-pulse rounded bg-surface-muted" />
                  <div className="ml-auto h-6 w-16 animate-pulse rounded-full bg-surface-muted" />
                </div>
              ))}
            </div>
          ) : users.length === 0 ? (
            <div className="flex h-full items-center justify-center">
              <p className="text-sm text-text-muted">No revs yet.</p>
            </div>
          ) : (
            users.map((user) =>
              user ? (
                <div
                  key={user.userId}
                  className="flex items-center gap-3 px-4 py-2 hover:bg-surface-muted"
                >
                  <Link
                    to="/p/$username"
                    params={{ username: user.username ?? '' }}
                    search={{ from: undefined, fromLabel: undefined }}
                    className="flex min-w-0 flex-1 items-center gap-3"
                    onClick={onClose}
                    tabIndex={user.username ? 0 : -1}
                  >
                    <Avatar
                      avatarUrl={user.avatarUrl}
                      username={user.username}
                      size="sm"
                    />
                    <span className="truncate text-sm font-medium text-text">
                      {resolveDisplayName(user)}
                    </span>
                  </Link>
                  {me && user.userId !== me._id && (
                    <FollowButton
                      followeeId={user.userId}
                      isFollowing={followedSet.has(user.userId)}
                      source="feed_item"
                    />
                  )}
                </div>
              ) : null,
            )
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
