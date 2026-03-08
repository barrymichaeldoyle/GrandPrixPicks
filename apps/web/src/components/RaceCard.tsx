import type { Doc } from '@convex-generated/dataModel';
import { Link } from '@tanstack/react-router';
import { ArrowRight, Calendar } from 'lucide-react';

import {
  formatDate,
  formatDateLong,
  formatTime,
  useCountdown,
} from '../lib/date';
import {
  getLockStatusViewModel,
  getLockUrgencyBadgeClassName,
} from '../lib/lock';
import { Badge } from './Badge';
import { Flag } from './Flag';
import { PredictionCountdownBadge } from './PredictionCountdownBadge';

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
  className = '',
}: {
  countryCode: string;
  size?: 'sm' | 'md' | 'lg' | 'full';
  className?: string;
}) {
  const flagSize =
    size === 'full'
      ? 'full'
      : size === 'lg'
        ? 'xl'
        : size === 'sm'
          ? 'md'
          : 'lg';
  return <Flag code={countryCode} size={flagSize} className={className} />;
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

interface RaceCardProps {
  race: Race;
  isNext?: boolean;
  /** When predictions open (previous race start). Shown for "not yet open" races. */
  predictionOpenAt?: number | null;
}

function Countdown({
  timestamp,
  suffix,
}: {
  timestamp: number;
  suffix: string;
}) {
  const label = useCountdown(timestamp);
  return <span suppressHydrationWarning>{label} {suffix}</span>;
}

export function RaceCard({ race, isNext, predictionOpenAt }: RaceCardProps) {
  // Only the next upcoming race is open for predictions
  const isPredictable = race.status === 'upcoming' && isNext;
  const isNotYetOpen = race.status === 'upcoming' && !isNext;

  const countryCode = getCountryCodeForRace(race);
  const now = Date.now();
  const timezoneLabel = Intl.DateTimeFormat(undefined, {
    timeZoneName: 'short',
  })
    .formatToParts(Date.now())
    .find((p) => p.type === 'timeZoneName')?.value;
  const scheduleEntries = getScheduleEntries(race);
  const msUntilLock = race.predictionLockAt - now;
  const lockStatus = getLockStatusViewModel({
    msRemaining: msUntilLock,
  });

  return (
    <Link
      to="/races/$raceSlug"
      params={{ raceSlug: race.slug }}
      className={`group relative flex h-full cursor-pointer flex-col overflow-hidden rounded-xl border-[3px] bg-surface transition-[border-color,box-shadow] duration-200 hover:shadow-[0_0_0_1px_rgba(20,184,166,0.45),0_0_10px_3px_rgba(20,184,166,0.14),0_14px_30px_rgba(20,184,166,0.12)] focus-visible:shadow-[0_0_0_1px_rgba(20,184,166,0.55),0_0_12px_4px_rgba(20,184,166,0.18),0_16px_34px_rgba(20,184,166,0.14)] focus-visible:outline-none dark:hover:shadow-[0_0_0_1px_rgba(45,212,191,0.68),0_0_12px_4px_rgba(20,184,166,0.18),0_18px_36px_rgba(15,118,110,0.24)] dark:focus-visible:shadow-[0_0_0_1px_rgba(45,212,191,0.82),0_0_14px_5px_rgba(20,184,166,0.22),0_20px_40px_rgba(15,118,110,0.28)] ${
        isNext
          ? 'border-accent/70 hover:border-accent'
          : 'border-border hover:border-accent/70 focus-visible:border-accent/70'
      }`}
    >
      <div className="relative flex h-full flex-col">
        {/* Header: corner flag + round + race name */}
        <div
          className={`flex h-[58px] items-stretch overflow-hidden border-b-[3px] transition-colors ${
            isNext
              ? 'border-accent/70 group-hover:border-accent group-focus-visible:border-accent'
              : 'border-border group-hover:border-accent/70 group-focus-visible:border-accent/70'
          }`}
        >
          <div className="flex min-w-0 flex-1 items-stretch">
            {countryCode && (
              <span
                className={`inline-flex h-full shrink-0 overflow-hidden border-r-[3px] transition-colors ${
                  isNext
                    ? 'border-accent/70 group-hover:border-accent group-focus-visible:border-accent'
                    : 'border-border group-hover:border-accent/70 group-focus-visible:border-accent/70'
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
                Round {race.round}
              </p>
              <h3 className="line-clamp-2 text-sm leading-tight font-semibold text-text sm:text-base">
                {race.name}
              </h3>
            </div>
          </div>
          <span className="inline-flex shrink-0 items-center pr-3 pl-2">
            <ArrowRight
              size={14}
              strokeWidth={2}
              className="text-accent transition-colors group-hover:text-accent-hover group-focus-visible:text-accent-hover"
              aria-hidden
            />
          </span>
        </div>

        <div className="flex h-full flex-col gap-1.5 px-3 pt-2 pb-2.5">
          {/* Badges and status */}
          <div className="flex flex-wrap items-center gap-1">
            {race.status === 'finished' && (
              <Badge variant="finished">COMPLETED</Badge>
            )}
            {race.hasSprint && <Badge variant="sprint">SPRINT</Badge>}
            {isPredictable && (
              <span
                className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold ${getLockUrgencyBadgeClassName(lockStatus.badgeTone)} ${
                  lockStatus.shouldPulse ? 'animate-pulse' : ''
                }`}
              >
                {lockStatus.label}
              </span>
            )}
            {isNotYetOpen && predictionOpenAt != null && (
              <span
                className="bg-surface-elevated inline-flex items-center rounded-full border border-border-strong/70 px-2 py-0.5 text-xs font-medium text-text"
                suppressHydrationWarning
              >
                Opens {formatDateLong(predictionOpenAt)}
              </span>
            )}
            {isPredictable && (
              <PredictionCountdownBadge
                predictionLockAt={race.predictionLockAt}
                labelMode="lock"
              />
            )}
            {race.status === 'locked' && (
              <span className="inline-flex items-center rounded-full bg-warning-muted px-2 py-0.5 text-xs font-medium text-warning tabular-nums">
                {race.raceStartAt > now ? (
                  <Countdown timestamp={race.raceStartAt} suffix="until race" />
                ) : (
                  'Results pending'
                )}
              </span>
            )}
          </div>

          {/* Weekend sessions */}
          {scheduleEntries.length > 0 && (
            <div className="flex-1 pt-0.5">
              <div className="flex h-full flex-col rounded-lg border border-border/70 bg-surface-muted/35 p-1.5">
                <div className="mb-1 flex items-center justify-between text-[11px] font-medium tracking-wide text-text-muted uppercase">
                  <span className="inline-flex items-center gap-1">
                    <Calendar size={12} aria-hidden />
                    Weekend Sessions
                  </span>
                  {timezoneLabel ? (
                    <span suppressHydrationWarning>{timezoneLabel}</span>
                  ) : null}
                </div>
                <div className="grid flex-1 grid-cols-[auto_auto] content-end items-baseline gap-x-2 gap-y-1 text-sm text-text-muted">
                  {scheduleEntries.map((entry) => (
                    <div key={entry.label} className="contents">
                      <span
                        className={`font-medium ${
                          entry.label === 'Race' ? 'text-text' : ''
                        }`}
                      >
                        {entry.label}
                      </span>
                      <span
                        suppressHydrationWarning
                        className={`text-right tabular-nums ${
                          entry.label === 'Race'
                            ? 'font-semibold text-text'
                            : ''
                        }`}
                      >
                        {formatDate(entry.startAt)} · {formatTime(entry.startAt)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}
