import { api } from '@convex-generated/api';
import type { FunctionReturnType } from 'convex/server';
import { Link } from '@tanstack/react-router';

import { Avatar } from '@/components/Avatar';

type Me = FunctionReturnType<typeof api.users.me>;

export function ProfileCard({ me }: { me: Me | undefined }) {
  if (me === undefined) {
    return (
      <div
        className="rounded-lg border border-border bg-surface p-3"
        aria-busy="true"
        aria-label="Loading profile"
      >
        <div className="flex items-center gap-2.5">
          {/* Matches the `md` Avatar below so nothing shifts when it loads. */}
          <div className="h-12 w-12 animate-pulse rounded-full bg-surface-muted" />
          <div className="min-w-0 flex-1 space-y-1.5">
            <div className="h-3.5 w-24 animate-pulse rounded bg-surface-muted" />
            <div className="h-2.5 w-16 animate-pulse rounded bg-surface-muted" />
          </div>
        </div>
      </div>
    );
  }

  if (!me?.username) {
    return null;
  }

  const displayName = me.displayName?.trim() || me.username;

  return (
    <Link
      to="/p/$username"
      params={{ username: me.username }}
      search={{ from: undefined, fromLabel: undefined }}
      className="block rounded-lg border border-border bg-surface p-3 transition-colors hover:border-border-strong"
    >
      <div className="flex items-center gap-2.5">
        <Avatar avatarUrl={me.avatarUrl} username={me.username} size="md" />
        <div className="min-w-0">
          {/* The rail leaves ~140px for text, so a full three-word name only
              fits once it wraps. Two lines at text-sm covers real names; the
              username below stays single-line because it cannot break. */}
          <p className="line-clamp-2 text-sm leading-snug font-semibold break-words text-text">
            {displayName}
          </p>
          <p className="mt-0.5 truncate text-[11px] text-text-muted">
            @{me.username}
          </p>
        </div>
      </div>
    </Link>
  );
}
