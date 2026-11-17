import { Link } from '@tanstack/react-router';
import { ArrowRight } from 'lucide-react';
import type { CSSProperties, ReactNode } from 'react';

import { Button, primaryButtonStyles } from '@/components/Button/Button';
import { WeatherIcon } from '@/components/weather/WeatherIcon';
import { WeatherTimeToggle } from '@/components/weather/WeatherTimeToggle';
import { captureAnalyticsEvent } from '@/lib/analytics';
import { getCircuitLap } from '@/lib/circuitLaps';
import { getCircuitForRace } from '@grandprixpicks/shared/circuits';
import { formatTimeZoneAbbreviation } from '@/lib/date';
import { getRaceWriteup } from '@/lib/raceWriteups';
import { useSessionTimeView } from '@/lib/sessionTimeView';
import { readableTeamFill, TEAM_COLORS } from '@/lib/teamColors';
import {
  buildWeatherSessions,
  sessionWeatherLine,
  summarizeSessionWindow,
  temperatureFigure,
  weatherWord,
  type RaceWeather,
} from '@/lib/weatherPresentation';

import {
  accessibleSegment,
  IMMINENT_MS,
  segmentsFor,
  unitWord,
} from './countdown';

/**
 * The landing hero: the race weekend as the page's one visual event.
 *
 * This is the display register (see `docs/design-display-register.md`), the
 * one place outside social cards where the product's quiet timing-sheet rules
 * are deliberately broken: black-weight display type, team colour as a fill,
 * a lap outline that draws itself in. Everything a visitor would otherwise go
 * looking for sits inside it: which race, when the picks lock, when each
 * session runs in their time, what the weather will do, and what the paddock
 * is talking about.
 *
 * Between seasons there is no race to show, so it falls back to the bare
 * product line and the calendar.
 */

export type LandingHeroRace = {
  name: string;
  slug: string;
  round: number;
  hasSprint?: boolean;
  fp1StartAt?: number;
  fp2StartAt?: number;
  fp3StartAt?: number;
  sprintQualiStartAt?: number;
  sprintStartAt?: number;
  qualiStartAt?: number;
  raceStartAt: number;
};

/** As `home.getHomePageData` projects it through `loadNewsHeadlines`. */
export type LandingNews = {
  total: number;
  items: readonly {
    key: string;
    headline: string;
    sourceName: string;
    driverCodes: readonly string[];
    /** Set only when every driver the story names drives for this team. */
    team: string | null;
  }[];
};

type ScheduleRow = {
  key: string;
  label: string;
  startAt: number | undefined;
  /** Whether picks are scored in this session. Practice is not. */
  scored: boolean;
};

function scheduleRows(race: LandingHeroRace): ScheduleRow[] {
  return race.hasSprint
    ? [
        {
          key: 'fp1',
          label: 'Practice 1',
          startAt: race.fp1StartAt,
          scored: false,
        },
        {
          key: 'sprint_quali',
          label: 'Sprint Qualifying',
          startAt: race.sprintQualiStartAt,
          scored: true,
        },
        {
          key: 'sprint',
          label: 'Sprint',
          startAt: race.sprintStartAt,
          scored: true,
        },
        {
          key: 'quali',
          label: 'Qualifying',
          startAt: race.qualiStartAt,
          scored: true,
        },
        {
          key: 'race',
          label: 'Grand Prix',
          startAt: race.raceStartAt,
          scored: true,
        },
      ]
    : [
        {
          key: 'fp1',
          label: 'Practice 1',
          startAt: race.fp1StartAt,
          scored: false,
        },
        {
          key: 'fp2',
          label: 'Practice 2',
          startAt: race.fp2StartAt,
          scored: false,
        },
        {
          key: 'fp3',
          label: 'Practice 3',
          startAt: race.fp3StartAt,
          scored: false,
        },
        {
          key: 'quali',
          label: 'Qualifying',
          startAt: race.qualiStartAt,
          scored: true,
        },
        {
          key: 'race',
          label: 'Grand Prix',
          startAt: race.raceStartAt,
          scored: true,
        },
      ];
}

