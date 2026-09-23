import type { Id } from '@convex-generated/dataModel';
import { describe, expect, it } from 'vitest';

import type { TrmnlInput } from './payload';
import {
  buildTrmnlPayload,
  resolveTrmnlLanding,
  selectTrmnlRace,
  TRMNL_RESULT_HOLD_MS,
  weatherIconUrl,
} from './payload';
import { sampleForecast } from './scenarios';

const HOUR = 60 * 60 * 1000;
function at(iso: string): number {
  return Date.parse(iso);
}

// A regular weekend at Monza, times in UTC. Europe/Rome is UTC+2 in September.
const race = {
  _id: 'race1' as Id<'races'>,
  slug: 'italy-2026',
  name: 'Italian Grand Prix',
  round: 16,
  season: 2026,
  status: 'upcoming' as const,
  hasSprint: false,
  fp1StartAt: at('2026-09-04T11:30:00Z'),
  fp2StartAt: at('2026-09-04T15:00:00Z'),
  fp3StartAt: at('2026-09-05T10:30:00Z'),
  sprintQualiStartAt: undefined,
  sprintQualiLockAt: undefined,
  sprintStartAt: undefined,
  sprintLockAt: undefined,
  qualiStartAt: at('2026-09-05T14:00:00Z'),
  qualiLockAt: at('2026-09-05T14:00:00Z'),
  raceStartAt: at('2026-09-06T13:00:00Z'),
  predictionLockAt: at('2026-09-06T13:00:00Z'),
};

const podium = [
  { position: 1, code: 'NOR', displayName: 'Lando Norris' },
  { position: 2, code: 'PIA', displayName: 'Oscar Piastri' },
  { position: 3, code: 'LEC', displayName: 'Charles Leclerc' },
  { position: 4, code: 'VER', displayName: 'Max Verstappen' },
  { position: 5, code: 'RUS', displayName: 'George Russell' },
  { position: 6, code: 'HAM', displayName: 'Lewis Hamilton' },
];

function input(overrides: Partial<TrmnlInput> = {}): TrmnlInput {
  return {
    now: at('2026-09-01T09:00:00Z'),
    timeZone: 'Europe/Rome',
    locale: 'en-GB',
    race,
    news: [],
    results: {},
    practice: [],
    weather: null,
    ...overrides,
  };
}

describe('selectTrmnlRace', () => {
  const next = {
    ...race,
    _id: 'race2' as Id<'races'>,
    slug: 'azerbaijan-2026',
    raceStartAt: race.raceStartAt + 14 * 24 * HOUR,
  };

  it('holds a finished race for the hold window, then moves on', () => {
    const finished = { ...race, status: 'finished' as const };
    expect(
      selectTrmnlRace([finished, next], race.raceStartAt + 20 * HOUR)?.slug,
    ).toBe('italy-2026');
    expect(
      selectTrmnlRace([finished, next], race.raceStartAt + TRMNL_RESULT_HOLD_MS)
        ?.slug,
    ).toBe('azerbaijan-2026');
  });

  it('skips a cancelled round', () => {
    const cancelled = { ...race, status: 'cancelled' as const };
    expect(
      selectTrmnlRace([cancelled, next], at('2026-09-01T00:00:00Z'))?.slug,
    ).toBe('azerbaijan-2026');
  });

  it('returns null once the season has run out', () => {
    expect(selectTrmnlRace([race], race.raceStartAt + 30 * 24 * HOUR)).toBe(
      null,
    );
  });
});

