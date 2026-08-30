import { api } from '@convex-generated/api';
import type { FunctionReturnType } from 'convex/server';
import { Link } from '@tanstack/react-router';

import { Avatar } from '@/components/Avatar';
import { InlineLoader } from '@/components/InlineLoader';

type Me = FunctionReturnType<typeof api.users.me>;

export function ProfileCard({ me }: { me: Me | undefined }) {
  if (me === undefined) {
    return (
      <div
        className="rounded-lg border border-border bg-surface p-3"
        aria-busy="true"
        aria-label="Loading profile"
      >
        {/* Height matches the `md` Avatar row below so nothing shifts when it
            loads; the shape of the row is not drawn, only waited for. */}
        <InlineLoader label="Loading profile" className="h-12" size="sm" />
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