/** "Las Vegas Grand Prix" → ["Las Vegas", "Grand Prix"]. */
export function splitRaceName(name: string): [string, string | null] {
  const match = /^(.*\S)\s+(Grand Prix)$/.exec(name);
  return match ? [match[1]!, match[2]!] : [name, null];
}

function dayAndTime(timestamp: number, timeZone: string) {
  const parts = new Intl.DateTimeFormat('en-GB', {
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone,
  }).formatToParts(timestamp);
  function part(type: Intl.DateTimeFormatPartTypes) {
    return parts.find((entry) => entry.type === type)?.value ?? '';
  }
  return { day: part('weekday'), time: `${part('hour')}:${part('minute')}` };
}

export function LandingHero({
  race,
  lockSession,
  now,
  weather,
  news,
  cta,
}: {
  race: LandingHeroRace | null;
  /** The next session whose picks lock, or null when none is left. */
  lockSession: { label: string; startAt: number } | null;
  now: number;
  weather: RaceWeather | null;
  news: LandingNews | null;
  cta: ReactNode;
}) {
  if (!race) {
    return (
      <section
        className="border-b border-border px-4 pt-10 pb-12"
        aria-labelledby="landing-hero-title"
      >
        <div className="mx-auto w-full max-w-(--page-max)">
          <h1
            id="landing-hero-title"
            className="gpp-display max-w-3xl text-text"
          >
            Predict the F1 Top 5
          </h1>
          <div className="mt-8">{cta}</div>
        </div>
      </section>
    );
  }

  const circuit = getCircuitForRace(race.slug);
  const lap = getCircuitLap(circuit?.slug);
  const [place, suffix] = splitRaceName(race.name);
  const writeup = getRaceWriteup(race.slug);
  const items = writeup ? (news?.items ?? []) : [];

  return (
    <section
      className="relative overflow-hidden border-b border-border"
      aria-labelledby="landing-hero-title"
    >
      <div className="mx-auto grid w-full max-w-(--page-max) px-4 pt-6 sm:pt-7 lg:grid-cols-[minmax(0,1fr)_minmax(0,25rem)] lg:gap-x-12 lg:[grid-template-areas:'title_news'_'board_board']">
        <div className="relative min-w-0 lg:[grid-area:title]">
          {lap ? <HeroLap lap={lap} /> : null}

          <div className="relative">
            <p className="gpp-mono text-xs text-text-muted">
              <span className="text-text">Round {race.round}</span>
              {circuit ? <> · {circuit.name}</> : null}
            </p>

            {/*
             * One sentence to a screen reader and a search engine: "Predict
             * the F1 Top 5 at the Las Vegas Grand Prix". The spaces between the
             * block spans are load-bearing for the same reason: without them
             * the text content runs the words together.
             */}
            <h1 id="landing-hero-title" className="mt-4 text-text">
              <span className="block text-lg leading-tight font-normal text-text-muted sm:text-2xl">
                Predict the F1 Top 5 at the
              </span>{' '}
              <span className="gpp-display mt-2 block sm:mt-3">{place}</span>
              {suffix ? (
                <>
                  {' '}
                  <span className="gpp-display gpp-display-light mt-[0.12em] block text-text-muted">
                    {suffix}
                  </span>
                </>
              ) : null}
            </h1>

            {lockSession ? (
              <HeroCountdown
                label={lockSession.label}
                lockAt={lockSession.startAt}
                now={now}
                trackTimeZone={circuit?.timeZone ?? 'UTC'}
              />
            ) : null}

            <div className="mt-5 pb-6 sm:mt-6 sm:pb-7">{cta}</div>
          </div>
        </div>

        <HeroSchedule
          race={race}
          lockAt={lockSession?.startAt ?? null}
          now={now}
          weather={weather}
          trackTimeZone={circuit?.timeZone ?? 'UTC'}
          locality={circuit?.locality ?? null}
        />

        {writeup && items.length > 0 ? (
          <HeroNews
            place={place}
            raceSlug={race.slug}
            writeupTo={writeup.to}
            total={news?.total ?? items.length}
            items={items}
          />
        ) : null}
      </div>
    </section>
  );
}

/**
 * The lap, behind the race name. It draws in once, a single car runs it
 * once, and then it is still: a poster, not a screensaver.
 */
