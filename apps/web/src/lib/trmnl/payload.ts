import type { Doc } from '@convex-generated/dataModel';
import { getCircuitForRace } from '@grandprixpicks/shared/circuits';
import { getCountryCodeForRaceSlug } from '@grandprixpicks/shared/raceCountries';

import { getRaceWriteup } from '@/lib/raceWriteups';
import { PRACTICE_LABELS } from '@/lib/raceSessions';
import type { SessionType } from '@/lib/sessions';
import {
  getSessionsForWeekend,
  SESSION_LABELS_FULL,
  SESSION_LABELS_SHORT,
} from '@/lib/sessions';
import { siteConfig } from '@/lib/site';
import type {
  MeasurementUnits,
  WeatherForecast,
} from '@/lib/weatherPresentation';
import {
  buildWeatherSessions,
  conditionLabel,
  normalizeConditionCode,
  sessionWeatherLine,
  summarizeSessionWindow,
  temperatureFigure,
  windFigure,
} from '@/lib/weatherPresentation';

/**
 * The JSON a TRMNL e-ink display polls. The screen itself is Liquid kept in
 * `apps/trmnl/src`; everything that depends on the clock is decided here.
 *
 * One rule shapes every field: **a screen has to stay true for as long as it
 * sits on the device**, and we never learn how long that is. On-demand refresh
 * fetches this just before a redraw, but the image then stays up until the
 * device's next wake, which is an hour or more on a battery-friendly
 * playlist. So:
 *
 * - Session times are local clock times ("Sat 16:00"), never countdowns. A
 *   countdown is wrong a minute after it is drawn; a clock time is right all
 *   weekend.
 * - Nothing in the payload moves with the clock except at a real boundary (a
 *   session starting, a result landing). TRMNL skips the redraw when
 *   the payload is unchanged, and a redraw costs about five times the battery
 *   of a wake without one. A ticking field would redraw every time and buy
 *   nothing.
 *
 * The plugin is public and viewer-free, and reads as an F1 weekend screen:
 * sessions, results, grid and news. It says nothing about picks. The QR code
 * is how a reader reaches the site: the weekend's write-up when there is one,
 * otherwise the race page, and both carry the picks CTA.
 *
 * Keys are snake_case and at the root because that is what Liquid reads
 * without a prefix. The shape is versioned (`v`) because installed copies of a
 * published plugin update their markup when we publish, not when we deploy.
 */
const TRMNL_PAYLOAD_VERSION = 2;

/**
 * How long a finished race keeps the screen before it moves on to the next
 * round. Long enough that a Sunday result is still there on Monday morning.
 */
export const TRMNL_RESULT_HOLD_MS = 36 * 60 * 60 * 1000;

const NEWS_LIMIT = 20;
/**
 * Result rows the payload carries per session. The race and the sprint go to
 * ten, the points places a fan reads; the qualifying top five is the pick
 * game's own measure. Each layout shows as many as it has room for.
 */
const RESULT_ROWS: Record<SessionType, number> = {
  race: 10,
  sprint: 10,
  quali: 5,
  sprint_quali: 5,
};
/** Beyond this, a weekday alone is ambiguous, so the date is added. */
const WEEKDAY_ONLY_WITHIN_MS = 6 * 24 * 60 * 60 * 1000;
/** The race pages' cut-off too (`sessionWeatherLine` in weatherPresentation). */
const RAIN_WORTH_MENTIONING = 20;
/**
 * Practice results are polled from OpenF1 and land within an hour or two, but
 * nothing guarantees they land at all. Past this, a practice row stops saying
 * it is waiting, so a failed poll cannot leave "Awaiting result" on the wall
 * until Monday.
 */
const PRACTICE_RESULT_WAIT_MS = 6 * 60 * 60 * 1000;

/**
 * Where the weekend is, as the QR code's `utm_content`, so PostHog can say
 * which screen gets scanned. It changes only at the same boundaries as the
 * rest of the payload.
 */
type TrmnlPhase = 'build_up' | 'weekend' | 'result';

type RaceForTrmnl = Pick<
  Doc<'races'>,
  | '_id'
  | 'slug'
  | 'name'
  | 'round'
  | 'season'
  | 'status'
  | 'hasSprint'
  | 'fp1StartAt'
  | 'fp2StartAt'
  | 'fp3StartAt'
  | 'sprintQualiStartAt'
  | 'sprintQualiLockAt'
  | 'sprintStartAt'
  | 'sprintLockAt'
  | 'qualiStartAt'
  | 'qualiLockAt'
  | 'raceStartAt'
  | 'predictionLockAt'