describe('buildTrmnlPayload', () => {
  it('leads with the next session as a local clock time, not a countdown', () => {
    const payload = buildTrmnlPayload(
      input({ now: at('2026-09-05T08:00:00Z') }),
    );
    expect(payload.lead).toMatchObject({
      label: 'Free Practice 3',
      value: 'Sat 12:30',
    });
  });

  it('adds the date when the session is more than six days out', () => {
    const payload = buildTrmnlPayload(
      input({ now: at('2026-08-25T08:00:00Z') }),
    );
    expect(payload.lead).toMatchObject({
      label: 'Free Practice 1',
      value: 'Fri 4 Sept, 13:30',
    });
  });

  it('gives an identical payload for two polls in the same phase', () => {
    // TRMNL skips a redraw when nothing changed. Anything that moves with the
    // clock between boundaries would cost a redraw every poll.
    const first = buildTrmnlPayload(input({ now: at('2026-09-05T11:00:00Z') }));
    const later = buildTrmnlPayload(input({ now: at('2026-09-05T13:55:00Z') }));
    expect(later).toEqual(first);
  });

  it('formats in the viewer language and zone', () => {
    const payload = buildTrmnlPayload(
      input({
        now: at('2026-09-05T08:00:00Z'),
        timeZone: 'America/New_York',
        locale: 'en-US',
      }),
    );
    expect(payload.lead?.value).toBe('Sat 6:30 AM');
  });

  it('uses plain spaces, whatever the ICU version puts in dates', () => {
    const payload = buildTrmnlPayload(
      input({ timeZone: 'America/New_York', locale: 'en-US' }),
    );
    expect(JSON.stringify(payload)).not.toMatch(/[\u00a0\u2009\u202f]/);
  });

  it('names UTC when the zone is missing or unknown', () => {
    for (const timeZone of [null, 'Mars/Olympus']) {
      const payload = buildTrmnlPayload(
        input({ now: at('2026-09-05T08:00:00Z'), timeZone }),
      );
      expect(payload.lead?.value).toBe('Sat, 10:30 UTC');
    }
  });

  it('points at lights out before and during the race', () => {
    for (const now of ['2026-09-06T08:00:00Z', '2026-09-06T14:00:00Z']) {
      const payload = buildTrmnlPayload(input({ now: at(now) }));
      expect(payload.lead).toMatchObject({
        label: 'Lights out',
        value: 'Sun 15:00',
      });
    }
  });

  it('gives the QR code a short link that changes only with the phase', () => {
    function url(now: string, results: TrmnlInput['results'] = {}) {
      return buildTrmnlPayload(input({ now: at(now), results })).race?.url;
    }
    expect(url('2026-09-01T09:00:00Z')).toBe(
      'https://grandprixpicks.com/t/italy-2026/b',
    );
    expect(url('2026-09-05T09:00:00Z')).toBe(
      'https://grandprixpicks.com/t/italy-2026/w',
    );
    expect(url('2026-09-06T16:00:00Z', { race: podium })).toBe(
      'https://grandprixpicks.com/t/italy-2026/r',
    );
  });

  it('names the circuit and flies the race flag', () => {
    const payload = buildTrmnlPayload(input());
    expect(payload.race?.circuit).toBe('Autodromo Nazionale Monza');
    expect(payload.race?.flag_url).toBe(
      'https://grandprixpicks.com/flags/it.svg',
    );
  });

  it('flies the race flag, not the venue flag, for Bahrain at Sepang', () => {
    const payload = buildTrmnlPayload(
      input({
        race: { ...race, slug: 'bahrain-2026', name: 'Bahrain Grand Prix' },
      }),
    );
    expect(payload.race?.circuit).toBe('Sepang International Circuit');
    expect(payload.race?.flag_url).toBe(
      'https://grandprixpicks.com/flags/bh.svg',
    );
  });

  it('leads with the winner and shows the race result once it lands', () => {
    const payload = buildTrmnlPayload(
      input({
        now: at('2026-09-06T16:00:00Z'),
        results: { quali: podium, race: podium },
      }),
    );
    expect(payload.lead).toEqual({
      label: 'Race winner',
      value: 'Lando Norris',
      weather: null,
    });
    expect(payload.focus).toBe('result');
    expect(payload.result?.label).toBe('Race result');
    expect(payload.result?.rows).toHaveLength(6);
  });

  it('carries the top ten for a race or sprint and five for qualifying', () => {
    const field = Array.from({ length: 20 }, (_, index) => ({
      position: index + 1,
      code: `D${index + 1}`,
      displayName: `Driver ${index + 1}`,
    }));
    const now = at('2026-09-06T17:00:00Z');
    expect(
      buildTrmnlPayload(input({ now, results: { race: field } })).result?.rows,
    ).toHaveLength(10);
    expect(
      buildTrmnlPayload(
        input({ now: at('2026-09-05T18:00:00Z'), results: { quali: field } }),
      ).result?.rows,
    ).toHaveLength(5);
  });

  it('builds the weekend timeline with practice and results in order', () => {
    const payload = buildTrmnlPayload(
      input({
        now: at('2026-09-05T15:30:00Z'),
        practice: [{ sessionType: 'fp1', topThree: podium.slice(0, 3) }],
        results: { quali: podium },
      }),
    );
    expect(
      payload.schedule.map((row) => [row.short, row.state, row.top3.join(' ')]),
    ).toEqual([
      ['FP1', 'done', 'NOR PIA LEC'],
      ['FP2', 'no_result', ''],
      ['FP3', 'awaiting', ''],
      ['Quali', 'done', 'NOR PIA LEC'],
      ['Race', 'upcoming', ''],
    ]);
  });

  it('marks the next session in the timeline', () => {
    const payload = buildTrmnlPayload(
      input({ now: at('2026-09-05T11:00:00Z') }),
    );
    expect(
      payload.schedule.filter((row) => row.next).map((row) => row.short),
    ).toEqual(['Quali']);
  });

  it('stops waiting for a practice result that never arrived', () => {
    const payload = buildTrmnlPayload(
      input({ now: at('2026-09-06T10:00:00Z'), results: { quali: podium } }),
    );
    expect(payload.schedule.map((row) => row.state)).toEqual([
      'no_result',
      'no_result',
      'no_result',
      'done',
      'upcoming',
    ]);
  });

  it('shows the confirmed grid until the race result replaces it', () => {
    const gridNews = {
      headline: 'Starting grid confirmed',
      publishedAt: at('2026-09-06T09:00:00Z'),
      startingGrid: [
        { position: 1, code: 'NOR', displayName: 'Lando Norris' },
        {
          position: 2,
          code: 'PIA',
          displayName: 'Oscar Piastri',
          note: '3-place penalty',
        },
      ],
    };
    const raceMorning = buildTrmnlPayload(
      input({
        now: at('2026-09-06T10:00:00Z'),
        news: [gridNews],
        results: { quali: podium },
      }),
    );
    expect(raceMorning.focus).toBe('grid');
    expect(raceMorning.grid[1]).toEqual({
      pos: 2,
      code: 'PIA',
      name: 'Oscar Piastri',
      note: '3-place penalty',
    });

    const afterRace = buildTrmnlPayload(
      input({
        now: at('2026-09-06T16:00:00Z'),
        news: [gridNews],
        results: { quali: podium, race: podium },
      }),
    );
    expect(afterRace.grid).toEqual([]);
  });

  it('focuses whichever is newer, a session result or the news', () => {
    function news(publishedAt: string) {
      return [
        {
          headline: 'Antonelli takes a grid penalty',
          publishedAt: at(publishedAt),
        },
      ];
    }
    const base = {
      now: at('2026-09-05T18:00:00Z'),
      results: { quali: podium },
    };
    expect(
      buildTrmnlPayload(input({ ...base, news: news('2026-09-04T10:00:00Z') }))
        .focus,
    ).toBe('result');
    const latestNews = buildTrmnlPayload(
      input({ ...base, news: news('2026-09-05T17:00:00Z') }),
    );
    expect(latestNews.focus).toBe('news');
    expect(latestNews.news).toEqual([
      { headline: 'Antonelli takes a grid penalty' },
    ]);
  });

  it('carries up to twenty news headlines', () => {
    const headlines = Array.from({ length: 25 }, (_, index) => ({
      headline: `Headline ${index + 1}`,
      publishedAt: at('2026-09-06T17:00:00Z') + index,
    }));
    const payload = buildTrmnlPayload(
      input({ now: at('2026-09-06T18:00:00Z'), news: headlines }),
    );

    expect(payload.news).toHaveLength(20);
    expect(payload.news[0]?.headline).toBe('Headline 25');
    expect(payload.news.at(-1)?.headline).toBe('Headline 6');
  });

  it('gives every session in the forecast window its own weather', () => {
    const weather = sampleForecast('Europe/Rome', {
      '2026-09-04': {
        temperatureC: 26,
        conditionCode: 'fair_day',
        precipitationProbability: 5,
      },
      '2026-09-05': {
        temperatureC: 23,
        conditionCode: 'rain',
        precipitationProbability: 60,
      },
    });
    const payload = buildTrmnlPayload(
      input({ now: at('2026-09-05T08:00:00Z'), weather }),
    );
    const byRow = Object.fromEntries(
      payload.schedule.map((row) => [row.short, row.weather]),
    );
    expect(byRow.FP1).toEqual({
      icon: 'https://trmnl.com/images/plugins/weather/wi-day-sunny-overcast.svg',
      temp: '26°',
      rain: '',
      text: 'Fair · 26°C',
    });
    expect(byRow.Quali).toEqual({
      icon: 'https://trmnl.com/images/plugins/weather/wi-rain.svg',
      temp: '23°',
      rain: '60%',
      text: 'Rain · 23°C · 60%',
    });
    // Sunday is outside this forecast, so the race row says nothing.
    expect(byRow.Race).toBe(null);
    // The lead carries its own session's forecast for the small layouts.
    expect(payload.lead?.weather).toEqual(byRow.FP3);

    const stale = buildTrmnlPayload(
      input({
        now: at('2026-09-05T08:00:00Z'),
        weather: { ...weather, isStale: true },
      }),
    );
    expect(stale.lead?.weather).toBe(null);
    expect(stale.schedule.every((row) => row.weather === null)).toBe(true);
  });

  it('spells practice out in full and keeps FP1 for narrow layouts', () => {
    const [fp1] = buildTrmnlPayload(input()).schedule;
    expect([fp1.label, fp1.short]).toEqual(['Free Practice 1', 'FP1']);
  });

  it('says there is no race when the season is over', () => {
    const payload = buildTrmnlPayload(input({ race: null }));
    expect(payload.has_race).toBe(false);
    expect(payload.lead).toBe(null);
  });
});

