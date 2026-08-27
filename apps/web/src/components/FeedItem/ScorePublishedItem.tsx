import { Link } from '@tanstack/react-router';
import { Avatar } from '../Avatar';
import { ReactionButton } from '../ReactionButton';
import { useState } from 'react';
import { DriverBadge, ScoredDriverBadge } from '../DriverBadge';
import type { FeedEvent } from './types';
import { H2HPicksDialog } from './H2HPicksDialog';
import { ReactionsModal } from './ReactionsModal';
import { UserLink } from './UserLink';
import { SESSION_LABELS, formatRelativeTime, getScoreComment } from './helpers';

export function ScorePublishedItem({
  event,
  grouped,
}: {
  event: FeedEvent;
  grouped?: boolean;
}) {
  const [h2hOpen, setH2hOpen] = useState(false);
  const [reactionsOpen, setReactionsOpen] = useState(false);
  const isLocked = event.type === 'session_locked';
  const isAmended = event.type === 'results_amended';

  return (
    <>
      <div className={isLocked ? 'space-y-2' : 'space-y-2.5'}>
        {/* Header: avatar + name */}
        <div className="flex items-center gap-2">
          <Link
            to="/p/$username"
            params={{ username: event.username ?? '' }}
            search={{ from: undefined, fromLabel: undefined }}
            className="shrink-0"
            tabIndex={event.username ? 0 : -1}
          >
            <Avatar
              avatarUrl={event.avatarUrl}
              username={event.username}
              size="sm"
            />
          </Link>
          <div className="min-w-0 flex-1">
            <p className="flex flex-wrap items-baseline gap-x-1.5 text-sm leading-snug">
              <UserLink
                username={event.username}
                displayName={event.displayName}
              />
              {event.username && (
                <span className="text-xs text-text-muted">
                  @{event.username}
                </span>
              )}
            </p>
            {!grouped && event.raceName && (
              <p className="text-xs text-text-muted">
                in{' '}
                {event.raceSlug ? (
                  <Link
                    to="/races/$raceSlug"
                    params={{ raceSlug: event.raceSlug }}
                    className="font-medium text-text hover:text-accent"
                  >
                    {event.raceName}
                  </Link>
                ) : (
                  <span className="font-medium text-text">
                    {event.raceName}
                  </span>
                )}
                {' · '}
                {SESSION_LABELS[event.sessionType ?? ''] ?? event.sessionType}
              </p>
            )}
          </div>
        </div>

        {/* Picks */}
        {event.picks && event.picks.length > 0 && (
          <div className="flex flex-col items-start gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap gap-2">
              {event.picks.map((pick) => (
                <div
                  key={pick.predictedPosition}
                  className="flex flex-col items-center gap-0.5"
                >
                  {!grouped && (
                    <span className="text-xs font-medium text-text-muted">
                      P{pick.predictedPosition}
                    </span>
                  )}
                  {isLocked ? (
                    <DriverBadge
                      code={pick.code}
                      team={pick.team}
                      displayName={pick.displayName}
                      nationality={pick.nationality}
                      size="sm"
                    />
                  ) : (
                    <ScoredDriverBadge
                      code={pick.code}
                      team={pick.team}
                      displayName={pick.displayName}
                      nationality={pick.nationality}
                      pickPoints={pick.points}
                      size="sm"
                    />
                  )}
                  {!isLocked && (
                    <span
                      className={`gpp-mono relative right-0.5 pt-1 text-xs leading-none font-semibold ${
                        pick.points === 5
                          ? 'text-success'
                          : pick.points === 3
                            ? 'text-warning'
                            : pick.points === 1
                              ? 'text-text-muted'
                              : 'text-error/60'
                      }`}
                    >
                      +{pick.points}
                    </span>
                  )}
                </div>
              ))}
            </div>
            {!isLocked &&
              event.h2hScore &&
              event.raceId &&
              event.sessionType && (
                <button
                  type="button"
                  onClick={() => setH2hOpen(true)}
                  className="gpp-touch-target mb-0.5 inline-flex items-center gap-1 rounded-sm border border-accent/30 bg-accent/10 px-2 py-0.5 text-xs font-semibold text-accent transition-colors hover:border-accent/60 hover:bg-accent/20"
                >
                  H2H {event.h2hScore.correctPicks}/{event.h2hScore.totalPicks}
                  <svg
                    className="h-2.5 w-2.5 opacity-70"
                    viewBox="0 0 16 16"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M6 4l4 4-4 4" />
                  </svg>
                </button>
              )}
          </div>
        )}

        {isAmended && (
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1 rounded-sm border border-warning/30 bg-warning/5 px-2 py-1.5">
            <span className="text-xs font-semibold tracking-label text-warning uppercase">
              Results amended
            </span>
            {event.previousPoints !== undefined &&
              event.points !== undefined && (
                <span className="gpp-mono text-xs font-semibold text-text">
                  {event.previousPoints} → {event.points} pts
                </span>
              )}
            {event.amendmentNote && (
              <span className="text-xs text-text-muted">
                {event.amendmentNote}
              </span>
            )}
            <Link
              to="/results-policy"
              className="text-xs font-medium text-accent hover:underline"
            >
              Why results change
            </Link>
          </div>
        )}

        {/* Total points + comment once results are available. */}
        {!isLocked &&
          event.points !== undefined &&
          (() => {
            const total = event.points + (event.h2hScore?.points ?? 0);
            return (
              <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                <span className="gpp-mono text-sm font-semibold text-accent">
                  +{total} {total === 1 ? 'point' : 'points'}
                </span>
                <p className="text-xs text-text-muted italic">
                  {getScoreComment(event.points, event.picks)}
                </p>
              </div>
            );
          })()}

        <div className="-mx-2.5 -mb-2.5 flex items-center justify-between gap-2 px-2.5 py-2">
          <ReactionButton
            feedEventId={event._id}
            reactionCount={event.reactionCount}
            reactionCounts={event.reactionCounts}
            viewerReaction={event.viewerReaction}
            onCountClick={() => setReactionsOpen(true)}
          />
          {!grouped && (
            <div className="flex shrink-0 items-center gap-2 text-xs text-text-muted">
              {isLocked ? (
                <span className="text-xs font-semibold tracking-label text-accent uppercase">
                  Awaiting results
                </span>
              ) : null}
              <span suppressHydrationWarning>
                {formatRelativeTime(event.createdAt)}
              </span>
            </div>
          )}
        </div>
      </div>

      {h2hOpen && event.raceId && event.sessionType && event.userId && (
        <H2HPicksDialog
          userId={event.userId}
          raceId={event.raceId}
          sessionType={
            event.sessionType as 'quali' | 'sprint_quali' | 'sprint' | 'race'
          }
          displayName={event.displayName ?? event.username ?? 'User'}
          onClose={() => setH2hOpen(false)}
        />
      )}
      {reactionsOpen && (
        <ReactionsModal
          feedEventId={event._id}
          onClose={() => setReactionsOpen(false)}
        />
      )}
    </>
  );
}

