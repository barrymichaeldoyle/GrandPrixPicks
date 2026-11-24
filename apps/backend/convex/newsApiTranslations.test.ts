/// <reference types="vite/client" />
import rateLimiter from '@convex-dev/rate-limiter/test';
import { NEWS_TRANSLATION_LANGUAGES } from '@grandprixpicks/shared/newsLanguages';
import { convexTest } from 'convex-test';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { internal } from './_generated/api';
import { translationSourceHash } from './lib/newsApiTranslations';
import { translationProblem } from './newsApiTranslations';
import schema from './schema';

const modules = import.meta.glob('./**/*.ts');

const HOUR = 60 * 60 * 1000;
const START = Date.UTC(2026, 10, 20, 9, 0, 0);
const CODES = NEWS_TRANSLATION_LANGUAGES.map(({ code }) => code);

// Every timer is fake, so the translation publish books never runs on its
// own: each test runs `translate` itself, against a stubbed `fetch`.
beforeEach(() => {
  vi.useFakeTimers({ now: START });
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

async function setup(plan: 'free' | 'hobby' | 'commercial' = 'commercial') {
  const t = convexTest(schema, modules);
  rateLimiter.register(t);
  await t.run(async (ctx) => {
    await ctx.db.insert('races', {
      season: 2026,
      round: 1,
      name: 'Test Grand Prix',
      slug: 'test-2026',
      raceStartAt: START + 24 * HOUR,
      predictionLockAt: START + 24 * HOUR,
      status: 'upcoming',
      createdAt: START,
      updatedAt: START,
    });
  });
  const { key } = await t.mutation(internal.newsApi.createKey, {
    label: 'test',
    plan,
  });
  return { t, key };
}

const STORY = {
  raceSlug: 'test-2026',
  key: 'grid-penalty',
  headline: 'Antonelli takes a grid penalty',
  body: 'Antonelli drops five places for a new gearbox.',
  category: 'general' as const,
  affectsSessions: [],
  sourceName: 'Formula 1',
  sourceUrl: 'https://example.com/grid-penalty',
};

async function onlyStory(t: ReturnType<typeof convexTest>) {
  const rows = await t.run((ctx) => ctx.db.query('raceNews').collect());
  expect(rows).toHaveLength(1);
  return rows[0]!;
}

/** A translation written straight to the table, as a run would store it. */
async function insertTranslation(
  t: ReturnType<typeof convexTest>,
  newsId: string,
  language: (typeof CODES)[number],
  english: { headline: string; body: string },
) {
  const sourceHash = await translationSourceHash(
    english.headline,
    english.body,
  );
  await t.run((ctx) =>
    ctx.db.insert('newsApiTranslations', {
      newsId,
      language,
      headline: `[${language}] ${english.headline}`,
      body: `[${language}] ${english.body}`,
      sourceHash,
      translatedAt: Date.now(),
    }),
  );
}

/** Every language, translated as `[code] <English>`. */
function modelOutput(
  english: { headline: string; body: string },
  overrides: Record<string, unknown> = {},
) {
  return {
    ...Object.fromEntries(
      CODES.map((code) => [
        code,
        {
          headline: `[${code}] ${english.headline}`,
          body: `[${code}] ${english.body}`,
        },
      ]),
    ),
    ...overrides,
  };
}

/** A stub for `fetch` that answers like the Messages API. */
function stubClaude(output: unknown, status = 200) {
  const requests: { url: string; body: Record<string, unknown> }[] = [];
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string, init: RequestInit) => {
      requests.push({ url, body: JSON.parse(String(init.body)) });
      if (status !== 200) {
        return new Response('{}', { status });
      }
      return Response.json({
        stop_reason: 'end_turn',
        content: [{ type: 'text', text: JSON.stringify(output) }],
      });
    }),
  );
  return requests;
}

async function translations(t: ReturnType<typeof convexTest>) {
  return await t.run((ctx) => ctx.db.query('newsApiTranslations').collect());
}

async function scheduledTranslations(t: ReturnType<typeof convexTest>) {
  const jobs = await t.run((ctx) =>
    ctx.db.system.query('_scheduled_functions').collect(),
  );
  return jobs.filter((job) => job.name.includes('newsApiTranslations'));
}

