import { describe, expect, it } from 'vitest';

import driversHandler from '../routes/api/v1/drivers.get';
import listHandler from '../routes/api/v1/news/index.get';
import itemHandler from '../routes/api/v1/news/[id].get';
import racesHandler from '../routes/api/v1/races.get';
import teamsHandler from '../routes/api/v1/teams.get';
import {
  bearerKey,
  NEWS_API_ERRORS,
  NEWS_API_ITEM_PARAMS,
  NEWS_API_LANGUAGES,
  NEWS_API_LIST_PARAMS,
  NEWS_API_RACES_PARAMS,
  NEWS_API_TEAMS,
  parseNewsItemRequest,
  parseNewsListQuery,
  parseNoParams,
  parseRacesQuery,
  quotaHeaders,
} from './newsApi';
import { newsApiSpec } from './newsApiSpec';

function parse(query: string) {
  return parseNewsListQuery(new URLSearchParams(query));
}

describe('news API query', () => {
  it('reads every documented parameter', () => {
    expect(
      parse(
        'limit=10&cursor=abc_-1&updated_since=2026-11-20T09:00:00Z&race=italy-2026&season=2026&published_after=2026-09-01T00:00:00Z&published_before=2026-10-01T00:00:00%2B02:00&driver=lec&team=ferrari&topic=penalty',
      ),
    ).toEqual({
      limit: 10,
      cursor: 'abc_-1',
      updatedSince: Date.parse('2026-11-20T09:00:00Z'),
      race: 'italy-2026',
      season: 2026,
      publishedAfter: Date.parse('2026-09-01T00:00:00Z'),
      publishedBefore: Date.parse('2026-10-01T00:00:00+02:00'),
      driver: 'lec',
      // Any casing in, the canonical name out.
      team: 'Ferrari',
      topic: 'penalty',
    });
    expect(parse('')).toEqual({});
  });

  it('resolves a language tag to the base language that serves it', () => {
    expect(parse('lang=en')).toEqual({ lang: 'en' });
    expect(parse('lang=en-GB')).toEqual({ lang: 'en' });
    expect(parse('lang=es')).toEqual({ lang: 'es' });
    expect(parse('lang=es-MX')).toEqual({ lang: 'es' });
    expect(parse('lang=pt-BR')).toEqual({ lang: 'pt' });
    expect(parse('lang=JA')).toEqual({ lang: 'ja' });
    expect(parse('lang=zh-CN')).toEqual({ lang: 'zh' });
    expect(parse('lang=ar&topic=penalty')).toEqual({
      lang: 'ar',
      topic: 'penalty',
    });
  });

  it('refuses a language it cannot serve, naming the ones it can', () => {
    expect(parse('lang=ko')).toEqual({ code: 'unsupported_language' });
    // The Chinese translation is Simplified.
    expect(parse('lang=zh-TW')).toEqual({ code: 'unsupported_language' });
    expect(parse('lang=zh-Hant')).toEqual({ code: 'unsupported_language' });
    expect(parse('lang=!!')).toMatchObject({ code: 'invalid_request' });
    expect(NEWS_API_ERRORS.unsupported_language[1]).toContain(
      'en, es, pt, fr, de, it, nl, pl, tr, ja, zh, ar',
    );
  });

  it('answers a translation on the wrong plan with a 403', () => {
    expect(NEWS_API_ERRORS.plan_required[0]).toBe(403);
  });

  it('refuses a team that is not on the grid, as unknown_team', () => {
    expect(parse('team=Red Bull Racing')).toEqual({ team: 'Red Bull Racing' });
    expect(parse('team=Sauber')).toEqual({ code: 'unknown_team' });
  });

  it.each([
    'limit=0',
    'limit=101',
    'limit=ten',
    'cursor=a+b',
    'updated_since=2026-11-20',
    'updated_since=2026-11-20T09:00:00',
    'updated_since=yesterday',
    'published_after=2026-11-20',
    'published_before=2026-11-20T09:00:00',
    'published_after=2026-10-01T00:00:00Z&published_before=2026-10-01T00:00:00Z',
    'season=26',
    'season=2026.5',
    'race=Italy 2026',
    'driver=LECLERC',
    'team=',
    'topic=gossip',
    'seasn=2026',
    'limit=1&limit=2',
  ])('refuses %s with a sentence', (query) => {
    expect(parse(query)).toMatchObject({
      code: 'invalid_request',
      message: expect.any(String),
    });
  });
});

describe('news API reference and item queries', () => {
  it('takes lang on an item and nothing else', () => {
    function item(path: string) {
      return parseNewsItemRequest(new URL(`https://grandprixpicks.com${path}`));
    }
    expect(item('/api/v1/news/abc123')).toEqual({ id: 'abc123' });
    expect(item('/api/v1/news/abc123?lang=en-GB')).toEqual({
      id: 'abc123',
      lang: 'en',
    });
    expect(item('/api/v1/news/abc123?lang=fr-CA')).toEqual({
      id: 'abc123',
      lang: 'fr',
    });
    expect(item('/api/v1/news/abc123?lang=ko')).toEqual({
      code: 'unsupported_language',
    });
    expect(item('/api/v1/news/abc123?limit=1')).toMatchObject({
      code: 'invalid_request',
    });
    expect(item('/api/v1/news/Not_An_Id')).toEqual({ code: 'not_found' });
  });

  it('takes season on races, and nothing on drivers or teams', () => {
    expect(parseRacesQuery(new URLSearchParams(''))).toEqual({});
    expect(parseRacesQuery(new URLSearchParams('season=2026'))).toEqual({
      season: 2026,
    });
    expect(parseRacesQuery(new URLSearchParams('season=next'))).toMatchObject({
      code: 'invalid_request',
    });
    expect(parseNoParams(new URLSearchParams(''))).toEqual({});
    expect(parseNoParams(new URLSearchParams('team=Ferrari'))).toMatchObject({
      code: 'invalid_request',
    });
  });

  it('lists every team with its code', () => {
    expect(NEWS_API_TEAMS).toContainEqual({ name: 'Ferrari', code: 'FER' });
    expect(NEWS_API_TEAMS).toContainEqual({
      name: 'Red Bull Racing',
      code: 'RBR',
    });
  });
});