describe('the off-season payload', () => {
  const standings = {
    season: 2026,
    roundsScored: 23,
    roundsTotal: 23,
    drivers: [
      { position: 1, code: 'NOR', displayName: 'Lando Norris', points: 412 },
    ],
    constructors: [{ position: 1, team: 'McLaren', points: 801 }],
  };

  it('crowns the champion once every round is scored', () => {
    const payload = buildTrmnlPayload(input({ race: null, standings }));
    expect(payload.has_race).toBe(false);
    expect(payload.standings).toMatchObject({
      title: 'Formula 1 2026 Standings',
      detail: 'After 23 rounds',
      leader_label: '2026 champion',
      drivers: [{ pos: 1, code: 'NOR', name: 'Lando Norris', points: 412 }],
      constructors: [{ pos: 1, name: 'McLaren', points: 801 }],
      url: 'https://grandprixpicks.com/t/standings',
    });
  });

  it('calls it a leader while rounds remain', () => {
    const payload = buildTrmnlPayload(
      input({ race: null, standings: { ...standings, roundsScored: 16 } }),
    );
    expect(payload.standings).toMatchObject({
      title: 'Formula 1 2026 Standings',
      detail: 'After round 16 of 23',
      leader_label: 'Championship leader',
    });
  });

  it('has no standings before a single round is scored', () => {
    const payload = buildTrmnlPayload(
      input({ race: null, standings: { ...standings, drivers: [] } }),
    );
    expect(payload.standings).toBe(null);
  });
});

