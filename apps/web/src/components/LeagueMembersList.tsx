import { Crown, UserCheck, UserPlus } from 'lucide-react';

import { Tooltip } from './Tooltip';

export type LeagueMembersListItem = {
  _id: string;
  userId: string;
  username: string;
  displayName: string;
  avatarUrl?: string;
  role: 'admin' | 'member';
  top5Picked?: boolean;
  h2hPicked?: boolean;
  isViewer: boolean;
  isFollowing?: boolean;
  rank?: number;
  points?: number;
  top5Points?: number;
  h2hPoints?: number;
  correctPicks?: number;
  totalPicks?: number;
};

type ProfileLinkProps = {
  username: string;
  className?: string;
  children: React.ReactNode;
};

type Props = {
  members: LeagueMembersListItem[];
  showPredictionStatus: boolean;
  gameMode?: 'combined' | 'top5' | 'h2h';
  renderProfileLink: (props: ProfileLinkProps) => React.ReactNode;
  onFollow?: (userId: string) => void;
  onUnfollow?: (userId: string) => void;
};

function getPredictionIndicatorLabel(
  top5Picked?: boolean,
  h2hPicked?: boolean,
): string | null {
  if (top5Picked === undefined || h2hPicked === undefined) {
    return null;
  }
  if (top5Picked && h2hPicked) {
    return 'Top 5 & H2H picked';
  }
  if (top5Picked && !h2hPicked) {
    return 'Top 5 picked, H2H not picked';
  }
  if (!top5Picked && h2hPicked) {
    return 'H2H picked, Top 5 not picked';
  }
  return 'Predictions not made';
}

// Row widths for varied-width skeleton bars (name, username)
const SKELETON_ROWS: { name: string; username: string }[] = [
  { name: 'w-32', username: 'w-20' },
  { name: 'w-40', username: 'w-24' },
  { name: 'w-28', username: 'w-16' },
  { name: 'w-36', username: 'w-28' },
  { name: 'w-24', username: 'w-20' },
];

export function LeagueMembersListSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div
      className="animate-pulse overflow-hidden rounded-xl border border-border bg-surface"
      aria-hidden
    >
      {Array.from({ length: rows }).map((_, index) => {
        const widths = SKELETON_ROWS[index % SKELETON_ROWS.length];
        return (
          <div
            key={index}
            className={`flex items-center gap-3 px-4 py-3 sm:gap-4 ${
              index < rows - 1 ? 'border-b border-border' : ''
            }`}
          >
            {/* Rank — desktop only */}
            <div className="hidden w-8 shrink-0 sm:block">
              <span className="block h-4 w-6 rounded bg-surface-muted" />
            </div>

            {/* Avatar */}
            <span className="h-8 w-8 shrink-0 rounded-full bg-surface-muted" />

            {/* Name + username */}
            <div className="min-w-0 flex-1 space-y-1.5">
              <span
                className={`block h-4 rounded bg-surface-muted ${widths.name}`}
              />
              <span
                className={`block h-3 rounded bg-surface-muted ${widths.username}`}
              />
            </div>

            {/* Points — desktop only */}
            <div className="hidden shrink-0 space-y-1 text-right sm:block">
              <span className="block h-4 w-14 rounded bg-surface-muted" />
            </div>

            {/* Follow button — desktop only */}
            <div className="hidden h-11 w-11 shrink-0 rounded-lg bg-surface-muted sm:block" />
          </div>
        );
      })}
    </div>
  );
}

