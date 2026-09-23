import { api } from '@convex-generated/api';
import { createServerFn } from '@tanstack/react-start';

import { convexHttp } from '@/integrations/convex/client';
import { withRetry } from '@/lib/retry';

import type { TrmnlInput, TrmnlPayload } from './payload';
import { buildTrmnlPayload } from './payload';
import { pickReplay, replayWeekend, TRMNL_MOMENTS } from './replay';
import type { TrmnlNewsCount } from './scenarios';
import {
  SAMPLE_OFF_SEASON_NEWS,
  sampleNewsVariant,
  TRMNL_NEWS_COUNTS,
  TRMNL_SCENARIOS,
} from './scenarios';
import type { TrmnlWeekendData } from './weekendData';
import { loadTrmnlOffSeason, loadTrmnlWeekend } from './weekendData';

/** One tab of the `/trmnl` page. */
export type TrmnlPageScenario = {
  id: string;
  label: string;
  /** What the screen is showing, e.g. "Azerbaijan Grand Prix, live now." */
  caption: string;
  payload: TrmnlPayload;
  /**
   * The screen with 0, 1, 2 or 20 sample headlines instead of its news, for
   * the page's news switch: only the fields news changes.
   */
  news: Record<`${TrmnlNewsCount}`, Pick<TrmnlPayload, 'news' | 'focus'>>;
};

/** A tab, built from the input its screen comes from. */
function pageScenario(
  meta: Pick<TrmnlPageScenario, 'id' | 'label' | 'caption'>,
  input: TrmnlInput,
): TrmnlPageScenario {
  return {
    ...meta,
    payload: buildTrmnlPayload(input),
    news: Object.fromEntries(
      TRMNL_NEWS_COUNTS.map((count) => [
        String(count),
        sampleNewsVariant(input, count),
      ]),
    ) as TrmnlPageScenario['news'],
  };
}

const ZONE = 'Europe/London';
const LOCALE = 'en-GB';

const whenFormat = new Intl.DateTimeFormat(LOCALE, {
  timeZone: ZONE,
  weekday: 'short',
  day: 'numeric',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});

/**
 * The `/trmnl` page's screens, from the site's real data.
 *
 * Each moment of a weekend shows the next race if that moment has come for
 * it, otherwise the latest weekend it has come for, replayed as it stood then
 * (`pickReplay`, `replayWeekend`). So the build-up is this weekend's, live,
 * and the rest are last weekend's until this one reaches them. A moment no
 * weekend has reached yet, such as a sprint before the first sprint weekend,
 * falls back to the sample weekend in `scenarios.ts`, and says so. The
 * off-season is always the sample: it has no race by definition.
 *
 * A server function so none of this, nor the payload builder, ships in the
 * site's main bundle: route loaders are not code-split, and a loader that
 * imported these would put them on every page.
 */
export const fetchTrmnlPageScenarios = createServerFn({
  method: 'GET',
}).handler(async (): Promise<TrmnlPageScenario[]> => {
  const now = Date.now();
  const { season, races } = await withRetry(() =>
    convexHttp.query(api.races.listCurrentSeason, {}),
  );

  const picks = TRMNL_MOMENTS.map((moment) => ({
    moment,
    pick: pickReplay(races, moment.id, now),
  }));

  const weekends = new Map<string, TrmnlWeekendData>();
  await Promise.all(
    [...new Set(picks.flatMap(({ pick }) => (pick ? [pick.race] : [])))].map(
      async (race) => {
        weekends.set(
          race.slug,
          await withRetry(() =>
            loadTrmnlWeekend(
              convexHttp,
              race,
              now,
              race.raceStartAt < now ? 'writeup' : 'live',
            ),
          ),
        );
      },
    ),
  );

  const scenarios = picks.map(({ moment, pick }): TrmnlPageScenario => {
    const weekend = pick && weekends.get(pick.race.slug);
    if (!pick || !weekend) {
      const sample = TRMNL_SCENARIOS.find((s) => s.id === moment.id);
      return pageScenario(
        {
          id: moment.id,
          label: moment.label,
          caption: `${sample?.moment ?? moment.label}. No weekend has reached this yet, so this is a sample with invented results and news.`,
        },
        (sample ?? TRMNL_SCENARIOS[0]).input,
      );
    }
    return pageScenario(
      {
        id: moment.id,
        label: moment.label,
        caption: pick.live
          ? `${pick.race.name}, live now.`
          : `${pick.race.name}, as it stood on ${whenFormat.format(pick.at)}.`,
      },
      {
        now: pick.at,
        timeZone: ZONE,
        locale: LOCALE,
        ...replayWeekend(weekend, pick.at),
      },
    );
  });

  scenarios.push(await offSeasonScenario(season, now));
  return scenarios;
});

/**
 * The off-season screen with this season's real standings as they stand now.
 * Its news is always the sample: off-season news is months away.
 */
async function offSeasonScenario(
  season: number,
  now: number,
): Promise<TrmnlPageScenario> {
  const { standings } = await withRetry(() =>
    loadTrmnlOffSeason(convexHttp, season),
  );
  const real = (standings?.drivers.length ?? 0) > 0;
  const sample = TRMNL_SCENARIOS.find((s) => s.id === 'off-season');
  return pageScenario(
    {
      id: 'off-season',
      label: 'Off-season',
      caption: real
        ? `After the last race of the season: the ${season} standings as they are today, with sample news.`
        : 'After the last race of the season. A sample, with invented standings and news.',
    },
    real
      ? {
          now,
          timeZone: ZONE,
          locale: LOCALE,
          race: null,
          results: {},
          practice: [],
          weather: null,
          standings,
          news: SAMPLE_OFF_SEASON_NEWS,
        }
      : (sample ?? TRMNL_SCENARIOS[0]).input,
  );
}
