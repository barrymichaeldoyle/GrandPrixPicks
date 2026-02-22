import { Link } from '@tanstack/react-router';
import type { ReactNode } from 'react';

import { getSessionsForWeekend } from '../../lib/sessions';
import { Badge, StatusBadge } from '../Badge';
import { getCountryCodeForRace, RaceFlag } from '../RaceCard';
import { ScoreRing } from '../ScoreRing';
import type { CardDisplayState } from './state';
import type { WeekendCardData } from './types';
import { WeekendSummaryLine } from './WeekendSummaryLine';

interface RaceScoreCardHeaderProps {
  data: WeekendCardData;
  cardState: CardDisplayState;
  variant: 'full' | 'compact';
  isNextRace: boolean;
  linkToRace: boolean;
  compactSummaryOnly?: boolean;
}

export function RaceScoreCardHeader({
  data,
  cardState,
  variant,
  isNextRace,
  linkToRace,
  compactSummaryOnly = false,
}: RaceScoreCardHeaderProps) {
  const countryCode = getCountryCodeForRace({ slug: data.raceSlug });
  const sessions = getSessionsForWeekend(data.hasSprint);
  const showStatusBadge =
    cardState !== 'fully_scored' &&
    cardState !== 'partially_scored' &&
    cardState !== 'missed_with_results';

  const innerContent = (
    <>
      {countryCode && (
        <span className="shrink-0">
          <RaceFlag countryCode={countryCode} />
        </span>
      )}
      <div className="min-w-0 flex-1">
        <div className="mb-0.5 flex flex-wrap items-center gap-2">
          <span className="text-sm text-text-muted">
            Round {data.raceRound}
          </span>
          {showStatusBadge && (
            <StatusBadge status={data.raceStatus} isNext={isNextRace} />
          )}
          {data.hasSprint && <Badge variant="sprint">SPRINT</Badge>}
        </div>
        <h3 className="line-clamp-2 text-lg leading-snug font-semibold text-text">
          {data.raceName}
        </h3>
        <div className="mt-1.5 flex flex-col gap-1 sm:flex-row sm:gap-4">
          <WeekendSummaryLine
            data={data}
            sessions={sessions}
            cardState={cardState}
          />
        </div>
        {data.raceRank && (
          <span className="mt-1 text-xs text-text-muted">
            {ordinal(data.raceRank.position)} of {data.raceRank.totalPlayers}{' '}
            this weekend
          </span>
        )}
      </div>
    </>
  );

  let headerElement: ReactNode;
  if (variant === 'compact' && linkToRace) {
    headerElement = (
      <Link
        to="/races/$raceSlug"
        params={{ raceSlug: data.raceSlug }}
        className="flex min-w-0 flex-1 items-start gap-3 sm:items-center"
      >
        {innerContent}
      </Link>
    );
  } else {
    headerElement = (
      <div className="flex min-w-0 flex-1 items-start gap-3 sm:items-center">
        {innerContent}
      </div>
    );
  }

  return (
    <div
      className={`flex gap-4 p-4 transition-colors hover:bg-surface-hover ${
        variant === 'compact' && compactSummaryOnly
          ? 'items-center justify-between'
          : 'flex-col sm:flex-row sm:items-center sm:justify-between'
      }`}
    >
      {headerElement}

      <div className="ml-auto flex shrink-0 flex-row items-center justify-end gap-3">
        <ScoreRing
          earned={data.totalPoints}
          max={data.maxPoints}
          {...(cardState !== 'partially_scored' &&
            cardState !== 'fully_scored' &&
            cardState !== 'missed_with_results' && { emptyLabel: '-' })}
        />
      </div>
    </div>
  );
}

function ordinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}