>;

type ResultRow = { position: number; code: string; displayName: string };

type NewsItem = {
  headline: string;
  publishedAt: number;
  startingGrid?: {
    position: number;
    code: string;
    displayName: string;
    note?: string;
  }[];
};

/**
 * The season's championship tables. Shaped like
 * `f1Standings.getF1Championship`, of which this is a subset.
 */
type ChampionshipInput = {
  season: number;
  roundsScored: number;
  roundsTotal: number;
  drivers: {
    position: number;
    code: string;
    displayName: string;
    points: number;
  }[];
  constructors: { position: number; team: string; points: number }[];
};

type PracticeSummary = {
  sessionType: keyof typeof PRACTICE_LABELS;
  topThree: ResultRow[];
};

export type TrmnlInput = {
  now: number;
  timeZone: string | null;
  locale: string | null;
  units?: MeasurementUnits;
  race: RaceForTrmnl | null;
  news: NewsItem[];
  results: Partial<Record<SessionType, ResultRow[]>>;
  practice: PracticeSummary[];
  weather: { isStale: boolean; forecast: WeatherForecast } | null;
  /**
   * The season's championship. With no race, the season just run, shown
   * through the off-season (its `news` is then the site's race-independent
   * news). With a race, it fills the build-up's news column until the first
   * headline.
   */
  standings?: ChampionshipInput | null;
};

/** One session's forecast, compact enough for a row of the timeline. */
type SessionWeather = {
  /** One of TRMNL's own weather icons, served from trmnl.com. */
  icon: string;
  /** "24°C" or "75°F". */
  temp: string;
  /** "60%", or empty when rain is unlikely enough not to mention. */
  rain: string;
  /** Session-total precipitation in the selected units, or "Dry". */
  rainAmount: string;
  /** "NE 16 km/h" or "NE 10 mph" (`windFigure`). */
  wind: string;
  /** Short condition label, shown beside the icon in the full layout. */
  condition: string;
  /**
   * The forecast summary for the lead. Sustained wind is separate so the
   * template can pair it with a wind icon; notable gusts remain in this text.
   */
  text: string;
};

type ScheduleRow = {
  key: string;
  label: string;
  short: string;
  when: string;
  /** Split weekday and clock fields for aligned full-screen schedule columns. */
  weekday: string;
  time: string;
  /**
   * `done` has a result and `awaiting` has started without one. `no_result`
   * is a practice session whose result never arrived.
   */
  state: 'upcoming' | 'awaiting' | 'done' | 'no_result';
  /**
   * The first session that has not started, so the timeline can mark where
   * the weekend is. It moves only when a session starts.
   */
  next: boolean;
  top3: string[];
  /** Null once the session is out of the forecast window, or it is stale. */
  weather: SessionWeather | null;
};

export type TrmnlPayload = {
  v: number;
  has_race: boolean;
  race: {
    name: string;
    short_name: string;
    /** Full circuit name, e.g. "Autodromo Nazionale Monza". */
    circuit: string | null;
    /**
     * The race's flag. Follows race identity, not the circuit: the 2026
     * Bahrain round runs at Sepang and still flies Bahrain's flag.
     */
    flag_url: string | null;
    round: number;
    season: number;
    dates: string;
    url: string;
  } | null;
  lead: {
    label: string;
    value: string;
    /** The lead session's own forecast, for layouts without a timeline. */
    weather: SessionWeather | null;
  } | null;
  schedule: ScheduleRow[];
  /** Which block the larger layouts give their spare space to. */
  focus: 'result' | 'grid' | 'news' | 'standings' | 'schedule';
  result: {
    label: string;
    rows: { pos: number; code: string; name: string }[];
  } | null;
  grid: { pos: number; code: string; name: string; note: string }[];
  news: { headline: string }[];
  /**
   * The off-season screen when `has_race` is false. With a race, set only
   * when `focus` is "standings".
   */
  standings: {
    /** The season heading shown on the off-season screen. */
    title: string;
    /** "After 23 rounds", or "After round 16 of 23". */
    detail: string;
    /** "2026 champion", or "Championship leader" while rounds remain. */
    leader_label: string;
    drivers: { pos: number; code: string; name: string; points: number }[];
    constructors: { pos: number; name: string; points: number }[];
    url: string;
  } | null;
};

