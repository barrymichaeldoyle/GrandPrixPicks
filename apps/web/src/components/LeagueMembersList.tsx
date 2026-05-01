import { ArrowUpRight, Crown, UserCheck, UserPlus } from 'lucide-react';

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
            className={`flex items-center gap-2 py-2 pr-2 pl-3 sm:gap-3 sm:py-3 sm:pr-3 sm:pl-4 ${
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
          className={`flex items-center gap-2 py-2 pr-2 pl-3 sm:gap-3 sm:py-3 sm:pr-3 sm:pl-4 ${
            index < members.length - 1 ? 'border-b border-border' : ''
          } ${member.isViewer ? 'bg-accent/[0.08]' : ''}`}
        >
          {/* Rank — desktop only, left column */}
          <div className="hidden w-8 shrink-0 text-right sm:block">
            <span className="text-sm font-semibold text-text-muted tabular-nums">
              {member.rank != null ? `#${member.rank}` : '—'}
            </span>
          </div>

          {/* Avatar */}
          {renderProfileLink({
            username: member.username,
            className: 'shrink-0',
            children: member.avatarUrl ? (
              <img
                src={member.avatarUrl}
                alt={member.displayName}
                className={`h-8 w-8 rounded-full object-cover ${
                  member.isViewer
                    ? 'ring-2 ring-accent/30 ring-offset-2 ring-offset-surface'
                    : ''
                }`}
              />
            ) : (
              <span
                className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold ${
                  member.isViewer
                    ? 'bg-surface-muted text-text ring-2 ring-accent/30 ring-offset-2 ring-offset-surface'
                    : 'bg-surface-muted text-text-muted'
                }`}
              >
                {member.displayName.charAt(0).toUpperCase()}
              </span>
            ),
          })}

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
                <span className="rounded-full border border-accent/20 bg-accent/10 px-1.5 py-0.5 text-[10px] font-semibold tracking-[0.04em] text-accent">
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

          {/* Right actions: view top, follow bottom on mobile; side-by-side on desktop */}
          <div
            className={`flex shrink-0 flex-col items-stretch gap-1 sm:flex-row sm:items-center sm:gap-1.5 ${
              !member.isViewer && member.isFollowing !== undefined
                ? 'justify-between self-stretch'
                : 'justify-center'
            }`}
          >
            {renderProfileLink({
              username: member.username,
              className:
                'flex items-center justify-center gap-1 rounded-md border border-border bg-surface px-2.5 py-1 text-xs font-medium text-text-muted transition-colors hover:bg-surface-muted hover:text-text',
              children: (
                <>
                  <ArrowUpRight className="h-3 w-3" aria-hidden="true" />
                  View
                </>
              ),
            })}
            {!member.isViewer && member.isFollowing !== undefined && (
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
                className={`flex items-center justify-center gap-1 rounded-md border px-2.5 py-1 text-xs font-medium transition-colors ${
                  member.isFollowing
                    ? 'border-success/40 bg-success/10 text-success hover:border-error/40 hover:bg-error/10 hover:text-error'
                    : 'border-border bg-surface text-text-muted hover:bg-surface-muted hover:text-text'
                }`}
              >
                {member.isFollowing ? (
                  <>
                    <UserCheck className="h-3 w-3" aria-hidden="true" />
                    Following
                  </>
                ) : (
                  <>
                    <UserPlus className="h-3 w-3" aria-hidden="true" />
                    Follow
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