describe('serving a translation', () => {
  it('serves lang when a translation of the current English exists', async () => {
    const { t, key } = await setup();
    await t.mutation(internal.raceNews.publish, STORY);
    const story = await onlyStory(t);
    await insertTranslation(t, story._id, 'es', STORY);

    const es = await t.query(internal.newsApi.list, {
      apiKey: key,
      now: START + HOUR,
      lang: 'es',
    });
    if (!es.ok) {
      throw new Error(es.error);
    }
    expect(es.data[0]).toMatchObject({
      language: 'es',
      languages: ['en', 'es'],
      headline: `[es] ${STORY.headline}`,
      body: `[es] ${STORY.body}`,
      key: STORY.key,
      source: { name: 'Formula 1' },
    });

    const item = await t.query(internal.newsApi.get, {
      apiKey: key,
      id: story._id,
      now: START + HOUR,
      lang: 'es',
    });
    expect(item).toMatchObject({
      ok: true,
      data: { language: 'es', headline: `[es] ${STORY.headline}` },
    });

    // A language with no translation reads in English, and says so.
    const fr = await t.query(internal.newsApi.get, {
      apiKey: key,
      id: story._id,
      now: START + HOUR,
      lang: 'fr',
    });
    expect(fr).toMatchObject({
      ok: true,
      data: {
        language: 'en',
        languages: ['en', 'es'],
        headline: STORY.headline,
      },
    });

    // English, asked for or not, lists the languages too.
    const en = await t.query(internal.newsApi.list, {
      apiKey: key,
      now: START + HOUR,
    });
    expect(en.ok && en.data[0]).toMatchObject({
      language: 'en',
      languages: ['en', 'es'],
      headline: STORY.headline,
    });
  });

  it('serves English once the story is corrected, never the stale translation', async () => {
    const { t, key } = await setup();
    await t.mutation(internal.raceNews.publish, STORY);
    const story = await onlyStory(t);
    await insertTranslation(t, story._id, 'es', STORY);

    const corrected = 'Antonelli drops ten places for a new power unit.';
    await t.mutation(internal.raceNews.publish, { ...STORY, body: corrected });

    const es = await t.query(internal.newsApi.get, {
      apiKey: key,
      id: story._id,
      now: START + HOUR,
      lang: 'es',
    });
    expect(es).toMatchObject({
      ok: true,
      data: { language: 'en', languages: ['en'], body: corrected },
    });
  });

  it('keeps the tombstone as it was', async () => {
    const { t, key } = await setup();
    await t.mutation(internal.raceNews.publish, STORY);
    const story = await onlyStory(t);
    await insertTranslation(t, story._id, 'es', STORY);
    await t.mutation(internal.raceNews.retract, {
      raceSlug: STORY.raceSlug,
      key: STORY.key,
    });
    const item = await t.query(internal.newsApi.get, {
      apiKey: key,
      id: story._id,
      now: START + HOUR,
      lang: 'es',
    });
    expect(item.ok && Object.keys(item.data).sort()).toEqual([
      'id',
      'key',
      'status',
      'updatedAt',
    ]);
  });
});

describe('the plan gate', () => {
  it.each(['free', 'hobby'] as const)(
    'refuses a translation on a %s key, inside the query',
    async (plan) => {
      const { t, key } = await setup(plan);
      await t.mutation(internal.raceNews.publish, STORY);
      const story = await onlyStory(t);
      const now = START + 25 * HOUR;

      expect(
        await t.query(internal.newsApi.list, { apiKey: key, now, lang: 'de' }),
      ).toEqual({ ok: false, error: 'plan_required' });
      expect(
        await t.query(internal.newsApi.get, {
          apiKey: key,
          id: story._id,
          now,
          lang: 'de',
        }),
      ).toEqual({ ok: false, error: 'plan_required' });

      // English stays open to every plan.
      const en = await t.query(internal.newsApi.list, {
        apiKey: key,
        now,
        lang: 'en',
      });
      expect(en.ok).toBe(true);
    },
  );
});