/**
 * The weekend a display should be showing.
 *
 * The finished race holds the screen for {@link TRMNL_RESULT_HOLD_MS} after
 * lights out, then the next round takes over. Deliberately not
 * `races.getQuickPickRace`: that one keeps a locked weekend for 72 hours
 * because the picks UI needs it, but drops a race the moment it is marked
 * finished, which is exactly when a wall display wants to show it.
 */
export function selectTrmnlRace<T extends RaceForTrmnl>(
  races: T[],
  now: number,
): T | null {
  const live = races.filter((race) => race.status !== 'cancelled');
  const justRun = live
    .filter(
      (race) =>
        race.raceStartAt <= now &&
        now < race.raceStartAt + TRMNL_RESULT_HOLD_MS,
    )
    .sort((a, b) => b.raceStartAt - a.raceStartAt)[0];
  if (justRun) {
    return justRun;
  }
  return (
    live
      .filter((race) => race.raceStartAt > now)
      .sort((a, b) => a.raceStartAt - b.raceStartAt)[0] ?? null
  );
}

export function buildTrmnlPayload(input: TrmnlInput): TrmnlPayload {
  const { race, now } = input;
  const format = makeFormatter(input.timeZone, input.locale, now);

  if (!race) {
    return {
      v: TRMNL_PAYLOAD_VERSION,
      has_race: false,
      race: null,
      lead: null,
      schedule: [],
      focus: 'news',
      result: null,
      grid: [],
      news: formatNews(input.news),
      standings: buildStandings(input.standings ?? null),
    };
  }

  const sessions = getSessionsForWeekend(!!race.hasSprint);
  const timeline = buildTimeline(
    input,
    race,
    format.scheduleWhen,
    format.scheduleParts,
  );
  const lastResulted = [...sessions]
    .reverse()
    .find((session) => (input.results[session]?.length ?? 0) > 0);
  const raceResult = input.results.race ?? [];

  const newsByRecency = [...input.news].sort(
    (a, b) => b.publishedAt - a.publishedAt,
  );
  const gridItem = newsByRecency.find(
    (item) => (item.startingGrid?.length ?? 0) > 0,
  );
  const grid = raceResult.length
    ? []
    : (gridItem?.startingGrid ?? []).map((entry) => ({
        pos: entry.position,
        code: entry.code,
        name: entry.displayName,
        note: entry.note ?? '',
      }));

  const result = lastResulted
    ? {
        label: `${SESSION_LABELS_FULL[lastResulted]} result`,
        rows: (input.results[lastResulted] ?? [])
          .slice(0, RESULT_ROWS[lastResulted])
          .map((row) => ({
            pos: row.position,
            code: row.code,
            name: row.displayName,
          })),
      }
    : null;

  const focus = chooseFocus({
    hasRaceResult: raceResult.length > 0,
    hasGrid: grid.length > 0,
    latestNewsAt: newsByRecency[0]?.publishedAt,
    latestResultStartedAt: lastResulted
      ? sessionStartAt(race, lastResulted)
      : undefined,
  });
  // A build-up with nothing to report shows the championship instead of an
  // empty news column. Not before the season's first race: no table yet.
  const standings =
    focus === 'schedule' && (input.standings?.roundsScored ?? 0) > 0
      ? buildStandings(input.standings ?? null)
      : null;

  return {
    v: TRMNL_PAYLOAD_VERSION,
    has_race: true,
    race: {
      name: race.name,
      short_name: race.name.replace(/ Grand Prix$/, ' GP'),
      circuit: getCircuitForRace(race.slug)?.name ?? null,
      flag_url: flagUrl(race.slug),
      round: race.round,
      season: race.season,
      dates: format.range(weekendStartAt(race), race.raceStartAt),
      url: raceUrl(race.slug, phaseOf(race, raceResult, now)),
    },
    lead: buildLead(timeline, race, raceResult, now, format.when),
    schedule: markNext(timeline, now).map(
      ({ startAt: _startAt, ...row }) => row,
    ),
    focus: standings ? 'standings' : focus,
    result,
    grid,
    news: formatNews(input.news),
    standings,
  };
}

function formatNews(news: NewsItem[]): TrmnlPayload['news'] {
  return [...news]
    .sort((a, b) => b.publishedAt - a.publishedAt)
    .slice(0, NEWS_LIMIT)
    .map((item) => ({ headline: item.headline }));
}

