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
};

type ProfileLinkProps = {
  username: string;
  className?: string;
  children: React.ReactNode;
};

type Props = {
  members: Array<LeagueMembersListItem>;
  showPredictionStatus: boolean;
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

export function LeagueMembersList({
  members,
  showPredictionStatus,
  renderProfileLink,
  onFollow,
  onUnfollow,
}: Props) {
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-surface">
      {members.map((member, index) => (
        <div
          key={member._id}
          className={`flex items-center justify-between gap-4 px-4 py-3 ${
            index < members.length - 1 ? 'border-b border-border' : ''
          }`}
        >
          <div className="flex min-w-0 flex-1 items-center gap-3">
            {member.avatarUrl ? (
              <img
                src={member.avatarUrl}
                alt=""
                className="h-8 w-8 shrink-0 rounded-full object-cover"
              />
            ) : (
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-surface-muted text-xs font-semibold text-text-muted">
                {member.displayName.charAt(0).toUpperCase()}
              </span>
            )}
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                {renderProfileLink({
                  username: member.username,
                  className:
                    'truncate font-medium text-accent hover:text-accent-hover',
                  children: member.displayName,
                })}
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
              <div className="mt-1 flex items-center gap-4 text-xs">
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
          </div>

          <div className="flex shrink-0 items-center gap-3">
            <div className="hidden h-11 w-11 items-center justify-center sm:flex">
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
        </div>
      ))}
    </div>
  );
}