describe('translate', () => {
  it('stores every language, bumps updatedAt once, and fires nothing else', async () => {
    vi.stubEnv('ANTHROPIC_API_KEY', 'sk-test');
    const { t, key } = await setup();
    await t.mutation(internal.raceNews.publish, STORY);
    const story = await onlyStory(t);
    expect(await scheduledTranslations(t)).toHaveLength(1);
    const feedEvents = await t.run((ctx) =>
      ctx.db.query('feedEvents').collect(),
    );

    const requests = stubClaude(modelOutput(STORY));
    vi.setSystemTime(START + 60_000);
    await t.action(internal.newsApiTranslations.translate, {
      newsId: story._id,
      bump: true,
    });

    expect(requests).toHaveLength(1);
    expect(requests[0]!.url).toBe('https://api.anthropic.com/v1/messages');
    expect(requests[0]!.body).toMatchObject({ model: 'claude-sonnet-5-5' });
    // The story goes as data inside tags, not as instructions.
    expect(JSON.stringify(requests[0]!.body.messages)).toContain('<story>');

    expect((await translations(t)).map((row) => row.language).sort()).toEqual(
      [...CODES].sort(),
    );
    const bumped = await onlyStory(t);
    expect(bumped.updatedAt).toBe(START + 60_000);
    expect(bumped.headline).toBe(STORY.headline);
    // No feed event, and no second translation booked by the bump.
    expect(await t.run((ctx) => ctx.db.query('feedEvents').collect())).toEqual(
      feedEvents,
    );
    expect(await scheduledTranslations(t)).toHaveLength(1);

    // The change feed reports the story again, with its languages.
    const changes = await t.query(internal.newsApi.list, {
      apiKey: key,
      now: START + HOUR,
      updatedSince: START + 30_000,
    });
    expect(changes.ok && changes.data).toEqual([
      expect.objectContaining({
        language: 'en',
        languages: ['en', ...CODES].sort(),
      }),
    ]);

    // A second run finds nothing to do: no request, no bump.
    vi.setSystemTime(START + 120_000);
    await t.action(internal.newsApiTranslations.translate, {
      newsId: story._id,
      bump: true,
    });
    expect(requests).toHaveLength(1);
    expect((await onlyStory(t)).updatedAt).toBe(START + 60_000);
  });

  it('asks only for the languages still missing', async () => {
    vi.stubEnv('ANTHROPIC_API_KEY', 'sk-test');
    const { t } = await setup();
    await t.mutation(internal.raceNews.publish, STORY);
    const story = await onlyStory(t);
    for (const code of CODES.filter((code) => code !== 'ja')) {
      await insertTranslation(t, story._id, code, STORY);
    }
    const requests = stubClaude(modelOutput(STORY));
    await t.action(internal.newsApiTranslations.translate, {
      newsId: story._id,
      bump: true,
    });
    const format = (
      requests[0]!.body.output_config as { format: { schema: object } }
    ).format;
    expect(format.schema).toMatchObject({ required: ['ja'] });
    expect(await translations(t)).toHaveLength(CODES.length);
  });

  it('stores the languages that pass and drops the rest', async () => {
    vi.stubEnv('ANTHROPIC_API_KEY', 'sk-test');
    const { t } = await setup();
    await t.mutation(internal.raceNews.publish, STORY);
    const story = await onlyStory(t);
    const before = story.updatedAt;
    stubClaude(
      modelOutput(STORY, {
        es: { headline: '<b>Antonelli</b>', body: 'Penalización.' },
        fr: undefined,
        de: { headline: '  ', body: 'Strafe.' },
        it: { headline: 'Antonelli\npenalità', body: 'Penalità.' },
        nl: { headline: 'Antonelli', body: STORY.body },
        pl: { headline: 'Antonelli', body: 'x'.repeat(5_000) },
      }),
    );
    vi.setSystemTime(START + 60_000);
    await t.action(internal.newsApiTranslations.translate, {
      newsId: story._id,
      bump: true,
    });
    expect((await translations(t)).map((row) => row.language).sort()).toEqual([
      'ar',
      'ja',
      'pt',
      'tr',
      'zh',
    ]);
    expect((await onlyStory(t)).updatedAt).not.toBe(before);
  });

  it('stores nothing and bumps nothing when every language fails', async () => {
    vi.stubEnv('ANTHROPIC_API_KEY', 'sk-test');
    const { t } = await setup();
    await t.mutation(internal.raceNews.publish, STORY);
    const story = await onlyStory(t);
    stubClaude({ es: { headline: 'only one' } });
    vi.setSystemTime(START + 60_000);
    await t.action(internal.newsApiTranslations.translate, {
      newsId: story._id,
      bump: true,
    });
    expect(await translations(t)).toEqual([]);
    expect((await onlyStory(t)).updatedAt).toBe(story.updatedAt);
  });

  it('does nothing without ANTHROPIC_API_KEY', async () => {
    vi.stubEnv('ANTHROPIC_API_KEY', '');
    const log = vi.spyOn(console, 'log').mockImplementation(() => {});
    const { t } = await setup();
    await t.mutation(internal.raceNews.publish, STORY);
    const story = await onlyStory(t);
    const requests = stubClaude(modelOutput(STORY));
    await t.action(internal.newsApiTranslations.translate, {
      newsId: story._id,
      bump: true,
    });
    expect(requests).toEqual([]);
    expect(await translations(t)).toEqual([]);
    expect(log).toHaveBeenCalledTimes(1);
    log.mockRestore();
  });

  it('retries a transient failure and gives up on a permanent one', async () => {
    vi.stubEnv('ANTHROPIC_API_KEY', 'sk-test');
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { t } = await setup();
    await t.mutation(internal.raceNews.publish, STORY);
    const story = await onlyStory(t);

    stubClaude(null, 529);
    await t.action(internal.newsApiTranslations.translate, {
      newsId: story._id,
      bump: true,
    });
    const jobs = await scheduledTranslations(t);
    expect(jobs.map((job) => job.args[0])).toContainEqual({
      newsId: story._id,
      bump: true,
      attempt: 1,
    });

    stubClaude(null, 400);
    await t.action(internal.newsApiTranslations.translate, {
      newsId: story._id,
      bump: true,
      attempt: 1,
    });
    expect(await scheduledTranslations(t)).toHaveLength(jobs.length);
    expect(await translations(t)).toEqual([]);
    error.mockRestore();
  });

  it('does not translate a retracted story', async () => {
    vi.stubEnv('ANTHROPIC_API_KEY', 'sk-test');
    const { t } = await setup();
    await t.mutation(internal.raceNews.publish, STORY);
    const story = await onlyStory(t);
    await t.mutation(internal.raceNews.retract, {
      raceSlug: STORY.raceSlug,
      key: STORY.key,
    });
    const requests = stubClaude(modelOutput(STORY));
    await t.action(internal.newsApiTranslations.translate, {
      newsId: story._id,
      bump: true,
    });
    expect(requests).toEqual([]);
  });

  it('drops a run whose English changed while it was out', async () => {
    const { t } = await setup();
    await t.mutation(internal.raceNews.publish, STORY);
    const story = await onlyStory(t);
    const staleHash = await translationSourceHash(STORY.headline, STORY.body);
    await t.mutation(internal.raceNews.publish, {
      ...STORY,
      body: 'Antonelli drops ten places.',
    });
    const result = await t.mutation(internal.newsApiTranslations.store, {
      newsId: story._id,
      sourceHash: staleHash,
      translations: [{ language: 'es', headline: 'a', body: 'b' }],
      bump: true,
    });
    expect(result).toEqual({ stored: [], bumped: false });
  });

  it('books a translation for a race-independent story too', async () => {
    const { t } = await setup();
    await t.mutation(internal.globalNews.publish, {
      key: 'season-story',
      headline: 'A season-wide story',
      body: 'Something about the calendar as a whole.',
      sourceName: 'FIA',
      sourceUrl: 'https://example.com/season',
    });
    const jobs = await scheduledTranslations(t);
    expect(jobs).toHaveLength(1);
    // A republish of the same text books nothing new.
    await t.mutation(internal.globalNews.publish, {
      key: 'season-story',
      headline: 'A season-wide story',
      body: 'Something about the calendar as a whole.',
      sourceName: 'FIA',
      sourceUrl: 'https://example.com/season',
      topic: 'calendar',
    });
    expect(await scheduledTranslations(t)).toHaveLength(1);
  });
});

