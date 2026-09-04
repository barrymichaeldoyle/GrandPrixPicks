export type WeatherHour = {
  at: number;
  localDate: string;
  localHour: number;
  forecastPeriodHours: number;
  temperatureC: number;
  conditionCode: string;
  precipitationAmountMm: number;
  precipitationProbability?: number;
  thunderProbability?: number;
  windSpeedMps: number;
  windGustMps?: number;
  windDirectionDegrees?: number;
};

type WeatherDay = {
  localDate: string;
  minTemperatureC: number;
  maxTemperatureC: number;
  maxPrecipitationProbability?: number;
  totalPrecipitationMm: number;
  maxWindGustMps?: number;
  dominantConditionCode: string;
  hasThunderRisk: boolean;
};

export type WeatherForecast = {
  raceSlug: string;
  timeZone: string;
  provider: 'met_no';
  providerUpdatedAt: number;
  fetchedAt: number;
  expiresAt: number;
  checkedAt: number;
  eventDates: string[];
  hours: WeatherHour[];
  days: WeatherDay[];
};

type WeatherAttribution = {
  name: string;
  url: string;
  licenseName: string;
  licenseUrl: string;
};

export type RaceWeather = {
  forecast: WeatherForecast;
  isStale: boolean;
  attribution: WeatherAttribution;
};

export type WeatherSession = {
  key: string;
  label: string;
  startsAt: number;
  endsAt: number;
};

type WeatherPeriod = {
  startsAt: number;
  endsAt: number;
  localHour: number;
  temperatureC: number;
  conditionCode: string;
  precipitationAmountMm: number;
  precipitationProbability?: number;
  thunderProbability?: number;
  maxWindGustMps?: number;
  sessions: WeatherSession[];
};

export type WeatherTimelineDay = {
  localDate: string;
  periods: WeatherPeriod[];
  sessions: WeatherSession[];
};

export type WeatherWindowSummary = {
  temperatureC: number;
  conditionCode: string;
  precipitationAmountMm: number;
  precipitationProbability?: number;
  thunderProbability?: number;
};

type RaceSchedule = {
  fp1StartAt?: number;
  fp2StartAt?: number;
  fp3StartAt?: number;
  sprintQualiStartAt?: number;
  sprintStartAt?: number;
  qualiStartAt?: number;
  raceStartAt: number;
};

const SESSION_DEFINITIONS = [
  ['fp1', 'Practice 1', 'fp1StartAt', 60],
  ['fp2', 'Practice 2', 'fp2StartAt', 60],
  ['fp3', 'Practice 3', 'fp3StartAt', 60],
  ['sprint_quali', 'Sprint qualifying', 'sprintQualiStartAt', 50],
  ['sprint', 'Sprint', 'sprintStartAt', 60],
  ['quali', 'Qualifying', 'qualiStartAt', 75],
  ['race', 'Grand Prix', 'raceStartAt', 120],
] as const;

function round(value: number): number {
  return Math.round(value);
}

