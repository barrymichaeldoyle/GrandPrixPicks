import { Link } from '@tanstack/react-router';
import { ArrowRight, Calendar, Clock } from 'lucide-react';

import type { Doc } from '../../convex/_generated/dataModel';
import {
  formatDate,
  formatDateLong,
  formatTime,
  getTimeUntil,
} from '../lib/date';
import { Badge, StatusBadge } from './Badge';
import { Flag } from './Flag';

export { StatusBadge } from './Badge';

type Race = Doc<'races'>;

/** Map race slug prefix to ISO 3166-1 alpha-2 country code for flag images (flagcdn.com). */
const SLUG_TO_COUNTRY: Record<string, string> = {
  australia: 'au',
  australian: 'au',
  china: 'cn',
  chinese: 'cn',
  japan: 'jp',
  japanese: 'jp',
  bahrain: 'bh',
  'saudi-arabia': 'sa',
  'saudi-arabian': 'sa',
  saudi: 'sa',
  miami: 'us',
  canada: 'ca',
  monaco: 'mc',
  spain: 'es',
  madrid: 'es',
  austria: 'at',
  britain: 'gb',
  belgium: 'be',
  hungary: 'hu',
  netherlands: 'nl',
  italy: 'it',
  'emilia-romagna': 'it',
  imola: 'it',
  singapore: 'sg',
  usa: 'us',
  'united-states': 'us',
  mexico: 'mx',
  brazil: 'br',
  qatar: 'qa',
  'abu-dhabi': 'ae',
  uae: 'ae',
  portugal: 'pt',
  'las-vegas': 'us',
  azerbaijan: 'az',
};

export function getCountryCodeForRace(race: { slug: string }): string | null {
  const key = race.slug.replace(/-\d{4}$/, '').toLowerCase();
  return SLUG_TO_COUNTRY[key] ?? null;
}

export function RaceFlag({
  countryCode,
  size = 'md',
}: {
  countryCode: string;
  size?: 'md' | 'lg';
}) {
  return <Flag code={countryCode} size={size === 'lg' ? 'xl' : 'lg'} />;
}

interface RaceCardProps {
  race: Race;
  isNext?: boolean;
  /** When predictions open (previous race start). Shown for "not yet open" races. */
  predictionOpenAt?: number | null;
}

export function RaceCard({ race, isNext, predictionOpenAt }: RaceCardProps) {
  // Only the next upcoming race is open for predictions
  const isPredictable = race.status === 'upcoming' && isNext;
  const isNotYetOpen = race.status === 'upcoming' && !isNext;

  const countryCode = getCountryCodeForRace(race);

  return (
    <Link
      to="/races/$raceId"
      params={{ raceId: race._id }}
      className={`group block cursor-pointer rounded-xl border bg-surface p-4 transition-all duration-300 hover:scale-[1.02] hover:shadow-md focus-visible:scale-[1.02] focus-visible:shadow-md sm:p-5 ${
        isNext
          ? 'border-accent/50 hover:border-accent'
          : 'border-border hover:border-border-strong'
      }`}
    >
      <div className="flex items-stretch gap-3 sm:gap-4">
        <div className="min-w-0 flex-1 space-y-2">
          {/* Top row: flag + round on the left, status on the right */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
              {countryCode && (
                <span className="inline-flex shrink-0 items-center">
                  <RaceFlag countryCode={countryCode} />
                </span>
              )}
              <span className="shrink-0 text-sm font-medium text-text-muted">
                Round {race.round}
              </span>
              {isNext && <Badge variant="next">NEXT UP</Badge>}
              {race.hasSprint && <Badge variant="sprint">SPRINT</Badge>}
            </div>
            {!(race.status === 'upcoming' && isNext) && (
              <StatusBadge status={race.status} isNext={isNext} />
            )}
          </div>

          {/* Race name */}
          <h3 className="line-clamp-2 text-lg font-semibold text-text sm:text-xl">
            {race.name}
          </h3>

          {/* Date and time */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm text-text-muted">
            <span className="inline-flex items-center gap-1.5">
              <Calendar size={16} className="shrink-0 text-text-muted" />
              {formatDate(race.raceStartAt)}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Clock size={16} className="shrink-0 text-text-muted" />
              {formatTime(race.raceStartAt)}
            </span>
          </div>

          {/* Contextual status strip */}
          {(isPredictable || isNotYetOpen || race.status === 'locked') && (
            <div className="mt-1 flex flex-wrap items-center gap-2">
              {isPredictable && (
                <span className="inline-flex items-center rounded-full bg-accent-muted px-3 py-1 text-xs font-medium text-accent">
                  {getTimeUntil(race.predictionLockAt)} to predict
                </span>
              )}
              {isNotYetOpen && predictionOpenAt != null && (
                <span className="inline-flex items-center rounded-full bg-surface-muted px-3 py-1 text-xs text-text-muted">
                  Opens {formatDateLong(predictionOpenAt)}
                </span>
              )}
              {race.status === 'locked' && (
                <span className="inline-flex items-center rounded-full bg-warning-muted px-3 py-1 text-xs font-medium text-warning">
                  {race.raceStartAt > Date.now()
                    ? `Race in ${getTimeUntil(race.raceStartAt)}`
                    : 'Results pending'}
                </span>
              )}
            </div>
          )}
        </div>
        <div className="flex w-0 shrink-0 items-center overflow-visible">
          <ArrowRight
            size={18}
            strokeWidth={2}
            className="shrink-0 -translate-x-1 text-text-muted transition-colors group-hover:text-text"
            aria-hidden
          />
        </div>
      </div>
    </Link>
  );
}