describe('backfill', () => {
  it('lists on a dry run, then books runs that do not move updatedAt', async () => {
    vi.stubEnv('ANTHROPIC_API_KEY', 'sk-test');
    const { t } = await setup();
    await t.mutation(internal.raceNews.publish, STORY);
    const story = await onlyStory(t);
    await insertTranslation(t, story._id, 'es', STORY);

    const dry = await t.mutation(internal.newsApiTranslations.backfill, {});
    expect(dry).toEqual({
      dryRun: true,
      stories: [
        {
          id: story._id,
          key: STORY.key,
          missing: CODES.filter((code) => code !== 'es'),
        },
      ],
    });
    const booked = (await scheduledTranslations(t)).length;
    expect(
      await t.mutation(internal.newsApiTranslations.backfill, {
        season: 2026,
        dryRun: false,
      }),
    ).toMatchObject({ dryRun: false, stories: [{ id: story._id }] });
    const jobs = await scheduledTranslations(t);
    expect(jobs).toHaveLength(booked + 1);
    expect(jobs.at(-1)!.args[0]).toEqual({ newsId: story._id, bump: false });

    stubClaude(modelOutput(STORY));
    vi.setSystemTime(START + 60_000);
    await t.action(internal.newsApiTranslations.translate, {
      newsId: story._id,
      bump: false,
    });
    expect(await translations(t)).toHaveLength(CODES.length);
    expect((await onlyStory(t)).updatedAt).toBe(story.updatedAt);
  });
});

