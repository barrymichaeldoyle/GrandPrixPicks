import { Link } from '@tanstack/react-router';
import { ArrowRight, ChevronDown, EyeOff } from 'lucide-react';
import { useEffect, useState } from 'react';

import type { SessionType } from '../../lib/sessions';
import { getSessionsForWeekend } from '../../lib/sessions';
import { Badge, StatusBadge } from '../Badge';
import { getCountryCodeForRace, RaceFlag } from '../RaceCard';
import { CardActions } from './CardActions';
import { RaceScoreCardHeader } from './RaceScoreCardHeader';
import { SessionSection } from './SessionSection';
import type { CardDisplayState } from './state';
import { BORDER_LEFT_COLORS, deriveCardState } from './state';
import type { WeekendCardData } from './types';
import { WeekendSummaryLine } from './WeekendSummaryLine';

interface RaceScoreCardProps {
  data: WeekendCardData;
  variant: 'full' | 'compact';
  viewer: { isSignedIn: boolean; isOwner: boolean };
  isNextRace?: boolean;

  /** Full mode: parent handles edit form rendering */
  onEditSession?: (session: SessionType) => void;

  /** Compact mode: expand/collapse */
  defaultExpanded?: boolean;

  /** Compact mode: link to race page */
  linkToRace?: boolean;
  /** Compact mode: render summary-only card without expandable breakdown */
  compactSummaryOnly?: boolean;
}

export function RaceScoreCard({
  data,
  variant,
  viewer,
  isNextRace = false,
  onEditSession,
  defaultExpanded = false,
  linkToRace = true,
  compactSummaryOnly = false,
}: RaceScoreCardProps) {
  const cardState = deriveCardState({
    data,
    isSignedIn: viewer.isSignedIn,
    isOwner: viewer.isOwner,
    isNextRace,
  });

  if (variant === 'compact') {
    return (
      <CompactCard
        data={data}
        cardState={cardState}
        viewer={viewer}
        isNextRace={isNextRace}
        defaultExpanded={defaultExpanded}
        linkToRace={linkToRace}
        compactSummaryOnly={compactSummaryOnly}
      />
    );
  }

  return (
    <FullCard data={data} cardState={cardState} onEditSession={onEditSession} />
  );
}

// ───────────────────────── Compact (Profile Page) ─────────────────────────

