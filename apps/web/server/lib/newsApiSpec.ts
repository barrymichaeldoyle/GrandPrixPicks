import { NEWS_TOPICS } from '@grandprixpicks/shared/newsTopics';

import { siteConfig } from '../../src/lib/site';
import {
  NEWS_API_ERRORS,
  NEWS_API_ITEM_PARAMS,
  NEWS_API_LANGUAGES,
  NEWS_API_LIST_PARAMS,
  NEWS_API_RACES_PARAMS,
} from './newsApi';

/**
 * The news API as an OpenAPI 3.1 document, served at `/api/v1/openapi.json`.
 *
 * Written by hand beside the code it describes. The parameter names, error
 * codes, topics and languages come from code, and `newsApi.test.ts` fails when
 * a parameter or status code is added there and not described here. The
 * item's fields have no such guard: they are returned by
 * `apps/backend/convex/newsApi.ts` (`newsItemValidator`), so a field added
 * there is added here by hand. The plan limits restate `NEWS_API_PLANS` in
 * the same file.
 */

const PARAMETERS: Record<string, { description: string; schema: object }> = {
  limit: {
    description: 'Items per page.',
    schema: { type: 'integer', minimum: 1, maximum: 100, default: 25 },
  },
  cursor: {
    description:
      'The nextCursor value from the previous response. It carries its order: with a change-feed cursor the request reads the change feed whether or not updated_since is sent. Send the same filters with it.',
    schema: { type: 'string' },
  },
  updated_since: {
    description:
      'Switches to the change feed: every story published, corrected or retracted at or after this moment, oldest change first. ISO 8601 with a zone. Ignored when a cursor is sent.',
    schema: { type: 'string', format: 'date-time' },
  },
  race: {
    description:
      'Race slug, for example italy-2026. /races lists them. Leaves out stories that belong to no race.',
    schema: { type: 'string' },
  },
  season: {
    description:
      "A race story's season is its race's. A story about no race counts in the UTC year it was published.",
    schema: { type: 'integer', minimum: 1950, maximum: 2100 },
  },
  published_after: {
    description:
      'Stories published at or after this moment. ISO 8601 with a zone. In the change feed it filters by publishedAt too.',
    schema: { type: 'string', format: 'date-time' },
  },
  published_before: {
    description:
      'Stories published before this moment. ISO 8601 with a zone. In the change feed it filters by publishedAt too.',
    schema: { type: 'string', format: 'date-time' },
  },
  driver: {
    description:
      'Three-letter driver code, for example LEC. /drivers lists them. Matches the drivers a story names, not the rows of a starting grid.',
    schema: { type: 'string', pattern: '^[A-Za-z]{3}$' },
  },
  team: {
    description:
      "Team name, for example Ferrari, any casing. /teams lists them. Matches the story's team field.",
    schema: { type: 'string' },
  },
  topic: {
    description: 'What the story is about.',
    schema: { enum: [...NEWS_TOPICS] },
  },
  lang: {
    description:
      'Language to read stories in. A regional tag reads its base language: es-MX is es, pt-BR is pt. Any language but en needs a commercial key (403 plan_required otherwise). A story with no translation of its current English is served in English, with language en; languages lists what each story can be read in.',
    schema: { type: 'string', enum: [...NEWS_API_LANGUAGES], default: 'en' },
  },
};

const RATE_LIMIT_HEADERS = {
  'ratelimit-limit': {
    description: "Requests a minute on the key's plan.",
    schema: { type: 'integer' },
  },
  'ratelimit-remaining': {
    description: 'Requests the key has left.',
    schema: { type: 'integer' },
  },
  'ratelimit-reset': {
    description:
      'Seconds until every request is back. Requests come back steadily, so one is free sooner than this.',
    schema: { type: 'integer' },
  },
};

function headerRefs(names: string[]) {
  return Object.fromEntries(
    names.map((name) => [name, { $ref: `#/components/headers/${name}` }]),
  );
}

function errorResponses(codes: (keyof typeof NEWS_API_ERRORS)[]) {
  const byStatus = new Map<number, string[]>();
  for (const code of codes) {
    const [status] = NEWS_API_ERRORS[code];
    byStatus.set(status, [...(byStatus.get(status) ?? []), code]);
  }
  return Object.fromEntries(
    [...byStatus].map(([status, statusCodes]) => [
      String(status),
      {
        description: statusCodes.join(', '),
        ...(status === 429
          ? {
              headers: headerRefs([
                'retry-after',
                ...Object.keys(RATE_LIMIT_HEADERS),
              ]),
            }
          : {}),
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/Error' },
          },
        },
      },
    ]),
  );
}