/**
 * Full-screen standings carry every driver and team. More drivers than seats
 * once a line-up changes mid-season: 23 in 2026.
 */
const DRIVER_STANDINGS_ROWS = 26;
const CONSTRUCTOR_STANDINGS_ROWS = 11;

/**
 * The off-season screen: the season just run, as its final tables. Before
 * the season is over (only the `/trmnl` page previews it then) the same
 * tables say so, rather than crowning a leader.
 */
function buildStandings(
  championship: ChampionshipInput | null,
): TrmnlPayload['standings'] {
  if (!championship || championship.drivers.length === 0) {
    return null;
  }
  const { season, roundsScored, roundsTotal } = championship;
  const final = roundsTotal > 0 && roundsScored >= roundsTotal;
  return {
    title: `Formula 1 ${season} Standings`,
    detail: final
      ? `After ${roundsScored} rounds`
      : `After round ${roundsScored} of ${roundsTotal}`,
    leader_label: final ? `${season} champion` : 'Championship leader',
    drivers: championship.drivers
      .slice(0, DRIVER_STANDINGS_ROWS)
      .map((row) => ({
        pos: row.position,
        code: row.code,
        name: row.displayName,
        points: row.points,
      })),
    constructors: championship.constructors
      .slice(0, CONSTRUCTOR_STANDINGS_ROWS)
      .map((row) => ({
        pos: row.position,
        name: row.team,
        points: row.points,
      })),
    url: `${siteConfig.url}/t/${STANDINGS_SLUG}`,
  };
}

function buildLead(
  timeline: TimelineRow[],
  race: RaceForTrmnl,
  raceResult: ResultRow[],
  now: number,
  when: (at: number) => string,
): TrmnlPayload['lead'] {
  const winner = raceResult[0];
  if (winner) {
    return { label: 'Race winner', value: winner.displayName, weather: null };
  }
  const next = timeline.find((row) => row.startAt > now);
  if (next && next.key !== 'race') {
    const practiceLabel =
      FREE_PRACTICE_FULL_LABELS[
        next.key as keyof typeof FREE_PRACTICE_FULL_LABELS
      ];
    return {
      label: practiceLabel ?? SESSION_LABELS_FULL[next.key as SessionType],
      // Not the row's time: the timeline stays weekday-only, the lead gains a
      // date when the session is more than six days off.
      value: when(next.startAt),
      weather: next.weather,
    };
  }
  // The race is next, or under way without a result. The start time stays
  // true before, during and after the race, so nothing here goes stale.
  const raceRow = timeline.find((row) => row.key === 'race');
  return {
    label: 'Lights out',
    value: when(race.raceStartAt),
    weather: raceRow?.weather ?? null,
  };
}

function phaseOf(
  race: RaceForTrmnl,
  raceResult: ResultRow[],
  now: number,
): TrmnlPhase {
  if (raceResult.length > 0) {
    return 'result';
  }
  return now < weekendStartAt(race) ? 'build_up' : 'weekend';
}

function flagUrl(slug: string): string | null {
  const code = getCountryCodeForRaceSlug(slug);
  return code ? `${siteConfig.url}/flags/${code}.svg` : null;
}

const PHASE_CODES: Record<TrmnlPhase, string> = {
  build_up: 'b',
  weekend: 'w',
  result: 'r',
};

const RACE_SLUG_PATTERN = /^[a-z0-9][a-z0-9-]{0,63}$/;
/** The off-season QR code's path segment: `/t/standings`. No race slug ends without a year. */
const STANDINGS_SLUG = 'standings';

/**
 * The QR code's link, as short as it can be: `/t/<race>/<phase>`.
 *
 * Length is the whole point. A QR code grows with its payload, and the full
 * destination with four UTM parameters is about 140 characters, which drew a
 * code too big to share the screen with the grid. The redirect route
 * (`server/routes/t/[...path].get.ts`) expands it through
 * {@link resolveTrmnlLanding}.
 */
function raceUrl(slug: string, phase: TrmnlPhase): string {
  return `${siteConfig.url}/t/${slug}/${PHASE_CODES[phase]}`;
}

/**
 * Where a scanned QR code lands, with PostHog attribution.
 *
 * The weekend's write-up when it has one, because that is the fuller read,
 * otherwise the race page; both carry the picks CTA. The off-season screen's
 * `/t/standings` lands on the championship tables. `utm_content` is the
 * phase the screen showed. The path comes from a URL anyone can type, so the
 * slug is matched against a strict pattern and an unknown phase is dropped
 * rather than repeated into analytics. Anything unrecognisable goes to the
 * home page, still attributed.
 */