describe('news API rate-limit headers', () => {
  it('states the limit, what is left and when it is all back', () => {
    expect(quotaHeaders({ limit: 60, remaining: 59, resetSeconds: 1 })).toEqual(
      {
        'ratelimit-limit': '60',
        'ratelimit-remaining': '59',
        'ratelimit-reset': '1',
      },
    );
  });
});

describe('news API key header', () => {
  it('takes a bearer token and nothing else', () => {
    function request(authorization?: string) {
      return new Request('https://grandprixpicks.com/api/v1/news', {
        headers: authorization ? { authorization } : {},
      });
    }
    expect(bearerKey(request('Bearer gpp_abc'))).toBe('gpp_abc');
    expect(bearerKey(request('bearer gpp_abc'))).toBe('gpp_abc');
    expect(bearerKey(request())).toBeNull();
    expect(bearerKey(request('Basic gpp_abc'))).toBeNull();
    expect(bearerKey(request(`Bearer ${'a'.repeat(101)}`))).toBeNull();
  });
});

describe('news API routes, before the backend is read', () => {
  it('answers 401 without a key', async () => {
    for (const handler of [
      listHandler,
      itemHandler,
      racesHandler,
      driversHandler,
      teamsHandler,
    ]) {
      const response = await handler({
        req: new Request('https://grandprixpicks.com/api/v1/news/abc'),
      });
      expect(response.status).toBe(401);
      expect(response.headers.get('cache-control')).toBe('private, no-store');
      expect(response.headers.get('www-authenticate')).toBe('Bearer');
      expect(await response.json()).toMatchObject({
        error: { code: 'unauthorized' },
      });
    }
  });

  it('answers 400 for a bad query and 404 for an id that cannot exist', async () => {
    const headers = { authorization: 'Bearer gpp_abc' };
    const bad = await listHandler({
      req: new Request('https://grandprixpicks.com/api/v1/news?limit=500', {
        headers,
      }),
    });
    expect(bad.status).toBe(400);
    expect(await bad.json()).toEqual({
      error: {
        code: 'invalid_request',
        message: '"limit" is a whole number from 1 to 100.',
      },
    });

    const team = await listHandler({
      req: new Request('https://grandprixpicks.com/api/v1/news?team=Sauber', {
        headers,
      }),
    });
    expect(team.status).toBe(400);
    expect(await team.json()).toMatchObject({
      error: { code: 'unknown_team' },
    });

    const missing = await itemHandler({
      req: new Request('https://grandprixpicks.com/api/v1/news/Not_An_Id', {
        headers,
      }),
    });
    expect(missing.status).toBe(404);
    expect(await missing.json()).toEqual({
      error: { code: 'not_found', message: 'No story has that id.' },
    });

    const extra = await itemHandler({
      req: new Request(
        'https://grandprixpicks.com/api/v1/news/abc123?race=italy-2026',
        { headers },
      ),
    });
    expect(extra.status).toBe(400);
  });
});

describe('news API OpenAPI document', () => {
  const spec = newsApiSpec();
  const paths = spec.paths;

  function names(parameters: { name: string; in: string }[]) {
    return parameters
      .filter((parameter) => parameter.in === 'query')
      .map((parameter) => parameter.name);
  }

  it('describes every parameter each parser accepts', () => {
    expect(names(paths['/news'].get.parameters)).toEqual(NEWS_API_LIST_PARAMS);
    expect(names(paths['/news/{id}'].get.parameters)).toEqual(
      NEWS_API_ITEM_PARAMS,
    );
    expect(names(paths['/races'].get.parameters)).toEqual(
      NEWS_API_RACES_PARAMS,
    );
    for (const parameter of [
      ...paths['/news'].get.parameters,
      ...paths['/races'].get.parameters,
    ]) {
      expect(parameter.description, parameter.name).toBeTruthy();
    }
  });

  it('documents every status an error code can answer with', () => {
    const documented = new Set(
      Object.values(paths).flatMap((path) => Object.keys(path.get.responses)),
    );
    for (const [code, [status]] of Object.entries(NEWS_API_ERRORS)) {
      expect(documented.has(String(status)), code).toBe(true);
    }
    expect(
      spec.components.schemas.Error.properties.error.properties.code.enum,
    ).toEqual(Object.keys(NEWS_API_ERRORS));
  });

  it('offers lang in every language the parser serves', () => {
    const lang = paths['/news'].get.parameters.find(
      (parameter) => 'name' in parameter && parameter.name === 'lang',
    );
    expect(lang?.schema).toMatchObject({ enum: [...NEWS_API_LANGUAGES] });
    expect(
      spec.components.schemas.PublishedStory.properties.languages.items,
    ).toEqual({ enum: [...NEWS_API_LANGUAGES] });
  });

  it('opens the sample to callers without a key', () => {
    expect(paths['/news/sample'].get.security).toEqual([]);
  });
});