function nullable(schema: object) {
  return { oneOf: [schema, { type: 'null' }] };
}

function queryParameters(names: string[]) {
  return names.map((name) => ({
    name,
    in: 'query',
    required: false,
    ...PARAMETERS[name],
  }));
}

function okResponse(description: string, schema: object) {
  return {
    description,
    headers: headerRefs(Object.keys(RATE_LIMIT_HEADERS)),
    content: { 'application/json': { schema } },
  };
}

function dataOf(items: object) {
  return {
    type: 'object',
    required: ['data'],
    properties: { data: { type: 'array', items } },
  };
}

const NEWS_PAGE = {
  type: 'object',
  required: ['data', 'nextCursor', 'hasMore'],
  properties: {
    data: {
      type: 'array',
      items: { $ref: '#/components/schemas/NewsItem' },
    },
    nextCursor: { type: ['string', 'null'] },
    hasMore: {
      type: 'boolean',
      description:
        'True while there is more to read. A page can hold fewer items than limit, even none, while this is true: keep following nextCursor until it is false.',
    },
  },
};

const REFERENCE_ERRORS: (keyof typeof NEWS_API_ERRORS)[] = [
  'invalid_request',
  'unauthorized',
  'rate_limited',
  'unavailable',
];

const CURRENT_TEAM =
  "The driver's current team, which can differ from the team they drove for when the story was published.";