export function resolveTrmnlLanding(pathname: string): string {
  const [, prefix, slug, code] = pathname.split('/');
  const params = new URLSearchParams({
    utm_source: 'trmnl',
    utm_medium: 'qr',
    utm_campaign: 'trmnl_plugin',
  });
  if (prefix !== 't' || !slug || !RACE_SLUG_PATTERN.test(slug)) {
    return `/?${params}`;
  }
  if (slug === STANDINGS_SLUG) {
    params.set('utm_content', 'off_season');
    return `/f1-standings?${params}`;
  }
  const phase = (Object.keys(PHASE_CODES) as TrmnlPhase[]).find(
    (key) => PHASE_CODES[key] === code,
  );
  if (phase) {
    params.set('utm_content', phase);
  }
  const path = getRaceWriteup(slug)?.to ?? `/races/${slug}`;
  return `${path}?${params}`;
}

/**
 * The block a large layout spends its spare room on.
 *
 * A published race result ends the weekend. Before that, the confirmed grid
 * is the most useful thing on race morning. Otherwise whichever is newer: a
 * session result or the latest news, so a Saturday qualifying result is not
 * buried under Thursday's news, and news that breaks after it is not hidden.
 */
function chooseFocus(args: {
  hasRaceResult: boolean;
  hasGrid: boolean;
  latestNewsAt: number | undefined;
  latestResultStartedAt: number | undefined;
}): TrmnlPayload['focus'] {
  if (args.hasRaceResult) {
    return 'result';
  }
  if (args.hasGrid) {
    return 'grid';
  }
  const { latestNewsAt, latestResultStartedAt } = args;
  if (latestResultStartedAt !== undefined) {
    // A session's result is published after it starts, so its start time is
    // a safe lower bound on when the result appeared.
    return latestNewsAt !== undefined && latestNewsAt > latestResultStartedAt
      ? 'news'
      : 'result';
  }
  return latestNewsAt !== undefined ? 'news' : 'schedule';
}

type TimelineRow = ScheduleRow & { startAt: number };

function markNext(timeline: TimelineRow[], now: number): TimelineRow[] {
  const nextIndex = timeline.findIndex((row) => row.startAt > now);
  return timeline.map((row, index) => ({ ...row, next: index === nextIndex }));
}

/** Practice and sessions in track order, each with its start time. */
function buildTimeline(
  input: TrmnlInput,
  race: RaceForTrmnl,
  when: (at: number) => string,
  scheduleParts: (at: number) => { weekday: string; time: string },
): TimelineRow[] {
  const practiceByType = new Map(
    input.practice.map((summary) => [summary.sessionType, summary]),
  );
  const rows: TimelineRow[] = [];
  const forecasts = sessionForecasts(input, race);

  const practiceStarts = [
    ['fp1', race.fp1StartAt],
    ['fp2', race.fp2StartAt],
    ['fp3', race.fp3StartAt],
  ] as const;
  for (const [type, at] of practiceStarts) {
    if (at === undefined) {
      continue;
    }
    const top3 = (practiceByType.get(type)?.topThree ?? []).map(
      (row) => row.code,
    );
    rows.push({
      startAt: at,
      key: type,
      label: FREE_PRACTICE_LABELS[type],
      short: type.toUpperCase(),
      when: when(at),
      ...scheduleParts(at),
      state:
        top3.length === 0 && input.now >= at + PRACTICE_RESULT_WAIT_MS
          ? 'no_result'
          : rowState(top3.length > 0, at, input.now),
      next: false,
      top3,
      weather: forecasts.get(type) ?? null,
    });
  }

  for (const session of getSessionsForWeekend(!!race.hasSprint)) {
    const at = sessionStartAt(race, session);
    const top3 = (input.results[session] ?? [])
      .slice(0, 3)
      .map((row) => row.code);
    rows.push({
      startAt: at,
      key: session,
      label:
        session === 'sprint_quali'
          ? 'Sprint Quali'
          : SESSION_LABELS_SHORT[session],
      short: SESSION_LABELS_SHORT[session],
      when: when(at),
      ...scheduleParts(at),
      state: rowState(top3.length > 0, at, input.now),
      next: false,
      top3,
      weather: forecasts.get(session) ?? null,
    });
  }

  return rows.sort((a, b) => a.startAt - b.startAt);
}