function average(values: number[]): number {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function maxDefined(values: (number | undefined)[]): number | undefined {
  const defined = values.filter((value): value is number => value != null);
  return defined.length > 0 ? Math.max(...defined) : undefined;
}

function conditionWeight(code: string): number {
  const normalized = normalizeConditionCode(code);
  if (normalized.includes('thunder')) {
    return 7;
  }
  if (normalized.includes('heavyrain')) {
    return 6;
  }
  if (normalized.includes('rain')) {
    return 5;
  }
  if (normalized.includes('sleet') || normalized.includes('snow')) {
    return 4;
  }
  if (normalized.includes('fog')) {
    return 3;
  }
  if (normalized.includes('cloudy')) {
    return 2;
  }
  if (normalized.includes('fair')) {
    return 1;
  }
  return 0;
}

function mostSignificantCondition(hours: WeatherHour[]): string {
  return (
    [...hours].sort(
      (a, b) =>
        conditionWeight(b.conditionCode) - conditionWeight(a.conditionCode),
    )[0]?.conditionCode ?? 'cloudy'
  );
}

function summarizeWeatherHours(
  hours: WeatherHour[],
): WeatherWindowSummary | null {
  if (hours.length === 0) {
    return null;
  }
  return {
    temperatureC: round(average(hours.map((hour) => hour.temperatureC))),
    conditionCode: mostSignificantCondition(hours),
    precipitationAmountMm: hours.reduce(
      (sum, hour) => sum + hour.precipitationAmountMm,
      0,
    ),
    precipitationProbability: maxDefined(
      hours.map((hour) => hour.precipitationProbability),
    ),
    thunderProbability: maxDefined(
      hours.map((hour) => hour.thunderProbability),
    ),
  };
}

export function normalizeConditionCode(code: string): string {
  return code.replace(/_(day|night|polartwilight)$/, '').toLowerCase();
}

export function conditionLabel(code: string): string {
  const normalized = normalizeConditionCode(code);
  if (normalized.includes('thunder')) {
    return 'Thunderstorms';
  }
  if (normalized.includes('heavyrain')) {
    return 'Heavy rain';
  }
  if (normalized.includes('rain')) {
    return 'Rain';
  }
  if (normalized.includes('sleet')) {
    return 'Sleet';
  }
  if (normalized.includes('snow')) {
    return 'Snow';
  }
  if (normalized.includes('fog')) {
    return 'Fog';
  }
  if (normalized.includes('partlycloudy')) {
    return 'Partly cloudy';
  }
  if (normalized.includes('cloudy')) {
    return 'Cloudy';
  }
  if (normalized.includes('fair')) {
    return 'Fair';
  }
  if (normalized.includes('clearsky')) {
    return 'Clear';
  }
  return 'Changeable';
}

export function buildWeatherSessions(race: RaceSchedule): WeatherSession[] {
  return SESSION_DEFINITIONS.flatMap(([key, label, field, durationMinutes]) => {
    const startsAt = race[field];
    return startsAt == null
      ? []
      : [
          {
            key,
            label,
            startsAt,
            endsAt: startsAt + durationMinutes * 60_000,
          },
        ];
  }).sort((a, b) => a.startsAt - b.startsAt);
}

export function buildWeatherTimeline(
  forecast: WeatherForecast,
  sessions: WeatherSession[],
): WeatherTimelineDay[] {
  return forecast.eventDates.flatMap((localDate) => {
    const dayHours = forecast.hours.filter(
      (hour) => hour.localDate === localDate,
    );
    const periods: WeatherPeriod[] = [];

    const displayPeriodHours = dayHours.some(
      (hour) => hour.forecastPeriodHours === 6,
    )
      ? 6
      : 3;

    for (let localHour = 6; localHour <= 21; localHour += displayPeriodHours) {
      const hours = dayHours.filter(
        (hour) =>
          hour.localHour >= localHour &&
          hour.localHour < localHour + displayPeriodHours,
      );
      if (hours.length === 0) {
        continue;
      }

      const startsAt = hours[0]!.at;
      const endsAt = Math.max(
        ...hours.map(
          (hour) => hour.at + hour.forecastPeriodHours * 60 * 60_000,
        ),
      );
      periods.push({
        startsAt,
        endsAt,
        localHour,
        temperatureC: round(average(hours.map((hour) => hour.temperatureC))),
        conditionCode: mostSignificantCondition(hours),
        precipitationAmountMm: hours.reduce(
          (sum, hour) => sum + hour.precipitationAmountMm,
          0,
        ),
        precipitationProbability: maxDefined(
          hours.map((hour) => hour.precipitationProbability),
        ),
        thunderProbability: maxDefined(
          hours.map((hour) => hour.thunderProbability),
        ),
        maxWindGustMps: maxDefined(hours.map((hour) => hour.windGustMps)),
        sessions: sessions.filter(
          (session) => session.startsAt < endsAt && session.endsAt > startsAt,
        ),
      });
    }

    const daySessions = sessions.filter((session) =>
      dayHours.some(
        (hour) =>
          session.startsAt < hour.at + hour.forecastPeriodHours * 60 * 60_000 &&
          session.endsAt > hour.at,
      ),
    );

    return periods.length > 0
      ? [{ localDate, periods, sessions: daySessions }]
      : [];
  });
}

function weatherHourOverlaps(
  hour: WeatherHour,
  startsAt: number,
  endsAt: number,
): boolean {
  return (
    hour.at < endsAt &&
    hour.at + hour.forecastPeriodHours * 60 * 60_000 > startsAt
  );
}

function rainSignal(hours: WeatherHour[]): number {
  const probability = maxDefined(
    hours.map((hour) => hour.precipitationProbability),
  );
  if (probability != null) {
    return probability;
  }
  if (
    hours.some((hour) =>
      normalizeConditionCode(hour.conditionCode).includes('thunder'),
    )
  ) {
    return 70;
  }
  if (
    hours.some(
      (hour) =>
        hour.precipitationAmountMm >= 0.2 ||
        normalizeConditionCode(hour.conditionCode).includes('rain'),
    )
  ) {
    return 55;
  }
  return 0;
}

function localTime(timestamp: number, timeZone: string): string {
  return new Intl.DateTimeFormat('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone,
  }).format(timestamp);
}