describe('remove', () => {
  it('deletes the languages asked for and tells consumers once', async () => {
    const { t, key } = await setup();
    await t.mutation(internal.raceNews.publish, STORY);
    const story = await onlyStory(t);
    await insertTranslation(t, story._id, 'es', STORY);
    await insertTranslation(t, story._id, 'fr', STORY);

    vi.setSystemTime(START + HOUR);
    const result = await t.mutation(internal.newsApiTranslations.remove, {
      newsId: story._id,
      languages: ['es'],
    });
    expect(result).toEqual({ removed: ['es'], bumped: true });
    expect((await onlyStory(t)).updatedAt).toBe(START + HOUR);

    const es = await t.query(internal.newsApi.get, {
      apiKey: key,
      id: story._id,
      now: START + 2 * HOUR,
      lang: 'es',
    });
    expect(es).toMatchObject({
      ok: true,
      data: { language: 'en', languages: ['en', 'fr'] },
    });
  });

  it('moves nothing when only stale translations go', async () => {
    const { t } = await setup();
    await t.mutation(internal.raceNews.publish, STORY);
    const story = await onlyStory(t);
    await insertTranslation(t, story._id, 'es', {
      headline: 'An older headline',
      body: 'An older body before the correction.',
    });
    const before = story.updatedAt;
    vi.setSystemTime(START + HOUR);
    expect(
      await t.mutation(internal.newsApiTranslations.remove, {
        newsId: story._id,
      }),
    ).toEqual({ removed: ['es'], bumped: false });
    expect((await onlyStory(t)).updatedAt).toBe(before);
    expect(await translations(t)).toHaveLength(0);
  });
});

describe('translationProblem', () => {
  const english = { headline: 'A headline', body: 'A body.' };
  it('accepts plain text and refuses the rest', () => {
    expect(
      translationProblem(english, {
        headline: 'Un titular',
        body: 'Un cuerpo.',
      }),
    ).toBeNull();
    expect(translationProblem(english, undefined)).toBe('missing');
    expect(translationProblem(english, { headline: 'x' })).toBe(
      'missing headline or body',
    );
    expect(
      translationProblem(english, { headline: 'x', body: '&lt;p&gt;' }),
    ).toBe('markup');
  });
});
