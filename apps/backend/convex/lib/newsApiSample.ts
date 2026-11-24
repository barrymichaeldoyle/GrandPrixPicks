import type { NewsPage } from '../newsApi';

const BAHRAIN_2026 = {
  slug: 'bahrain-2026',
  name: 'Bahrain Grand Prix',
  season: 2026,
  round: 16,
};

/**
 * The page `/api/v1/news/sample` serves without a key: three prod stories
 * from the 2026 Bahrain Grand Prix at Sepang, copied by hand as they read on
 * 2026-11-20, in the order the list would return them.
 *
 * Every field is what the API would answer for these rows except `topic`,
 * which those rows gain when `newsApi:backfillTopics` runs on prod. `url` is
 * null because the Sepang write-up is finished and no longer shows its cards.
 * The sample is English only, so `languages` is `["en"]` whatever
 * translations those rows have.
 *
 * `newsApi:sample` returns this through the list's own `returns` validator,
 * so a field added to the item and not here fails on every call and in
 * `newsApi.test.ts`.
 */
export const NEWS_API_SAMPLE: NewsPage = {
  data: [
    {
      id: 'p17225g9cr53ed3zx0wy7ffjf58fa2c2',
      key: 'sepang-weather-forecast',
      status: 'published',
      language: 'en',
      languages: ['en'],
      headline: 'Showers remain possible for the Sepang race',
      body: "Thundery showers remain possible at the 15:00 local start after every F1 session so far ran in dry conditions. Hot, humid weather is expected, and Sepang's conditions can change quickly.",
      url: null,
      source: {
        name: 'Crash',
        url: 'https://www.crash.net/f1/news/1105911/1/it-going-rain-f1-bahrain-gp-malaysia-full-weather-forecast',
        publishedAt: '2026-10-03T13:42:00.000Z',
      },
      race: BAHRAIN_2026,
      sessions: [],
      topic: 'weather',
      drivers: [],
      team: null,
      startingGrid: null,
      publishedAt: '2026-09-29T06:56:34.480Z',
      updatedAt: '2026-10-04T05:48:15.444Z',
    },
    {
      id: 'p179gcn9c73ad77gkertjyh2p98f4ktg',
      key: 'mercedes-sepang-upgrade',
      status: 'published',
      language: 'en',
      languages: ['en'],
      headline: 'Mercedes brings a new floor and sidepods to Sepang',
      body: "Mercedes has reworked the floor and replaced the undercut sidepods with a ramped design. It is the team's first large upgrade package since the Canadian Grand Prix in May. Russell calls it a large step and hopes it brings Mercedes back to the front on the type of circuit that has been harder for them in the past six races.",
      url: null,
      source: {
        name: 'Autosport',
        url: 'https://www.autosport.com/f1/news/mercedes-introduces-new-floor-sidepods-for-f1-bahrain-gp/10860785/',
        publishedAt: '2026-10-02T05:31:00.000Z',
      },
      race: BAHRAIN_2026,
      sessions: [],
      topic: 'technical',
      drivers: [
        { code: 'ANT', number: 12, name: 'Kimi Antonelli', team: 'Mercedes' },
        { code: 'RUS', number: 63, name: 'George Russell', team: 'Mercedes' },
      ],
      team: 'Mercedes',
      startingGrid: null,
      publishedAt: '2026-09-26T17:13:58.858Z',
      updatedAt: '2026-10-02T06:43:58.832Z',
    },
    {
      id: 'p171ettxqmr6w8r0zkvhx1cpn98f4ws0',
      key: 'colapinto-sepang-grid-penalty',
      status: 'published',
      language: 'en',
      languages: ['en'],
      headline: 'Colapinto drops 15 places on the Sepang grid',
      body: 'Colapinto carries a five-place drop from the Baku restart collision with Gasly and Norris, and takes a fifth engine for Sepang, which adds 10 more. It moves his race start only: his qualifying result stands as set.',
      url: null,
      source: {
        name: 'Formula 1',
        url: 'https://www.formula1.com/en/latest/article/hadjar-lindblad-and-colapinto-set-for-grid-penalties-at-bahrain-gp-in-malaysia.3eufcSTLQCJfXZ5kq3wYlt',
        publishedAt: '2026-10-02T05:55:03.757Z',
      },
      race: BAHRAIN_2026,
      sessions: ['race'],
      topic: 'penalty',
      drivers: [
        {
          code: 'COL',
          number: 43,
          name: 'Franco Colapinto',
          team: 'Alpine',
        },
      ],
      team: 'Alpine',
      startingGrid: null,
      publishedAt: '2026-09-26T17:13:56.783Z',
      updatedAt: '2026-10-02T20:18:09.179Z',
    },
  ],
  nextCursor: null,
  hasMore: false,
};