export function JoinedLeagueItem({ event }: { event: FeedEvent }) {
  const [reactionsOpen, setReactionsOpen] = useState(false);
  return (
    <>
      <div className="flex items-center gap-3">
        <Avatar
          avatarUrl={event.avatarUrl}
          username={event.username}
          size="sm"
        />
        <p className="min-w-0 flex-1 text-sm text-text-muted">
          <UserLink username={event.username} displayName={event.displayName} />{' '}
          joined{' '}
          {event.leagueSlug ? (
            <Link
              to="/leagues/$slug"
              params={{ slug: event.leagueSlug }}
              className="font-medium text-text hover:text-accent"
            >
              {event.leagueName}
            </Link>
          ) : (
            <span className="font-medium text-text">{event.leagueName}</span>
          )}
          <span className="ml-1.5 text-xs whitespace-nowrap text-text-muted">
            · {formatRelativeTime(event.createdAt)}
          </span>
        </p>
        <ReactionButton
          feedEventId={event._id}
          reactionCount={event.reactionCount}
          reactionCounts={event.reactionCounts}
          viewerReaction={event.viewerReaction}
          onCountClick={() => setReactionsOpen(true)}
        />
      </div>
      {reactionsOpen && (
        <ReactionsModal
          feedEventId={event._id}
          onClose={() => setReactionsOpen(false)}
        />
      )}
    </>
  );
}