export function LeagueMembersList({
  members,
  showPredictionStatus,
  gameMode = 'top5',
  renderProfileLink,
  onFollow,
  onUnfollow,
}: Props) {
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-surface">
      {members.map((member, index) => (
        <div
          key={member._id}
          className={`flex items-center gap-3 px-4 py-3 sm:gap-4 ${
            index < members.length - 1 ? 'border-b border-border' : ''
          } ${member.isViewer ? 'bg-accent-muted' : ''}`}
        >
          {/* Rank — desktop only, left column */}
          <div className="hidden w-8 shrink-0 text-right sm:block">
            <span
              className={`text-sm font-semibold tabular-nums ${
                member.isViewer ? 'text-accent' : 'text-text-muted'
              }`}
            >
              {member.rank != null ? `#${member.rank}` : '—'}
            </span>
          </div>

          {/* Avatar */}
          {member.avatarUrl ? (
            <img
              src={member.avatarUrl}
              alt=""
              className="h-8 w-8 shrink-0 rounded-full object-cover"
            />
          ) : (
            <span
              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
                member.isViewer
                  ? 'bg-accent text-white'
                  : 'bg-surface-muted text-text-muted'
              }`}
            >
              {member.displayName.charAt(0).toUpperCase()}
            </span>
          )}

          {/* Name + meta */}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              {renderProfileLink({
                username: member.username,
                className:
                  'truncate font-medium text-accent hover:text-accent-hover',
                children: member.displayName,
              })}
              {member.isViewer && (
                <span className="rounded-full bg-accent px-1.5 py-0.5 text-[10px] font-bold text-white">
                  YOU
                </span>
              )}
              {member.role === 'admin' && (
                <Tooltip content="League Admin">
                  <span className="inline-flex shrink-0 text-warning">
                    <Crown className="h-3.5 w-3.5" aria-hidden="true" />
                    <span className="sr-only">Admin</span>
                  </span>
                </Tooltip>
              )}
            </div>
            <p className="truncate text-xs text-text-muted">
              @{member.username}
            </p>
            {/* Rank + points — mobile only */}
            <div className="mt-1 flex items-center gap-4 text-xs sm:hidden">
              <span className="text-text-muted">
                Rank{' '}
                <span
                  className={
                    member.rank != null
                      ? 'font-semibold text-text'
                      : 'text-text-muted/40'
                  }
                >
                  {member.rank != null ? `#${member.rank}` : '—'}
                </span>
              </span>
              <span className="text-text-muted">
                Points{' '}
                <span
                  className={
                    member.points != null
                      ? 'font-semibold text-accent'
                      : 'text-text-muted/40'
                  }
                >
                  {member.points != null ? member.points : '—'}
                </span>
              </span>
            </div>
            {showPredictionStatus &&
              getPredictionIndicatorLabel(
                member.top5Picked,
                member.h2hPicked,
              ) && (
                <span className="mt-0.5 inline-flex items-center gap-1 text-xs text-text-muted">
                  <span
                    className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                      member.top5Picked && member.h2hPicked
                        ? 'bg-success'
                        : 'bg-warning'
                    }`}
                    aria-hidden="true"
                  />
                  {getPredictionIndicatorLabel(
                    member.top5Picked,
                    member.h2hPicked,
                  )}
                </span>
              )}
          </div>

          {/* Points — desktop only, right column */}
          <div className="hidden shrink-0 text-right sm:block">
            <span
              className={`text-sm font-semibold tabular-nums ${
                member.points != null ? 'text-accent' : 'text-text-muted/40'
              }`}
            >
              {member.points != null ? `${member.points} pts` : '—'}
            </span>
            {gameMode === 'combined' &&
              member.top5Points != null &&
              member.h2hPoints != null && (
                <p className="mt-0.5 text-xs text-text-muted">
                  T5: {member.top5Points} · H2H: {member.h2hPoints}
                </p>
              )}
            {gameMode === 'h2h' &&
              member.correctPicks != null &&
              member.totalPicks != null && (
                <p className="mt-0.5 text-xs text-text-muted">
                  {member.correctPicks}/{member.totalPicks} correct
                </p>
              )}
          </div>

          {/* Follow button */}
          <div className="hidden h-11 w-11 shrink-0 items-center justify-center sm:flex">
            {!member.isViewer && member.isFollowing !== undefined ? (
              <Tooltip
                content={
                  member.isFollowing
                    ? 'Following (click to unfollow)'
                    : 'Follow'
                }
              >
                <button
                  type="button"
                  onClick={() =>
                    member.isFollowing
                      ? onUnfollow?.(member.userId)
                      : onFollow?.(member.userId)
                  }
                  aria-label={
                    member.isFollowing
                      ? `Unfollow @${member.username}`
                      : `Follow @${member.username}`
                  }
                  className={`flex h-11 w-11 items-center justify-center rounded-lg border transition-colors ${
                    member.isFollowing
                      ? 'border-success/40 bg-success/10 text-success hover:border-error/40 hover:bg-error/10 hover:text-error'
                      : 'border-border bg-surface text-text-muted hover:bg-surface-muted hover:text-text'
                  }`}
                >
                  {member.isFollowing ? (
                    <UserCheck className="h-5 w-5" aria-hidden="true" />
                  ) : (
                    <UserPlus className="h-5 w-5" aria-hidden="true" />
                  )}
                </button>
              </Tooltip>
            ) : null}
          </div>
        </div>
      ))}
    </div>
  );
}