function rowState(
  hasResult: boolean,
  startAt: number,
  now: number,
): ScheduleRow['state'] {
  if (hasResult) {
    return 'done';
  }
  return startAt <= now ? 'awaiting' : 'upcoming';
}

/** Compact practice labels for the full weekend schedule. */
const FREE_PRACTICE_LABELS: Record<keyof typeof PRACTICE_LABELS, string> = {
  fp1: 'FP1',
  fp2: 'FP2',
  fp3: 'FP3',
};

/** Full practice labels for the featured upcoming session. */
const FREE_PRACTICE_FULL_LABELS: Record<keyof typeof PRACTICE_LABELS, string> =
  {
    fp1: 'Free Practice 1',
    fp2: 'Free Practice 2',
    fp3: 'Free Practice 3',
  };

/**
 * Each session's own forecast, keyed like the timeline rows (`fp1`,
 * `sprint_quali`, `race`...), from the same per-session windows the race
 * pages use. A stale forecast yields nothing at all: an old forecast on a
 * wall is worse than none.
 */
function sessionForecasts(
  input: TrmnlInput,
  race: RaceForTrmnl,
): Map<string, SessionWeather> {
  const forecasts = new Map<string, SessionWeather>();
  const { weather } = input;
  if (!weather || weather.isStale) {
    return forecasts;
  }
  const units = input.units ?? 'metric';
  for (const session of buildWeatherSessions(race)) {
    const summary = summarizeSessionWindow(weather.forecast, session);
    if (!summary) {
      continue;
    }
    const rain = summary.precipitationProbability;
    forecasts.set(session.key, {
      icon: weatherIconUrl(
        summary.conditionCode,
        isAfterDark(session.startsAt, weather.forecast.timeZone),
      ),
      temp: temperatureFigure(summary.temperatureC, units),
      rain:
        rain !== undefined && rain >= RAIN_WORTH_MENTIONING
          ? `${Math.round(rain)}%`
          : '',
      rainAmount: precipitationFigure(
        summary.precipitationAmountMm,
        units,
        rain !== undefined && rain >= RAIN_WORTH_MENTIONING,
      ),
      wind: windFigure(summary, units) ?? '',
      condition: conditionLabel(summary.conditionCode),
      text: sessionWeatherLine(summary, { units }),
    });
  }
  return forecasts;
}

function precipitationFigure(
  amountMm: number,
  units: MeasurementUnits,
  meaningfulRainChance: boolean,
): string {
  if (amountMm > 0) {
    return units === 'imperial'
      ? `${(amountMm / 25.4).toFixed(2)} in`
      : `${amountMm.toFixed(1)} mm`;
  }
  if (meaningfulRainChance) {
    return units === 'imperial' ? '0.00 in' : '0.0 mm';
  }
  return 'Dry';
}

/**
 * Whether a session starts after dark at the track: Singapore, Las Vegas,
 * Jeddah and Qatar do.
 *
 * Read from the session's own local start, not from the symbol code's
 * `_night` suffix. Beyond a couple of days MET Norway forecasts in 6-hour
 * periods, so a 16:00 race in Baku read a period that ran past sunset and drew
 * a moon over a daylight race.
 */
function isAfterDark(at: number, timeZone: string): boolean {
  const hour = Number(
    new Intl.DateTimeFormat('en-GB', {
      timeZone,
      hour: '2-digit',
      hourCycle: 'h23',
    }).format(at),
  );
  return hour >= 18 || hour < 6;
}

/**
 * MET Norway's symbol code, as one of TRMNL's weather icons
 * (help.trmnl.com "Weather icons", Erik Flowers' set).
 */
export function weatherIconUrl(conditionCode: string, night: boolean): string {
  const code = normalizeConditionCode(conditionCode);
  let name: string;
  if (code.includes('thunder')) {
    name = night ? 'night-alt-thunderstorm' : 'day-thunderstorm';
  } else if (code.includes('sleet')) {
    name = 'sleet';
  } else if (code.includes('snow')) {
    name = 'snow';
  } else if (code.includes('showers')) {
    name = night ? 'night-alt-showers' : 'day-showers';
  } else if (code.includes('heavyrain') || code === 'rain') {
    name = 'rain';
  } else if (code.includes('lightrain')) {
    name = 'sprinkle';
  } else if (code === 'fog') {
    name = 'fog';
  } else if (code === 'cloudy') {
    name = 'cloudy';
  } else if (code === 'partlycloudy') {
    name = night ? 'night-alt-partly-cloudy' : 'day-cloudy';
  } else if (code === 'fair') {
    name = night ? 'night-alt-partly-cloudy' : 'day-sunny-overcast';
  } else if (code === 'clearsky') {
    name = night ? 'night-clear' : 'day-sunny';
  } else {
    name = 'cloud';
  }
  return `https://trmnl.com/images/plugins/weather/wi-${name}.svg`;
}