function CompactCard({
  data,
  cardState,
  viewer,
  isNextRace,
  defaultExpanded,
  linkToRace,
  compactSummaryOnly,
}: {
  data: WeekendCardData;
  cardState: CardDisplayState;
  viewer: { isSignedIn: boolean; isOwner: boolean };
  isNextRace: boolean;
  defaultExpanded: boolean;
  linkToRace: boolean;
  compactSummaryOnly: boolean;
}) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const sessions = getSessionsForWeekend(data.hasSprint);

  if (compactSummaryOnly) {
    return (
      <CompactSummaryCard
        data={data}
        cardState={cardState}
        isNextRace={isNextRace}
        linkToRace={linkToRace}
      />
    );
  }

  const canExpand =
    cardState !== 'hidden_upcoming' && cardState !== 'not_yet_open';

  // Keep content mounted during collapse so height can animate
  const [contentMounted, setContentMounted] = useState(false);
  useEffect(() => {
    if (expanded) {
      setContentMounted(true);
    } else {
      const t = setTimeout(() => setContentMounted(false), 220);
      return () => clearTimeout(t);
    }
  }, [expanded]);

  return (
    <div
      className={`overflow-hidden rounded-xl border border-border bg-surface ${BORDER_LEFT_COLORS[cardState]}`}
    >
      <div className="flex flex-col gap-4 p-4 transition-colors hover:bg-surface-hover sm:flex-row sm:items-center sm:justify-between sm:gap-4">
        <RaceScoreCardHeader
          data={data}
          cardState={cardState}
          variant="compact"
          isNextRace={isNextRace}
          linkToRace={linkToRace}
          compactSummaryOnly={compactSummaryOnly}
        />

        {canExpand && (
          <div className="flex shrink-0 items-center gap-3 sm:flex-col sm:items-end">
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                setExpanded((prev) => !prev);
              }}
              className="-mr-2 -mb-2 flex min-h-10 min-w-10 items-center justify-center gap-1 text-sm text-accent transition-colors hover:text-accent/80 focus:outline-none focus-visible:text-accent/80 sm:min-h-0 sm:min-w-0 sm:justify-start"
              aria-expanded={expanded}
              aria-label={expanded ? 'Hide breakdown' : 'Show breakdown'}
            >
              {expanded ? 'Hide breakdown' : 'Show breakdown'}
              <ChevronDown
                className={`h-4 w-4 shrink-0 transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}
              />
            </button>
          </div>
        )}
      </div>

      <CardActions data={data} cardState={cardState} variant="compact" />

      {/* Expandable breakdown */}
      {canExpand && (
        <div
          className="grid transition-[grid-template-rows] duration-200 ease-out"
          style={{ gridTemplateRows: expanded ? '1fr' : '0fr' }}
        >
          <div className="min-h-0 overflow-hidden">
            {contentMounted && (
              <div className="divide-y divide-border/50 border-t border-border/60 p-3 sm:p-4">
                {sessions.map((session) => {
                  const sessionData = data.sessions[session];
                  if (!sessionData) {
                    return null;
                  }

                  return (
                    <SessionSection
                      key={session}
                      sessionType={session}
                      sessionData={sessionData}
                      variant="compact"
                    />
                  );
                })}

                {/* Owner visibility notice */}
                {viewer.isOwner &&
                  Object.values(data.sessions).some(
                    (s) => s && !s.isHidden && s.points === null,
                  ) &&
                  data.raceStatus === 'upcoming' && (
                    <div className="-mb-3 flex items-center justify-center gap-1.5 px-3 py-1">
                      <EyeOff className="h-3 w-3 text-text-muted/60" />
                      <span className="text-xs text-text-muted/60">
                        Only visible to you until session locks
                      </span>
                    </div>
                  )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function CompactSummaryCard({
  data,
  cardState,
  isNextRace,
  linkToRace,
}: {
  data: WeekendCardData;
  cardState: CardDisplayState;
  isNextRace: boolean;
  linkToRace: boolean;
}) {
  const sessions = getSessionsForWeekend(data.hasSprint);
  const countryCode = getCountryCodeForRace({ slug: data.raceSlug });
  const hasSubmitted = sessions.some(
    (session) => (data.sessions[session]?.picks.length ?? 0) > 0,
  );
  const showStatusBadge =
    cardState !== 'fully_scored' &&
    cardState !== 'partially_scored' &&
    cardState !== 'missed_with_results' &&
    !(hasSubmitted && cardState === 'open_has_picks');
  const hasResults =
    cardState === 'fully_scored' ||
    cardState === 'partially_scored' ||
    cardState === 'missed_with_results';
  const body = (
    <div
      className={`group relative overflow-hidden rounded-l-lg rounded-r-xl border-2 border-l-8 bg-surface transition-[border-color,box-shadow] duration-200 ${!linkToRace ? '' : 'hover:shadow-[0_0_0_1px_rgba(20,184,166,0.45),0_0_10px_3px_rgba(20,184,166,0.14),0_14px_30px_rgba(20,184,166,0.12)] focus-visible:shadow-[0_0_0_1px_rgba(20,184,166,0.55),0_0_12px_4px_rgba(20,184,166,0.18),0_16px_34px_rgba(20,184,166,0.14)] dark:hover:shadow-[0_0_0_1px_rgba(45,212,191,0.68),0_0_12px_4px_rgba(20,184,166,0.18),0_18px_36px_rgba(15,118,110,0.24)] dark:focus-visible:shadow-[0_0_0_1px_rgba(45,212,191,0.82),0_0_14px_5px_rgba(20,184,166,0.22),0_20px_40px_rgba(15,118,110,0.28)]'} ${
        isNextRace
          ? 'border-accent/70 border-l-accent/70 hover:border-accent'
          : 'border-border border-l-border hover:border-accent/70'
      }`}
    >
      <div
        className={`flex h-[58px] items-stretch overflow-hidden border-b-2 transition-colors ${
          isNextRace
            ? 'border-accent/70 group-hover:border-accent'
            : 'border-border group-hover:border-accent/70'
        }`}
      >
        <div className="flex min-w-0 flex-1 items-stretch">
          {countryCode && (
            <span
              className={`inline-flex h-full shrink-0 overflow-hidden border-r-2 ${
                isNextRace
                  ? 'border-accent/70 group-hover:border-accent'
                  : 'border-border group-hover:border-accent/70'
              }`}
            >
              <RaceFlag
                countryCode={countryCode}
                size="full"
                className="rounded-none shadow-none ring-0"
              />
            </span>
          )}
          <div className="min-w-0 self-center px-2 py-1.5">
            <p className="text-[11px] font-semibold tracking-wide text-text-muted uppercase">
              Round {data.raceRound}
            </p>
            <h3 className="line-clamp-2 text-sm leading-tight font-semibold text-text sm:text-base">
              {data.raceName}
            </h3>
          </div>
        </div>
        <span className="inline-flex shrink-0 items-center pr-3 pl-2">
          <ArrowRight className="h-3.5 w-3.5 text-accent transition-colors group-hover:text-accent-hover" />
        </span>
      </div>

      <div className="px-2 pt-2">
        <div className="mb-2 flex flex-wrap items-center gap-1.5">
          {showStatusBadge && (
            <StatusBadge status={data.raceStatus} isNext={isNextRace} />
          )}
          {hasSubmitted && (
            <span className="inline-flex items-center rounded-full border border-success/35 bg-success-muted/40 px-2 py-0.5 text-xs font-medium text-success">
              Picks submitted
            </span>
          )}
          {data.hasSprint && <Badge variant="sprint">SPRINT</Badge>}
          <span className="inline-flex items-center rounded-full border border-border bg-surface-muted/45 px-2 py-0.5 text-xs text-text-muted">
            {new Date(data.raceDate).toLocaleDateString(undefined, {
              month: 'short',
              day: 'numeric',
            })}
          </span>
        </div>

        <div className="rounded-lg border border-border/70 bg-surface-muted/35 p-2">
          <div className="mb-1 flex items-center justify-between">
            <p className="text-[11px] font-medium tracking-wide text-text-muted uppercase">
              Weekend Summary
            </p>
            <span className="rounded-md bg-accent/10 px-1.5 py-0.5 text-xs font-semibold text-accent">
              {hasResults ? `${data.totalPoints}/${data.maxPoints}` : 'TBD'}
            </span>
          </div>
          <div className="text-sm text-text-muted">
            <WeekendSummaryLine
              data={data}
              sessions={sessions}
              cardState={cardState}
            />
          </div>
        </div>

        <div className="mt-2 flex flex-wrap items-center justify-end gap-2">
          {data.raceRank ? (
            <span className="rounded-full border border-border bg-surface px-2 py-0.5 text-xs text-text-muted">
              {ordinal(data.raceRank.position)} of {data.raceRank.totalPlayers}
            </span>
          ) : null}
        </div>
      </div>
    </div>
  );

  if (!linkToRace) {
    return body;
  }

  return (
    <Link
      to="/races/$raceSlug"
      params={{ raceSlug: data.raceSlug }}
      className="block focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 focus-visible:ring-offset-2 focus-visible:ring-offset-page"
      aria-label={`Open ${data.raceName} details`}
    >
      {body}
    </Link>
  );
}

function ordinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

// ───────────────────────── Full (Race Detail Page) ─────────────────────────

function FullCard({
  data,
  cardState,
  onEditSession,
}: {
  data: WeekendCardData;
  cardState: CardDisplayState;
  onEditSession?: (session: SessionType) => void;
}) {
  const sessions = getSessionsForWeekend(data.hasSprint);

  const showSessions =
    cardState !== 'not_yet_open' &&
    cardState !== 'open_no_picks_unauth' &&
    cardState !== 'open_no_picks_auth' &&
    cardState !== 'hidden_upcoming' &&
    cardState !== 'fully_locked';

  return (
    <div>
      <CardActions data={data} cardState={cardState} variant="full" />

      {showSessions && (
        <div className="grid grid-cols-1 gap-4 p-2 lg:grid-cols-2">
          {sessions.map((session) => {
            const sessionData = data.sessions[session];
            if (!sessionData) {
              return null;
            }

            return (
              <SessionSection
                key={session}
                sessionType={session}
                sessionData={sessionData}
                variant="full"
                onEditSession={onEditSession}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