function HeroLap({
  lap,
}: {
  lap: NonNullable<ReturnType<typeof getCircuitLap>>;
}) {
  return (
    <svg
      className="gpp-hero-lap"
      viewBox={`-30 -30 ${lap.width + 60} ${lap.height + 60}`}
      aria-hidden="true"
      focusable="false"
    >
      <path className="gpp-hero-lap-asphalt" d={lap.d} />
      <path className="gpp-hero-lap-line" d={lap.d} pathLength={1000} />
      <path className="gpp-hero-lap-car" d={lap.d} pathLength={1000} />
    </svg>
  );
}

function HeroCountdown({
  label,
  lockAt,
  now,
  trackTimeZone,
}: {
  label: string;
  lockAt: number;
  now: number;
  trackTimeZone: string;
}) {
  const { activeTimeZone, showViewerTime } = useSessionTimeView(trackTimeZone);
  const msRemaining = lockAt - now;
  const segments = segmentsFor(msRemaining);
  const imminent = msRemaining < IMMINENT_MS;
  const { day, time } = dayAndTime(lockAt, activeTimeZone);
  const zone = showViewerTime
    ? formatTimeZoneAbbreviation(lockAt, activeTimeZone)
    : 'track time';
  const spoken = imminent
    ? 'under a minute'
    : segments.map(accessibleSegment).join(', ');

  return (
    <div className="mt-5 flex flex-wrap items-end gap-x-7 gap-y-2 sm:mt-6">
      <p
        className="text-sm text-text-muted sm:min-w-[12.5rem] sm:pb-1.5 sm:text-base"
        aria-hidden="true"
      >
        <span className="block font-semibold text-text">
          {label} picks lock in
        </span>
        <span className="gpp-mono">
          {day} {time}
          {zone ? ` ${zone}` : null}
        </span>
      </p>
      {/* The label and digits are for the eye; this sentence is what is
          announced, once. */}
      <p className="sr-only">
        {label} picks lock in {spoken}, at {day} {time}
        {zone ? ` ${zone}` : null}.
      </p>
      <p className="flex items-start gap-4 sm:gap-5" aria-hidden="true">
        {imminent ? (
          <span className="gpp-hero-digits">Locking</span>
        ) : (
          segments.map((segment) => (
            <span key={segment.unit} className="flex flex-col">
              <span className="gpp-hero-digits">
                {String(segment.value).padStart(2, '0')}
              </span>
              <span className="mt-1 text-xs text-text-muted">
                {unitWord(segment)}
              </span>
            </span>
          ))
        )}
      </p>
    </div>
  );
}