/**
 * What the hours around a session say that the session's own row cannot.
 *
 * Null on a session with nothing either side of it, which is the common case
 * and the point: the strip already prints the condition, the temperature and
 * the rain chance for every session, so a sentence repeating one of those rows
 * in words is the page saying the same thing twice. What a row genuinely cannot
 * carry is timing — rain that lands an hour after the flag, or a wet morning
 * before a dry afternoon — and that is all this returns.
 */
export function forecastAlert(
  forecast: WeatherForecast,
  session: WeatherSession,
): string | null {
  const before = forecast.hours.filter((hour) =>
    weatherHourOverlaps(
      hour,
      session.startsAt - 6 * 60 * 60_000,
      session.startsAt,
    ),
  );
  const during = forecast.hours.filter((hour) =>
    weatherHourOverlaps(hour, session.startsAt, session.endsAt),
  );
  const after = forecast.hours.filter((hour) =>
    weatherHourOverlaps(hour, session.endsAt, session.endsAt + 6 * 60 * 60_000),
  );

  const duringRain = rainSignal(during);
  const beforeRain = rainSignal(before);
  const afterRain = rainSignal(after);
  const afterThunder = after.find(
    (hour) =>
      (hour.thunderProbability ?? 0) >= 20 ||
      normalizeConditionCode(hour.conditionCode).includes('thunder'),
  );

  if (afterThunder) {
    return `Thunderstorm risk rises after ${session.label.toLowerCase()} from around ${localTime(afterThunder.at, forecast.timeZone)}, so a change in timing could still matter.`;
  }
  if (afterRain >= 50 && duringRain < 50) {
    return `Wetter weather is forecast after ${session.label.toLowerCase()}, so a change in timing could still matter.`;
  }
  if (beforeRain >= 50 && duringRain < 50) {
    return `Rain is forecast before ${session.label.toLowerCase()} and may leave a damp or low-grip circuit.`;
  }
  return null;
}

export function nextWeatherSession(
  sessions: WeatherSession[],
  now: number,
): WeatherSession | null {
  return sessions.find((session) => session.endsAt >= now) ?? null;
}

/**
 * The circuit-local calendar day a moment falls on, as `YYYY-MM-DD`.
 *
 * Needed to spot a session the forecast does not reach. A timeline day derives
 * its sessions from the hours the model actually returned, so a session past
 * the end of the model is missing from that list rather than marked absent:
 * asking it "which sessions have no forecast?" can only ever answer "none".
 * The schedule is the honest source for what runs that day.
 */
export function localDateKey(at: number, timeZone: string): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(at));
}

/**
 * The forecast for a session itself, with nothing either side of it.
 *
 * Null once the session has passed out of the forecast window, which is what
 * lets a caller fall back to a session there is still something to say about.
 */
export function summarizeSessionWindow(
  forecast: WeatherForecast,
  session: WeatherSession,
): WeatherWindowSummary | null {
  return summarizeWeatherHours(
    forecast.hours.filter((hour) =>
      weatherHourOverlaps(hour, session.startsAt, session.endsAt),
    ),
  );
}

/**
 * One line of forecast: what it is, how warm, and how likely rain is.
 *
 * The chance is dropped below 20%, where it is not a fact anyone picks
 * differently on, and loses its trailing "rain" whenever the condition has
 * already said the word.
 */
export function sessionWeatherLine(summary: WeatherWindowSummary): string {
  const label = conditionLabel(summary.conditionCode);
  const parts = [label, `${summary.temperatureC}°C`];

  const probability = summary.precipitationProbability;
  if (probability != null && probability >= 20) {
    const normalized = normalizeConditionCode(summary.conditionCode);
    const wet =
      normalized.includes('rain') ||
      normalized.includes('thunder') ||
      normalized.includes('sleet') ||
      normalized.includes('snow');
    parts.push(`${Math.round(probability)}%${wet ? '' : ' rain'}`);
  } else if (probability == null && summary.precipitationAmountMm > 0) {
    parts.push(`${summary.precipitationAmountMm.toFixed(1)} mm`);
  }

  return parts.join(' · ');
}
