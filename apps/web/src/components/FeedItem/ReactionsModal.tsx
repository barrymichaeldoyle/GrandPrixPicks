import {
  reactionOptionFor,
  reactionOptionsFor,
  type ReactionContext,
} from '@grandprixpicks/shared/reactions';
import { resolveDisplayName } from '@grandprixpicks/shared/displayName';
import { api } from '@convex-generated/api';
import type { Id } from '@convex-generated/dataModel';
import { Link } from '@tanstack/react-router';
import { useQuery } from '@/integrations/convex/query';
import { X } from 'lucide-react';
import { createPortal } from 'react-dom';

import { useModalDialog } from '@/hooks/useModalDialog';

import { Avatar } from '../Avatar';
import { FollowButton } from '../FollowButton';

export function ReactionsModal({
  feedEventId,
  onClose,
  context = 'pick',
}: {
  feedEventId: Id<'feedEvents'>;
  onClose: () => void;
  /** Matches the button that opened it, so the wording does not switch. */
  context?: ReactionContext;
}) {
  const panelRef = useModalDialog<HTMLDivElement>({ onClose });
  const users = useQuery(api.feed.getReactionUsers, { feedEventId });
  const me = useQuery(api.users.me, {});
  const followedIds = useQuery(api.follows.getViewerFollowedIds, {});
  const followedSet = new Set(followedIds ?? []);

  const groups =
    users === undefined
      ? []
      : reactionOptionsFor(context)
          .map((reaction) => ({
            reaction,
            users: users.filter((user) => user?.reactionType === reaction.type),
          }))
          .filter((group) => group.users.length > 0);

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="Reactions"
        tabIndex={-1}
        className="w-full max-w-sm rounded-sm border border-border bg-surface outline-none"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h2 className="text-sm font-semibold text-text">
            Reactions{users?.length ? ` · ${users.length}` : ''}
          </h2>
          <button
            type="button"
            aria-label="Close reactions"
            onClick={onClose}
            className="rounded-sm p-1 text-text-muted hover:bg-surface-muted hover:text-text"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="h-80 overflow-y-auto py-2">
          {users === undefined ? (
            <div className="space-y-1 px-4 py-2">
              {[...Array(4)].map((_, index) => (
                <div key={index} className="flex items-center gap-3 py-2">
                  <div className="h-8 w-8 animate-pulse rounded-full bg-surface-muted" />
                  <div className="h-3 w-32 animate-pulse rounded bg-surface-muted" />
                  <div className="ml-auto h-6 w-16 animate-pulse rounded-full bg-surface-muted" />
                </div>
              ))}
            </div>
          ) : users.length === 0 ? (
            <div className="flex h-full items-center justify-center">
              <p className="text-sm text-text-muted">No reactions yet.</p>
            </div>
          ) : (
            groups.map(({ reaction, users: groupUsers }) => (
              <section key={reaction.type}>
                <div className="sticky top-0 z-10 flex items-center gap-2 border-y border-border/60 bg-surface-elevated px-4 py-2">
                  <span aria-hidden="true">{reaction.emoji}</span>
                  <h3 className="flex-1 text-xs font-semibold text-text">
                    {reaction.label}
                  </h3>
                  <span className="gpp-mono text-xs text-text-muted">
                    {groupUsers.length}
                  </span>
                </div>
                {groupUsers.map((user) =>
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
                      <span
                        aria-label={
                          reactionOptionFor(context, user.reactionType).label
                        }
                      >
                        {reactionOptionFor(context, user.reactionType).emoji}
                      </span>
                      {me && user.userId !== me._id && (
                        <FollowButton
                          followeeId={user.userId}
                          isFollowing={followedSet.has(user.userId)}
                          source="feed_item"
                        />
                      )}
                    </div>
                  ) : null,
                )}
              </section>
            ))
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