function HeroSchedule({
  race,
  lockAt,
  now,
  weather,
  trackTimeZone,
  locality,
}: {
  race: LandingHeroRace;
  lockAt: number | null;
  now: number;
  weather: RaceWeather | null;
  trackTimeZone: string;
  locality: string | null;
}) {
  const {
    activeTimeZone,
    showViewerTime,
    setInViewerTime,
    showToggle,
    viewerZone,
  } = useSessionTimeView(trackTimeZone);
  const firstStartAt = race.fp1StartAt ?? race.raceStartAt;
  const zoneLabel = showViewerTime
    ? `Your time, ${formatTimeZoneAbbreviation(firstStartAt, viewerZone!) ?? 'local'}`
    : locality
      ? `${locality} time`
      : 'Track time';
  const forecast = weather?.forecast ?? null;
  // Each session's window, so a running session reads as live rather than
  // done, and a forecast can be matched to it.
  const sessionWindows = buildWeatherSessions(race);

  return (
    <section
      aria-label={forecast ? 'Schedule and weather' : 'Weekend schedule'}
      className="relative -mx-4 border-t border-border bg-page px-4 lg:mx-0 lg:px-0 lg:[grid-area:board]"
    >
      <div className="grid grid-cols-1 sm:grid-cols-5 lg:grid-cols-[12.5rem_repeat(5,minmax(0,1fr))]">
        {/* The column head: what the times below are in, and the control
            that changes it. Pinned label and toggle, so a zone with a longer
            name cannot slide the toggle under the cursor. */}
        <div className="flex items-center justify-between gap-3 border-b border-border py-3 sm:col-span-5 lg:col-span-1 lg:flex-col lg:items-start lg:justify-center lg:border-r lg:border-b-0 lg:py-4 lg:pr-4">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-text">{zoneLabel}</p>
            {forecast ? (
              <p className="mt-0.5 text-xs text-text-muted">
                Forecast:{' '}
                <a
                  href={weather!.attribution.url}
                  className="underline decoration-border-strong underline-offset-2 hover:text-text"
                  rel="noreferrer"
                  target="_blank"
                >
                  {weather!.attribution.name}
                </a>
                {weather!.isStale ? ' (last available)' : null}
              </p>
            ) : null}
          </div>
          {showToggle ? (
            <WeatherTimeToggle
              showViewerTime={showViewerTime}
              onTimeViewChange={setInViewerTime}
            />
          ) : null}
        </div>

        <ol className="contents">
          {scheduleRows(race).map((row) => {
            const isLock = row.startAt !== undefined && row.startAt === lockAt;
            const session = sessionWindows.find(
              (candidate) => candidate.startsAt === row.startAt,
            );
            const started = row.startAt !== undefined && row.startAt <= now;
            const past = started && (!session || session.endsAt <= now);
            const live = started && !past;
            const summary =
              forecast && session && !past
                ? summarizeSessionWindow(forecast, session)
                : null;
            const when =
              row.startAt === undefined
                ? null
                : dayAndTime(row.startAt, activeTimeZone);
            return (
              <li
                key={row.key}
                className={`gpp-hero-session relative grid grid-cols-[minmax(0,1fr)_auto_5.75rem] items-center gap-x-4 border-b border-border py-2.5 last:border-b-0 sm:block sm:border-r sm:border-b-0 sm:px-3 sm:py-4 sm:last:border-r-0 lg:px-4 ${
                  row.scored && !started
                    ? isLock
                      ? 'gpp-hero-session-lock'
                      : 'gpp-hero-session-scored'
                    : ''
                } ${past ? 'opacity-50' : ''}`}
              >
                <p className="flex flex-col items-start gap-1 text-xs text-text-muted sm:flex-row sm:items-center sm:justify-between">
                  <span className="text-sm font-medium text-text sm:text-xs">
                    {row.label}
                  </span>
                  {isLock ? (
                    <span className="gpp-mono rounded-xs bg-accent px-1.5 text-[0.6875rem] text-text-on-accent">
                      Next lock
                    </span>
                  ) : live ? (
                    <span className="gpp-mono rounded-xs bg-text px-1.5 text-[0.6875rem] text-page">
                      Live
                    </span>
                  ) : row.scored && !started ? (
                    <span className="gpp-mono rounded-xs bg-surface-elevated px-1.5 text-[0.6875rem] text-text-muted">
                      Picks
                    </span>
                  ) : null}
                  {past ? <span className="sr-only">Has run</span> : null}
                </p>
                <p className="gpp-mono flex items-baseline gap-2 whitespace-nowrap sm:mt-2">
                  {when ? (
                    <>
                      <span className="w-[3ch] text-sm text-text-muted">
                        {when.day}
                      </span>
                      <span
                        className={`text-xl leading-none font-semibold tracking-tight sm:text-[1.75rem] lg:text-[2rem] ${
                          row.scored ? 'text-text' : 'text-text-muted'
                        }`}
                      >
                        {when.time}
                      </span>
                    </>
                  ) : (
                    <span className="text-sm text-text-muted">TBC</span>
                  )}
                </p>
                {summary ? (
                  <p className="flex items-center justify-end gap-2 text-sm text-text sm:mt-2.5 sm:justify-start">
                    <WeatherIcon
                      conditionCode={summary.conditionCode}
                      className="h-4 w-4 shrink-0 text-text-muted"
                    />
                    <span className="sr-only">
                      {sessionWeatherLine(summary)}
                    </span>
                    <span aria-hidden="true">{weatherWord(summary)}</span>
                    <span className="gpp-mono" aria-hidden="true">
                      {temperatureFigure(Math.round(summary.temperatureC))}
                    </span>
                  </p>
                ) : (
                  // Holds the row's height, so a forecast arriving for one
                  // session does not make the board taller than the others.
                  <p
                    className="hidden h-5 sm:mt-2.5 sm:block"
                    aria-hidden="true"
                  />
                )}
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}

/**
 * The weekend's news, a band each. A story about one team wears that team's
 * colour as its field; a story about the tyres or the venue stays on the page
 * surface. The text lives on the write-up, so each band links into its card.
 */
function HeroNews({
  place,
  raceSlug,
  writeupTo,
  total,
  items,
}: {
  place: string;
  raceSlug: string;
  writeupTo: string;
  total: number;
  items: LandingNews['items'];
}) {
  function track(target: string) {
    captureAnalyticsEvent('landing_news_clicked', {
      race_slug: raceSlug,
      target,
    });
  }

  return (
    <section
      aria-labelledby="landing-hero-news"
      className="relative pb-8 lg:pb-6 lg:[grid-area:news]"
    >
      <div className="mt-8 mb-2.5 flex items-baseline justify-between gap-4 lg:mt-0">
        <h2
          id="landing-hero-news"
          className="gpp-mono text-xs font-medium text-text-muted"
        >
          {place} news
        </h2>
        <Link
          to={writeupTo}
          hash="weekend-news"
          className="gpp-mono text-xs text-text underline decoration-border-strong underline-offset-4 hover:text-accent hover:decoration-accent"
          onClick={() => track('writeup')}
        >
          {total === 1 ? 'Read the story' : `All ${total} stories`}
        </Link>
      </div>
      <ol className="grid gap-1">
        {items.map((item, index) => {
          const fill = item.team ? TEAM_COLORS[item.team] : undefined;
          const readable = fill ? readableTeamFill(fill) : null;
          const style = readable
            ? ({
                '--band-fill': readable.fill,
                '--band-ink': readable.ink,
                animationDelay: `${120 + index * 50}ms`,
              } as CSSProperties)
            : ({ animationDelay: `${120 + index * 50}ms` } as CSSProperties);
          const eyebrow = [item.driverCodes.slice(0, 3).join(' '), item.team]
            .filter(Boolean)
            .join(' · ');
          return (
            <li
              key={item.key}
              className="gpp-hero-band max-sm:[&:nth-child(n+4)]:hidden"
              style={style}
            >
              <Link
                to={writeupTo}
                hash={`news-${item.key}`}
                className={`gpp-hero-band-link flex flex-col justify-center px-4 py-3 ${
                  fill ? 'gpp-hero-band-team' : 'bg-surface-elevated text-text'
                }`}
                onClick={() => track('headline')}
              >
                {/* Who the story is about, when it names anyone. A story
                    about the tyres or the venue has no line here rather than
                    an empty cell. */}
                {eyebrow ? (
                  <span className="gpp-mono mb-1 text-xs font-semibold tracking-wide opacity-80">
                    {eyebrow}
                  </span>
                ) : null}
                <span className="text-[0.9375rem] leading-snug font-semibold text-pretty">
                  {item.headline}
                </span>
                <span className="gpp-mono mt-1 text-xs opacity-75">
                  {item.sourceName}
                </span>
              </Link>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

/** Scrolls to the embedded picker. Present on desktop too, since the picker sits below the fold on short viewports. */
export function ScrollToPicksCta({ targetId }: { targetId: string }) {
  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
      <a
        href={`#${targetId}`}
        className={`${primaryButtonStyles('md')} max-sm:w-full max-sm:justify-center`}
        // Suppresses the duplicate CTA in the app header while this page owns
        // the action (see `.gpp-public-header-cta` in styles.css). The header
        // button takes it back the moment this scrolls away.
        data-landing-hero-cta="true"
        onClick={() =>
          captureAnalyticsEvent('landing_hero_cta_clicked', {
            placement: 'hero',
          })
        }
      >
        Make your picks
        <ArrowRight size={20} aria-hidden="true" />
      </a>
    </div>
  );
}

/**
 * Between seasons there is no session to lock and no picker to embed, so the
 * hero points at the calendar instead of a deadline that does not exist.
 */
export function BrowseRacesCta() {
  return (
    <Button asChild variant="primary" size="md" rightIcon={ArrowRight}>
      <Link to="/races">See the race calendar</Link>
    </Button>
  );
}