export function newsApiSpec() {
  return {
    openapi: '3.1.0',
    info: {
      title: 'Grand Prix Picks F1 news API',
      version: '1.0.0',
      description: [
        'Sourced Formula 1 news as JSON: a headline, a summary and a link to the source, tagged with the race weekend, sessions, topic, drivers and team each story concerns.',
        'Each key is on a plan. Free: 10 requests a minute, and every story a day after it is published. Hobby: 60 requests a minute. Commercial: 300 requests a minute, and stories in other languages through lang. Every counted response carries ratelimit-limit, ratelimit-remaining and ratelimit-reset; past the limit the answer is 429 with retry-after in seconds.',
        'GET /news/sample needs no key and returns a fixed page in the same shape.',
        'A commercial key can also have webhooks: the change feed, POSTed to your endpoint as it happens. See webhooks.',
      ].join('\n\n'),
    },
    servers: [{ url: `${siteConfig.url}/api/v1` }],
    security: [{ bearer: [] }],
    paths: {
      '/news': {
        get: {
          operationId: 'listNews',
          summary: 'List published news, or read the change feed',
          description:
            'Without updated_since: live stories, newest published first, and nextCursor is null on the last page. With it: the change feed, where nextCursor is always set so the next poll resumes from exactly there. Changes reach the change feed 5 seconds after they are made, or a day after on a free key. A cursor keeps the order that issued it.',
          parameters: queryParameters(NEWS_API_LIST_PARAMS),
          responses: {
            '200': okResponse('A page of news.', NEWS_PAGE),
            ...errorResponses([
              'invalid_request',
              'invalid_cursor',
              'unknown_race',
              'unknown_team',
              'unsupported_language',
              'unauthorized',
              'plan_required',
              'rate_limited',
              'unavailable',
            ]),
          },
        },
      },
      '/news/{id}': {
        get: {
          operationId: 'getNewsItem',
          summary: 'Read one story',
          description:
            'On a free key, a story published less than a day ago is a 404.',
          parameters: [
            {
              name: 'id',
              in: 'path',
              required: true,
              schema: { type: 'string' },
            },
            ...queryParameters(NEWS_API_ITEM_PARAMS),
          ],
          responses: {
            '200': okResponse(
              'The story. A retracted story answers with its retraction record.',
              {
                type: 'object',
                required: ['data'],
                properties: {
                  data: { $ref: '#/components/schemas/NewsItem' },
                },
              },
            ),
            ...errorResponses([
              'invalid_request',
              'unsupported_language',
              'unauthorized',
              'plan_required',
              'not_found',
              'rate_limited',
              'unavailable',
            ]),
          },
        },
      },
      '/news/sample': {
        get: {
          operationId: 'sampleNews',
          summary: 'A fixed page of real stories, without a key',
          description: 'English only.',
          security: [],
          responses: {
            '200': {
              description: 'The same page every time.',
              content: { 'application/json': { schema: NEWS_PAGE } },
            },
            ...errorResponses(['unavailable']),
          },
        },
      },
      '/races': {
        get: {
          operationId: 'listRaces',
          summary: 'Race slugs for the race filter',
          parameters: [
            {
              ...queryParameters(NEWS_API_RACES_PARAMS)[0]!,
              description: 'Only this season.',
            },
          ],
          responses: {
            '200': okResponse(
              'Races in calendar order.',
              dataOf({
                type: 'object',
                required: ['slug', 'name', 'season', 'round', 'startsAt'],
                properties: {
                  slug: { type: 'string' },
                  name: { type: 'string' },
                  season: { type: 'integer' },
                  round: { type: 'integer' },
                  startsAt: {
                    type: 'string',
                    format: 'date-time',
                    description: 'When the race starts.',
                  },
                },
              }),
            ),
            ...errorResponses(REFERENCE_ERRORS),
          },
        },
      },
      '/drivers': {
        get: {
          operationId: 'listDrivers',
          summary: 'Driver codes for the driver filter',
          responses: {
            '200': okResponse(
              'Drivers by code.',
              dataOf({ $ref: '#/components/schemas/Driver' }),
            ),
            ...errorResponses(REFERENCE_ERRORS),
          },
        },
      },
      '/teams': {
        get: {
          operationId: 'listTeams',
          summary: 'Team names for the team filter',
          responses: {
            '200': okResponse(
              'Teams on the current grid.',
              dataOf({
                type: 'object',
                required: ['name', 'code'],
                properties: {
                  name: { type: 'string' },
                  code: { type: 'string', description: 'For example FER.' },
                },
              }),
            ),
            ...errorResponses(REFERENCE_ERRORS),
          },
        },
      },
    },
    webhooks: {
      newsChanges: {
        post: {
          operationId: 'newsChanges',
          summary: 'Changes to the news, as they happen',
          description: [
            'The change feed, sent to your endpoint instead of polled. Each POST carries up to 20 events, oldest change first, about 6 seconds after the change. Endpoints are set up for commercial keys on request.',
            'Answer 2xx within 10 seconds. Anything else, a redirect included, is a failure: the same events are sent again after 1 minute, 5, 30, then 2, 6, 12 and 24 hours. After 8 failures in a row the endpoint is switched off until you ask for it back, and then it resumes where it stopped.',
            'Your endpoint is only sent the next batch once it accepts this one, so events arrive in order and none is skipped. One can arrive twice: deduplicate on its id.',
            'To verify a delivery, take t and each v1 from gpp-signature, compute HMAC-SHA256 of t, a full stop and the raw request body with your secret, hex encode it and compare it with each v1. Reject a delivery whose t is more than 5 minutes from your clock.',
          ].join('\n\n'),
          security: [],
          parameters: [
            {
              name: 'gpp-signature',
              in: 'header',
              required: true,
              description:
                't=<unix seconds>,v1=<hex HMAC-SHA256>. There are two v1 values for 24 hours after your secret is rotated, one for each secret.',
              schema: { type: 'string' },
            },
          ],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/WebhookDelivery' },
              },
            },
          },
          responses: {
            '2XX': { description: 'Accepted. The next batch can be sent.' },
          },
        },
      },
    },
    components: {
      securitySchemes: {
        bearer: {
          type: 'http',
          scheme: 'bearer',
          description: 'Authorization: Bearer <key>',
        },
      },
      headers: {
        ...RATE_LIMIT_HEADERS,
        'retry-after': {
          description: 'Seconds until the key can make another request.',
          schema: { type: 'integer' },
        },
      },
      schemas: {
        NewsItem: {
          oneOf: [
            { $ref: '#/components/schemas/PublishedStory' },
            { $ref: '#/components/schemas/RetractedStory' },
          ],
          discriminator: { propertyName: 'status' },
        },
        Driver: {
          type: 'object',
          required: ['code', 'number', 'name', 'team'],
          properties: {
            code: { type: 'string' },
            number: { type: ['integer', 'null'] },
            name: { type: 'string' },
            team: { type: ['string', 'null'], description: CURRENT_TEAM },
          },
        },
        PublishedStory: {
          type: 'object',
          required: [
            'id',
            'key',
            'status',
            'language',
            'languages',
            'headline',
            'body',
            'url',
            'source',
            'race',
            'sessions',
            'topic',
            'drivers',
            'team',
            'startingGrid',
            'publishedAt',
            'updatedAt',
          ],
          properties: {
            id: {
              type: 'string',
              description:
                'The identifier. It never changes, through corrections too.',
            },
            key: {
              type: 'string',
              description:
                'A readable slug, for example antonelli-grid-penalty. Not an identifier: use id.',
            },
            status: { const: 'published' },
            language: {
              enum: [...NEWS_API_LANGUAGES],
              description:
                'The language of headline and body. en when the story has no translation of its current English in the language asked for.',
            },
            languages: {
              type: 'array',
              items: { enum: [...NEWS_API_LANGUAGES] },
              description:
                'Every language this story can be read in now, en included, sorted. A correction drops the translations until they are redone.',
            },
            headline: { type: 'string' },
            body: { type: 'string', description: 'A short summary.' },
            url: {
              type: ['string', 'null'],
              format: 'uri',
              description:
                "The story on grandprixpicks.com, while its race's write-up shows it. Null otherwise, and it can turn null without the story changing.",
            },
            source: {
              type: 'object',
              required: ['name', 'url', 'publishedAt'],
              properties: {
                name: { type: 'string' },
                url: { type: 'string', format: 'uri' },
                publishedAt: {
                  type: ['string', 'null'],
                  format: 'date-time',
                  description:
                    'When the source published it. Null when the source gave no date.',
                },
              },
            },
            race: nullable({
              type: 'object',
              required: ['slug', 'name', 'season', 'round'],
              properties: {
                slug: { type: 'string' },
                name: { type: 'string' },
                season: { type: 'integer' },
                round: { type: 'integer' },
              },
            }),
            sessions: {
              type: 'array',
              description:
                'The sessions the story changes. Empty when it changes none.',
              items: { enum: ['sprint_quali', 'sprint', 'quali', 'race'] },
            },
            topic: {
              oneOf: [{ enum: [...NEWS_TOPICS] }, { type: 'null' }],
              description:
                'What the story is about. Null on a story published before topics existed.',
            },
            drivers: {
              type: 'array',
              items: { $ref: '#/components/schemas/Driver' },
            },
            team: {
              type: ['string', 'null'],
              description: `The one team the story is about, or null when it concerns several or none. Worked out from the drivers' current teams when the story names no team.`,
            },
            startingGrid: nullable({
              type: 'array',
              description: 'Present on the story that announces a grid.',
              items: {
                type: 'object',
                required: ['position', 'code', 'name', 'team', 'note'],
                properties: {
                  position: { type: 'integer' },
                  code: { type: 'string' },
                  name: { type: 'string' },
                  team: {
                    type: ['string', 'null'],
                    description: CURRENT_TEAM,
                  },
                  note: {
                    type: ['string', 'null'],
                    description:
                      'Why the driver starts here, for example "3-place penalty".',
                  },
                },
              },
            }),
            publishedAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
        RetractedStory: {
          type: 'object',
          description:
            'A withdrawn story. It carries no text, only the fact that it went.',
          required: ['id', 'key', 'status', 'updatedAt'],
          properties: {
            id: { type: 'string' },
            key: { type: 'string' },
            status: { const: 'retracted' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
        WebhookDelivery: {
          type: 'object',
          required: ['events'],
          properties: {
            events: {
              type: 'array',
              minItems: 1,
              maxItems: 20,
              items: { $ref: '#/components/schemas/WebhookEvent' },
            },
          },
        },
        WebhookEvent: {
          type: 'object',
          required: ['id', 'type', 'createdAt', 'data'],
          properties: {
            id: {
              type: 'string',
              description:
                'One story at one version. A resent event keeps its id.',
            },
            type: {
              enum: [
                'news.published',
                'news.updated',
                'news.retracted',
                'webhook.test',
              ],
              description:
                "news.published is a story's first version and news.updated any later one. You can get news.updated for a story you never had, for example one published before your endpoint existed, so treat it as an upsert by id. webhook.test is sent when we test your endpoint, and its data is null.",
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              description: "When the change was made: the item's updatedAt.",
            },
            data: nullable({ $ref: '#/components/schemas/NewsItem' }),
          },
        },
        Error: {
          type: 'object',
          required: ['error'],
          properties: {
            error: {
              type: 'object',
              required: ['code', 'message'],
              properties: {
                code: { enum: Object.keys(NEWS_API_ERRORS) },
                message: { type: 'string' },
              },
            },
          },
        },
      },
    },
  };
}
