import { Link } from '@tanstack/react-router';
import { ArrowRight, Calendar } from 'lucide-react';

import type { Doc } from '../../convex/_generated/dataModel';
import {
  formatDate,
  formatDateLong,
  formatTime,
  useCountdown,
} from '../lib/date';
import { Badge } from './Badge';
import { Flag } from './Flag';
import { PredictionCountdownBadge } from './PredictionCountdownBadge';

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
  size?: 'sm' | 'md' | 'lg' | 'full';
}) {
  const flagSize =
    size === 'full'
      ? 'full'
      : size === 'lg'
        ? 'xl'
        : size === 'sm'
          ? 'md'
          : 'lg';
  return <Flag code={countryCode} size={flagSize} />;
}

function getScheduleEntries(race: Race) {
  const entries: Array<{ label: string; startAt: number }> = [];
  if (race.hasSprint && race.sprintQualiStartAt) {
    entries.push({ label: 'Sprint Quali', startAt: race.sprintQualiStartAt });
  }
  if (race.hasSprint && race.sprintStartAt) {
    entries.push({ label: 'Sprint', startAt: race.sprintStartAt });
  }
  if (race.qualiStartAt) {
    entries.push({ label: 'Quali', startAt: race.qualiStartAt });
  }
  entries.push({ label: 'Race', startAt: race.raceStartAt });
  return entries;
}

function Countdown({
  timestamp,
  suffix,
}: {
  timestamp: number;
  suffix: string;
}) {
  const label = useCountdown(timestamp);
  return (
    <>
      {label} {suffix}
    </>
  );
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
      className={`group flex h-full cursor-pointer flex-col rounded-xl border bg-surface p-2.5 transition-all duration-300 hover:scale-[1.02] hover:shadow-md focus-visible:scale-[1.02] focus-visible:shadow-md sm:p-3 ${
        isNext
          ? 'border-accent/50 hover:border-accent'
          : 'border-border hover:border-border-strong'
      }`}
    >
      <div className="relative flex-1">
        <div className="flex h-full flex-col gap-1">
          {/* Top row: flag, round, sprint | prediction badge */}
          <div className="flex flex-wrap items-center justify-between gap-x-1.5 gap-y-1">
            <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
              {countryCode && (
                <span className="inline-flex shrink-0 items-center">
                  <RaceFlag countryCode={countryCode} size="sm" />
                </span>
              )}
              <span className="shrink-0 text-xs font-medium text-text-muted">
                Round {race.round}
              </span>
              {race.hasSprint && <Badge variant="sprint">SPRINT</Badge>}
            </div>
            {(isPredictable || isNotYetOpen || race.status === 'locked') && (
              <div className="flex flex-wrap items-center justify-end gap-1.5">
                {isPredictable && (
                  <PredictionCountdownBadge
                    predictionLockAt={race.predictionLockAt}
                  />
                )}
                {isNotYetOpen && predictionOpenAt != null && (
                  <span className="inline-flex items-center rounded-full bg-surface-muted px-2 py-0.5 text-xs text-text-muted">
                    Opens {formatDateLong(predictionOpenAt)}
                  </span>
                )}
                {race.status === 'locked' && (
                  <span className="inline-flex items-center rounded-full bg-warning-muted px-2 py-0.5 text-xs font-medium text-warning tabular-nums">
                    {race.raceStartAt > Date.now() ? (
                      <Countdown
                        timestamp={race.raceStartAt}
                        suffix="until race"
                      />
                    ) : (
                      'Results pending'
                    )}
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Race name */}
          <h3 className="line-clamp-2 text-sm leading-tight font-semibold text-text sm:text-base">
            {race.name}
          </h3>

          {/* Session schedule */}
          <div className="flex flex-1 items-center">
            <div className="flex w-fit shrink-0 items-center gap-x-1.5">
              <span className="flex shrink-0 items-center justify-center">
                <Calendar size={14} className="text-text-muted" aria-hidden />
              </span>
              <div className="grid w-fit grid-cols-[auto_auto] items-baseline gap-x-1.5 gap-y-0.5 text-xs text-text-muted sm:text-sm">
                <span className="col-start-2 text-right text-xs text-text-muted/70">
                  {
                    Intl.DateTimeFormat(undefined, { timeZoneName: 'short' })
                      .formatToParts(Date.now())
                      .find((p) => p.type === 'timeZoneName')?.value
                  }
                </span>
                {getScheduleEntries(race).map((entry) => (
                  <div key={entry.label} className="contents">
                    <span className="font-medium">{entry.label}</span>
                    <span className="text-right tabular-nums">
                      {formatDate(entry.startAt)} · {formatTime(entry.startAt)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
        <ArrowRight
          size={14}
          strokeWidth={2}
          className="absolute right-0 bottom-0 text-text-muted transition-colors group-hover:text-text"
          aria-hidden
        />
      </div>
    </Link>
  );
}