describe('resolveTrmnlLanding', () => {
  const utm = 'utm_source=trmnl&utm_medium=qr&utm_campaign=trmnl_plugin';

  it('lands on the write-up when the weekend has one', () => {
    expect(resolveTrmnlLanding('/t/italy-2026/w')).toBe(
      `/f1-2026-italian-grand-prix-predictions?${utm}&utm_content=weekend`,
    );
  });

  it('lands the off-season code on the standings', () => {
    expect(resolveTrmnlLanding('/t/standings')).toBe(
      `/f1-standings?${utm}&utm_content=off_season`,
    );
  });

  it('falls back to the race page when it does not', () => {
    expect(resolveTrmnlLanding('/t/japan-2026/r')).toBe(
      `/races/japan-2026?${utm}&utm_content=result`,
    );
  });

  it('drops a phase it does not know rather than repeat it', () => {
    expect(resolveTrmnlLanding('/t/japan-2026/zzz')).toBe(
      `/races/japan-2026?${utm}`,
    );
  });

  it('sends anything unrecognisable home, still attributed', () => {
    for (const path of ['/t', '/t/', '/t/..%2Fadmin/w', '/t/UPPER/w']) {
      expect(resolveTrmnlLanding(path)).toBe(`/?${utm}`);
    }
  });
});

describe('weatherIconUrl', () => {
  function icon(code: string, night = false) {
    return weatherIconUrl(code, night).replace(/.*\/wi-(.*)\.svg$/, '$1');
  }

  it('maps MET Norway conditions to TRMNL icons', () => {
    expect(icon('clearsky_day')).toBe('day-sunny');
    expect(icon('rainshowersandthunder_day')).toBe('day-thunderstorm');
    expect(icon('lightrain')).toBe('sprinkle');
    expect(icon('cloudy')).toBe('cloudy');
  });

  it('takes day or night from the session, not the code suffix', () => {
    expect(icon('partlycloudy_night')).toBe('day-cloudy');
    expect(icon('clearsky_day', true)).toBe('night-clear');
    expect(icon('heavyrainshowers_day', true)).toBe('night-alt-showers');
  });
});
