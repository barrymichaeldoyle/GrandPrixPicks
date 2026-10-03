import type { Id } from '@convex-generated/dataModel';
import { describe, expect, it } from 'vitest';

import type { TrmnlInput } from './payload';
import {
  buildTrmnlPayload,
  fastestPerPart,
  formatGap,
  selectTrmnlNextRace,
  resolveTrmnlLanding,
  selectTrmnlRace,
  TRMNL_RESULT_HOLD_MS,
  weatherIconUrl,
} from './payload';
import { sampleForecast, TRMNL_SCENARIOS } from './scenarios';

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

describe('between rounds', () => {
  function later(start: number): number {
    return start + 28 * 24 * HOUR;
  }
  const singapore = {
    ...race,
    _id: 'race3' as Id<'races'>,
    slug: 'singapore-2026',
    name: 'Singapore Grand Prix',
    round: 17,
    fp1StartAt: later(race.fp1StartAt),
    fp2StartAt: later(race.fp2StartAt),
    fp3StartAt: later(race.fp3StartAt),
    qualiStartAt: later(race.qualiStartAt),
    raceStartAt: later(race.raceStartAt),
  };

  it('lists the coming rounds with no session time or forecast', () => {
    const payload = buildTrmnlPayload(
      input({
        now: race.fp1StartAt - 10 * 24 * HOUR,
        weather: sampleForecast('Europe/Rome', {
          '2026-09-04': {
            temperatureC: 27,
            conditionCode: 'rain',
            precipitationProbability: 60,
          },
        }),
        upcoming: [singapore],
      }),
    );
    expect(payload.between_rounds).toBe(true);
    expect(payload.lead).toEqual({
      label: 'Race weekend',
      value: '4 – 6 Sept',
      weather: null,
    });
    expect(payload.upcoming).toEqual([
      { round: 16, short_name: 'Italian GP', dates: '4 – 6 Sept' },
      { round: 17, short_name: 'Singapore GP', dates: '2 – 4 Oct' },
    ]);
    expect(payload.schedule.every((row) => row.weather === null)).toBe(true);
  });

  it('leads with the first session once the weekend is within six days', () => {
    const payload = buildTrmnlPayload(
      input({ now: race.fp1StartAt - 6 * 24 * HOUR, upcoming: [singapore] }),
    );
    expect(payload.between_rounds).toBe(false);
    expect(payload.upcoming).toEqual([]);
    expect(payload.lead?.label).toBe('Free Practice 1');
  });
});

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

  it('keeps the schedule time compact between rounds', () => {
    // Ten days out the lead is the weekend's dates, never a session time.
    const payload = buildTrmnlPayload(
      input({ now: at('2026-08-25T08:00:00Z') }),
    );
    expect(payload.lead).toMatchObject({
      label: 'Race weekend',
      value: '4 – 6 Sept',
    });
    expect(payload.schedule[0]?.when).toBe('Fri 13:30');
  });

  it('writes a timeline time the way the lead writes it', () => {
    // en-GB pads the hour beside a weekday ("Sat 06:30") but not on its own.
    const payload = buildTrmnlPayload(
      input({ now: at('2026-09-05T08:00:00Z'), timeZone: 'America/New_York' }),
    );
    expect(payload.lead?.value).toBe('Sat 06:30');
    expect(payload.schedule.find((row) => row.short === 'FP3')).toMatchObject({
      weekday: 'Sat',
      time: '06:30',
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

  it.each([
    ['2026-03-29', '00:30', '02:30'],
    ['2026-10-25', '01:30', '01:30'],
  ])(
    'formats each session across the London DST change on %s',
    (day, before, after) => {
      const payload = buildTrmnlPayload(
        input({
          now: at(`${day}T00:00:00Z`),
          timeZone: 'Europe/London',
          race: {
            ...race,
            fp1StartAt: at(`${day}T00:30:00Z`),
            fp2StartAt: at(`${day}T01:30:00Z`),
          },
        }),
      );
      expect(payload.schedule.find((row) => row.short === 'FP1')?.time).toBe(
        before,
      );
      expect(payload.schedule.find((row) => row.short === 'FP2')?.time).toBe(
        after,
      );
    },
  );

  it('keeps session times when weather is missing', () => {
    const payload = buildTrmnlPayload(input({ weather: null }));
    expect(payload.schedule).toHaveLength(5);
    expect(
      payload.schedule.every(
        (row) => row.weather === null && row.time.length > 0,
      ),
    ).toBe(true);
    expect(payload.lead?.weather).toBeNull();
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

  it('carries the whole field for the race and qualifying', () => {
    const field = Array.from({ length: 22 }, (_, index) => ({
      position: index + 1,
      code: `D${index + 1}`,
      displayName: `Driver ${index + 1}`,
    }));
    const now = at('2026-09-06T17:00:00Z');
    expect(
      buildTrmnlPayload(input({ now, results: { race: field } })).result?.rows,
    ).toHaveLength(22);
    expect(
      buildTrmnlPayload(
        input({ now: at('2026-09-05T18:00:00Z'), results: { quali: field } }),
      ).result?.rows,
    ).toHaveLength(22);
  });

  it('builds the weekend timeline with practice and results in order', () => {
    const payload = buildTrmnlPayload(
      input({
        now: at('2026-09-05T15:30:00Z'),
        practice: [{ sessionType: 'fp1', classification: podium }],
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

  it('carries each session in order, ranked finishers only', () => {
    const payload = buildTrmnlPayload(
      input({
        now: at('2026-09-05T15:30:00Z'),
        practice: [{ sessionType: 'fp1', classification: podium }],
        results: {
          quali: [
            ...podium,
            {
              position: 7,
              code: 'ALO',
              displayName: 'Fernando Alonso',
              status: 'dns',
            },
          ],
        },
      }),
    );
    const codes = payload.schedule
      .filter((row) => row.state === 'done')
      .map((row) => row.codes.join(' '));
    expect(codes).toEqual([
      'NOR PIA LEC VER RUS HAM',
      'NOR PIA LEC VER RUS HAM',
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

  it('fills a build-up with no news with the drivers championship', () => {
    const standings = {
      season: 2026,
      roundsScored: 15,
      roundsTotal: 23,
      drivers: [
        {
          position: 1,
          code: 'LEC',
          displayName: 'Charles Leclerc',
          points: 223,
        },
      ],
      constructors: [{ position: 1, team: 'Ferrari', points: 390 }],
    };
    const buildUp = input({ now: at('2026-09-01T09:00:00Z'), standings });

    const empty = buildTrmnlPayload(buildUp);
    expect(empty.focus).toBe('standings');
    expect(empty.standings?.drivers).toEqual([
      { pos: 1, code: 'LEC', name: 'Charles Leclerc', points: 223 },
    ]);

    const withNews = buildTrmnlPayload({
      ...buildUp,
      news: [
        {
          headline: 'Upgrades arrive',
          publishedAt: at('2026-09-01T08:00:00Z'),
        },
      ],
    });
    expect(withNews.focus).toBe('news');
    expect(withNews.standings).toBe(null);

    // Before the season's first race there is no table to show.
    const roundOne = buildTrmnlPayload({
      ...buildUp,
      standings: { ...standings, roundsScored: 0 },
    });
    expect(roundOne.focus).toBe('schedule');
    expect(roundOne.standings).toBe(null);
  });

  it('marks the weekend finished and names the next round once the race is in', () => {
    const next = {
      ...race,
      slug: 'azerbaijan-2026',
      name: 'Azerbaijan Grand Prix',
      round: 17,
      fp1StartAt: at('2026-09-18T08:30:00Z'),
      fp2StartAt: at('2026-09-18T12:00:00Z'),
      fp3StartAt: at('2026-09-19T08:30:00Z'),
      qualiStartAt: at('2026-09-19T12:00:00Z'),
      raceStartAt: at('2026-09-20T11:00:00Z'),
    };
    const retired = [
      ...podium,
      {
        position: podium.length + 1,
        code: 'STR',
        displayName: 'Lance Stroll',
        status: 'dnf',
      },
    ];
    const finished = buildTrmnlPayload(
      input({
        now: at('2026-09-06T17:00:00Z'),
        results: { race: retired },
        nextRace: next,
      }),
    );
    expect(finished.race_finished).toBe(true);
    expect(finished.result?.rows.at(-1)).toMatchObject({ status: 'DNF' });
    expect(finished.result?.rows[0]).toMatchObject({ status: '' });
    expect(finished.next_race).toMatchObject({
      name: 'Azerbaijan Grand Prix',
      round: 17,
      dates: '18 – 20 Sept',
    });

    // Before the race result, there is no next race to show yet.
    const saturday = buildTrmnlPayload(
      input({ now: at('2026-09-05T18:00:00Z'), nextRace: next }),
    );
    expect(saturday.race_finished).toBe(false);
    expect(saturday.next_race).toBe(null);
  });

  it('writes gaps the way F1 results do', () => {
    const row = { position: 2, code: 'VER', displayName: 'Max Verstappen' };
    expect(
      formatGap({
        ...row,
        position: 1,
        gapToLeaderSeconds: 0,
        durationSeconds: 5882.143,
      }),
    ).toBe('1:38:02.143');
    expect(formatGap({ ...row, gapToLeaderSeconds: 0.196 })).toBe('+0.196');
    expect(formatGap({ ...row, gapToLeaderSeconds: 64.221 })).toBe('+1:04.221');
    expect(formatGap({ ...row, lapsDown: 1 })).toBe('+1 lap');
    expect(formatGap({ ...row, lapsDown: 2 })).toBe('+2 laps');
    // No official timing yet: nothing rather than a made-up gap.
    expect(formatGap(row)).toBe('');
  });

  it('picks the next round, skipping a cancelled one', () => {
    function later(slug: string, days: number, status = 'upcoming') {
      return {
        ...race,
        slug,
        status: status as typeof race.status,
        raceStartAt: race.raceStartAt + days * 24 * HOUR,
      };
    }
    const cancelled = later('cancelled-2026', 7, 'cancelled');
    const next = later('azerbaijan-2026', 14);
    expect(selectTrmnlNextRace([next, race, cancelled], race)?.slug).toBe(
      'azerbaijan-2026',
    );
    expect(selectTrmnlNextRace([race], race)).toBe(null);
  });

  function news(publishedAt: string) {
    return [
      {
        headline: 'Antonelli takes a grid penalty',
        publishedAt: at(publishedAt),
      },
    ];
  }

  it('focuses a qualifying result over newer news until the race', () => {
    const payload = buildTrmnlPayload(
      input({
        now: at('2026-09-05T18:00:00Z'),
        results: { quali: podium },
        news: news('2026-09-05T17:00:00Z'),
      }),
    );
    expect(payload.focus).toBe('result');
    expect(payload.result?.label).toBe('Qualifying result');
  });

  it('focuses whichever is newer, a sprint result or the news', () => {
    const sprintRace = {
      ...race,
      hasSprint: true,
      sprintQualiStartAt: at('2026-09-04T15:30:00Z'),
      sprintStartAt: at('2026-09-05T10:00:00Z'),
    };
    const base = {
      race: sprintRace,
      now: at('2026-09-05T12:00:00Z'),
      results: { sprint_quali: podium, sprint: podium },
    };
    expect(
      buildTrmnlPayload(input({ ...base, news: news('2026-09-04T10:00:00Z') }))
        .focus,
    ).toBe('result');
    const latestNews = buildTrmnlPayload(
      input({ ...base, news: news('2026-09-05T11:00:00Z') }),
    );
    expect(latestNews.focus).toBe('news');
    expect(latestNews.news).toEqual([
      { headline: 'Antonelli takes a grid penalty' },
    ]);
  });

  it('gives pole its lap and everyone else a gap within their part', () => {
    const rows = [
      {
        position: 1,
        code: 'VER',
        displayName: 'Max Verstappen',
        qualifyingSeconds: [96.477, 95.9, 95.13],
      },
      {
        position: 2,
        code: 'HAM',
        displayName: 'Lewis Hamilton',
        qualifyingSeconds: [96.6, 95.85, 95.428],
      },
      {
        position: 11,
        code: 'LAW',
        displayName: 'Liam Lawson',
        qualifyingSeconds: [97.1, 97.023, null],
      },
      {
        position: 16,
        code: 'LIN',
        displayName: 'Arvid Lindblad',
        qualifyingSeconds: [97.883, null, null],
      },
      {
        position: 22,
        code: 'PER',
        displayName: 'Sergio Perez',
        qualifyingSeconds: [null, null, null],
      },
    ];
    const best = fastestPerPart(rows);
    expect(best).toEqual([96.477, 95.85, 95.13]);
    expect(formatGap(rows[0]!, best)).toBe('1:35.130');
    expect(formatGap(rows[1]!, best)).toBe('+0.298');
    // Lawson's Q2 lap against Q2's fastest (Hamilton), not Verstappen's pole.
    expect(formatGap(rows[2]!, best)).toBe('+1.173');
    expect(formatGap(rows[3]!, best)).toBe('+1.406');
    expect(formatGap(rows[4]!, best)).toBe('');
    // Without the session's other laps, the lap itself.
    expect(formatGap(rows[2]!)).toBe('1:37.023');
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

  it('puts news that changes a session ahead of newer general news', () => {
    const payload = buildTrmnlPayload(
      input({
        now: at('2026-10-02T12:00:00Z'),
        news: [
          {
            headline: 'Pole slot repainted',
            publishedAt: at('2026-10-01T15:00:00Z'),
            affectsSessions: [],
          },
          {
            headline: 'Colapinto drops 15 places',
            publishedAt: at('2026-09-26T09:00:00Z'),
            affectsSessions: ['race'],
          },
          {
            headline: 'Heat hazard declared',
            publishedAt: at('2026-09-30T09:00:00Z'),
          },
          {
            headline: 'Hadjar drops five places',
            publishedAt: at('2026-10-01T09:00:00Z'),
            affectsSessions: ['race'],
          },
        ],
      }),
    );

    expect(payload.news.map((item) => item.headline)).toEqual([
      'Hadjar drops five places',
      'Colapinto drops 15 places',
      'Pole slot repainted',
      'Heat hazard declared',
    ]);
  });

  it('counts a changed headline as new news', () => {
    const payload = buildTrmnlPayload(
      input({
        now: at('2026-10-02T12:00:00Z'),
        news: [
          {
            headline: 'Hadjar drops five places',
            publishedAt: at('2026-10-01T09:00:00Z'),
            affectsSessions: ['race'],
          },
          {
            headline: 'Colapinto drops 15 places',
            publishedAt: at('2026-09-26T09:00:00Z'),
            headlineUpdatedAt: at('2026-10-02T08:00:00Z'),
            affectsSessions: ['race'],
          },
        ],
      }),
    );

    expect(payload.news.map((item) => item.headline)).toEqual([
      'Colapinto drops 15 places',
      'Hadjar drops five places',
    ]);
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
      condition: 'Fair',
      temp: '26°C',
      rain: '',
      rainAmount: 'Dry',
      wind: 'NE 11 km/h',
      text: 'Fair · 26°C',
    });
    expect(byRow.Quali).toEqual({
      icon: 'https://trmnl.com/images/plugins/weather/wi-rain.svg',
      condition: 'Rain',
      temp: '23°C',
      rain: '60%',
      rainAmount: '2.4 mm',
      wind: 'NE 11 km/h',
      text: 'Rain · 23°C · 60%',
    });
    // Sunday is outside this forecast, so the race row says nothing.
    expect(byRow.Race).toBe(null);
    // The lead carries its own session's forecast for the small layouts.
    expect(payload.lead?.weather).toEqual(byRow.FP3);

    const imperial = buildTrmnlPayload(
      input({ now: at('2026-09-05T08:00:00Z'), weather, units: 'imperial' }),
    );
    expect(
      imperial.schedule.find((row) => row.short === 'Quali')?.weather,
    ).toMatchObject({
      temp: '73°F',
      rainAmount: '0.09 in',
      wind: 'NE 7 mph',
    });

    const stale = buildTrmnlPayload(
      input({
        now: at('2026-09-05T08:00:00Z'),
        weather: { ...weather, isStale: true },
      }),
    );
    expect(stale.lead?.weather).toBe(null);
    expect(stale.schedule.every((row) => row.weather === null)).toBe(true);
  });

  it('uses compact practice labels in the full schedule', () => {
    const [fp1] = buildTrmnlPayload(input()).schedule;
    expect([fp1.label, fp1.short]).toEqual(['FP1', 'FP1']);
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

describe('grid_news', () => {
  it('leaves out the item that carried the grid, at most two', () => {
    const { payload } = TRMNL_SCENARIOS.find((s) => s.id === 'race-morning')!;
    expect(payload.grid.length).toBeGreaterThan(0);
    expect(payload.grid_news.length).toBeGreaterThan(0);
    expect(payload.grid_news.length).toBeLessThanOrEqual(2);
    expect(payload.grid_news.map((n) => n.headline)).not.toContain(
      'Starting grid confirmed',
    );
    expect(payload.news.map((n) => n.headline)).toContain(
      'Starting grid confirmed',
    );
  });

  it('is empty without a grid', () => {
    const { payload } = TRMNL_SCENARIOS.find((s) => s.id === 'friday')!;
    expect(payload.grid).toEqual([]);
    expect(payload.grid_news).toEqual([]);
  });
});