function sessionStartAt(race: RaceForTrmnl, session: SessionType): number {
  switch (session) {
    case 'sprint_quali':
      return race.sprintQualiStartAt ?? race.raceStartAt;
    case 'sprint':
      return race.sprintStartAt ?? race.raceStartAt;
    case 'quali':
      return race.qualiStartAt ?? race.raceStartAt;
    case 'race':
      return race.raceStartAt;
  }
}

function weekendStartAt(race: RaceForTrmnl): number {
  return Math.min(
    ...[
      race.fp1StartAt,
      race.sprintQualiStartAt,
      race.qualiStartAt,
      race.raceStartAt,
    ].filter((at): at is number => at !== undefined),
  );
}

/**
 * Formatting in the viewer's zone and language, which TRMNL puts in the
 * polling URL. An unknown zone falls back to UTC *and says so*, rather than
 * printing a time in a zone the reader does not know they are looking at.
 */
function makeFormatter(
  timeZone: string | null,
  locale: string | null,
  now: number,
) {
  const zone = timeZone && isValidTimeZone(timeZone) ? timeZone : null;
  const lang =
    locale && Intl.DateTimeFormat.supportedLocalesOf(locale).length > 0
      ? locale
      : 'en-GB';
  const zoneOptions: Intl.DateTimeFormatOptions = zone
    ? { timeZone: zone }
    : { timeZone: 'UTC', timeZoneName: 'short' };

  const near = new Intl.DateTimeFormat(lang, {
    ...zoneOptions,
    weekday: 'short',
    hour: 'numeric',
    minute: '2-digit',
  });
  const weekday = new Intl.DateTimeFormat(lang, {
    ...zoneOptions,
    weekday: 'short',
  });
  const far = new Intl.DateTimeFormat(lang, {
    ...zoneOptions,
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
  });
  const days = new Intl.DateTimeFormat(lang, {
    timeZone: zone ?? 'UTC',
    day: 'numeric',
    month: 'short',
  });

  return {
    when(at: number): string {
      const formatter =
        Math.abs(at - now) <= WEEKDAY_ONLY_WITHIN_MS ? near : far;
      return plainSpaces(formatter.format(new Date(at)));
    },
    scheduleWhen(at: number): string {
      return plainSpaces(near.format(new Date(at)));
    },
    scheduleParts(at: number): { weekday: string; time: string } {
      const date = new Date(at);
      return {
        weekday: weekday.format(date),
        time: plainSpaces(timeWithoutWeekday(near, date)),
      };
    },
    range(from: number, to: number): string {
      return plainSpaces(days.formatRange(new Date(from), new Date(to)));
    },
  };
}

/**
 * The time as the weekday format writes it, less the weekday. A time-only
 * formatter would disagree with the lead: en-GB writes "Fri 05:30" but a bare
 * "5:30".
 */
function timeWithoutWeekday(format: Intl.DateTimeFormat, date: Date): string {
  const parts = format.formatToParts(date).filter((p) => p.type !== 'weekday');
  while (parts[0]?.type === 'literal') {
    parts.shift();
  }
  while (parts.at(-1)?.type === 'literal') {
    parts.pop();
  }
  return parts.map((p) => p.value).join('');
}

/**
 * ICU puts thin and narrow no-break spaces into dates ("4\u2009–\u20096 Sept",
 * "10:00\u202fAM"), and which ones depends on the ICU version: Node, Chrome and
 * Cloudflare's runtime disagree. Plain spaces render on any e-ink font and make
 * the payload the same wherever it is built.
 */
function plainSpaces(text: string): string {
  return text.replace(/[\u00a0\u2009\u202f]/g, ' ');
}

function isValidTimeZone(timeZone: string): boolean {
  try {
    new Intl.DateTimeFormat('en', { timeZone });
    return true;
  } catch {
    return false;
  }
}
