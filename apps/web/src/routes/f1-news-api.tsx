import { createFileRoute, Link } from '@tanstack/react-router';
import type { CSSProperties } from 'react';

import { Button } from '@/components/Button/Button';
import { captureAnalyticsEvent } from '@/lib/analytics';
import { pageMeta } from '@/lib/site';
import { teamFillStyle } from '@/lib/teamColors';

import { NewsApiWaitlist } from './-news-api/NewsApiWaitlist';

/**
 * The news API's landing page: what a story holds, how it is sourced and
 * corrected, what to build with it, the planned plans and the waiting list.
 * The API is `server/routes/api/v1/news`, and `docs/news-api.md` is the
 * contract this page has to agree with.
 *
 * A display-register page (`docs/design-display-register.md`): it is read by
 * someone deciding whether to build on the API, so it shows stories the way
 * the site draws them, as team-colour bands, beside the record behind one.
 * Chartreuse is still only one action: getting a free key, on
 * `/f1-news-api/keys`. The waiting list, now for the paid plans, is a plain
 * link to its section.
 *
 * Indexed and in the sitemap. Nothing else on the site describes the API, so
 * it passes `docs/seo-content-policy.md` rule 1, and it is one standalone
 * page, not a template.
 *
 * Everything here is written out by hand, so the page is the same HTML for a
 * crawler as for a reader. `STORIES` and `EXAMPLE_RESPONSE` are prod records
 * as they read on 2026-11-20, published for the 2026 Bahrain Grand Prix at
 * Sepang; the story counts and sources in `SOURCING` were measured on prod
 * the same day. When a field changes in `newsApi.ts`, change
 * `EXAMPLE_RESPONSE` and `FIELDS` too. `PLANS` restates the limits in
 * `newsApi.ts` and the prices agreed on 2026-11-20.
 */
export const Route = createFileRoute('/f1-news-api')({
  component: NewsApiPage,
  head: () =>
    pageMeta({
      title: 'F1 news API | Grand Prix Picks',
      description:
        'Formula 1 news as JSON, tagged by race weekend, session, driver and team, with a change feed for corrections. Free keys are open now.',
      path: '/f1-news-api',
    }),
});

const OPENAPI_PATH = '/api/v1/openapi.json';
const SAMPLE_PATH = '/api/v1/news/sample';
const KEYS_PATH = '/f1-news-api/keys';

/**
 * The hero's links. The sample and the OpenAPI document are raw JSON, so they
 * never fire a pageview: this event is the only record of a developer opening
 * them.
 */
function trackLink(target: 'keys' | 'waiting_list' | 'sample' | 'openapi') {
  captureAnalyticsEvent('news_api_link_clicked', { target, placement: 'hero' });
}

const STORIES = [
  {
    team: 'Alpine',
    eyebrow: 'COL · Alpine',
    changesRace: true,
    headline: 'Colapinto drops 15 places on the Sepang grid',
  },
  {
    team: 'Mercedes',
    eyebrow: 'ANT RUS · Mercedes',
    changesRace: false,
    headline: 'Mercedes brings a new floor and sidepods to Sepang',
  },
  {
    team: 'Racing Bulls',
    eyebrow: 'LIN · Racing Bulls',
    changesRace: true,
    headline: 'Lindblad starts from the back of the grid at Sepang',
  },
  {
    team: 'Haas',
    eyebrow: 'OCO · Haas',
    changesRace: false,
    headline: 'Ocon will leave Haas at the end of 2026',
  },
  {
    team: null,
    eyebrow: null,
    changesRace: false,
    headline: 'Showers remain possible for the Sepang race',
  },
];

const EXAMPLE_REQUEST = `curl "https://grandprixpicks.com/api/v1/news/p171ettxqmr6w8r0zkvhx1cpn98f4ws0" \\
  -H "Authorization: Bearer $GPP_API_KEY"`;

const EXAMPLE_RESPONSE = `{
  "data": {
    "id": "p171ettxqmr6w8r0zkvhx1cpn98f4ws0",
    "key": "colapinto-sepang-grid-penalty",
    "status": "published",
    "language": "en",
    "languages": ["en"],
    "headline": "Colapinto drops 15 places on the Sepang grid",
    "body": "Colapinto carries a five-place drop from the Baku restart collision with Gasly and Norris, and takes a fifth engine for Sepang, which adds 10 more. It moves his race start only: his qualifying result stands as set.",
    "url": null,
    "source": {
      "name": "Formula 1",
      "url": "https://www.formula1.com/en/latest/article/hadjar-lindblad-and-colapinto-set-for-grid-penalties-at-bahrain-gp-in-malaysia.3eufcSTLQCJfXZ5kq3wYlt",
      "publishedAt": "2026-10-02T05:55:03.757Z"
    },
    "race": {
      "slug": "bahrain-2026",
      "name": "Bahrain Grand Prix",
      "season": 2026,
      "round": 16
    },
    "sessions": ["race"],
    "topic": "penalty",
    "drivers": [
      {
        "code": "COL",
        "number": 43,
        "name": "Franco Colapinto",
        "team": "Alpine"
      }
    ],
    "team": "Alpine",
    "startingGrid": null,
    "publishedAt": "2026-09-26T17:13:56.783Z",
    "updatedAt": "2026-10-02T20:18:09.179Z"
  }
}`;

const FIELDS = [
  ['id', 'Stays the same when a story is corrected. Store this one.'],
  ['headline, body', 'One line, then a short summary of what happened.'],
  [
    'source',
    'The publication, the link and the date it gave the story, or null if it gave none.',
  ],
  [
    'race',
    'The race weekend the story belongs to. Null for a story about no particular race.',
  ],
  [
    'sessions',
    'The sessions the story changes: sprint qualifying, sprint, qualifying or race. A grid penalty lists the race. Empty when it changes none.',
  ],
  [
    'drivers, team',
    'Who the story is about, by three-letter code, number and current team.',
  ],
  [
    'startingGrid',
    'On a story that announces a starting grid: every position, with a note where a driver was moved.',
  ],
  [
    'topic',
    'What kind of story it is: penalty, grid, technical, driver, team, weather, calendar, regulation or other.',
  ],
  [
    'url',
    'The story on grandprixpicks.com while its race preview shows it, otherwise null.',
  ],
  ['status', 'Published, or retracted when a story is withdrawn.'],
  ['language', 'The language of the text: English, or the one you asked for.'],
  ['languages', 'The languages this story can be read in.'],
] as const;

const USES = [
  {
    title: 'Chat bots',
    body: 'Post a grid penalty to Discord, Slack or Telegram soon after it is published, with the source link.',
  },
  {
    title: 'Fantasy and prediction games',
    body: 'Show players that a driver starts from the back before picks close. Grand Prix Picks runs on these stories.',
  },
  {
    title: 'Displays and overlays',
    body: 'Put the weekend’s headlines on an e-ink screen, a stream overlay or a home dashboard.',
  },
  {
    title: 'Newsletters and previews',
    body: 'Start a race preview from every story of the weekend.',
  },
  {
    title: 'Fan sites',
    body: 'Filter by driver, team or topic to fill a page about one of them.',
  },
  {
    title: 'Assistants',
    body: 'Give a language model the weekend’s news with dates and sources.',
  },
];

const PLANS = [
  {
    name: 'Free',
    price: '$0',
    availability: 'Open now',
    rows: [
      'Stories a day after they are published',
      '10 requests a minute',
      'Personal projects, with a link to Grand Prix Picks where the stories are shown',
    ],
  },
  {
    name: 'Hobby',
    price: '$9.99 a month, or $79 a season',
    availability: 'Waiting list',
    rows: [
      'Stories as they are published',
      '60 requests a minute',
      'Personal projects that earn no money',
    ],
  },
  {
    name: 'Commercial',
    price: 'From $49 a month',
    availability: 'Waiting list',
    rows: [
      'Stories as they are published',
      '300 requests a minute',
      'Products that earn money',
      'Webhooks for new stories and corrections, set up on request',
      'Stories in 11 more languages',
    ],
  },
];

const sectionClass = 'border-b border-border px-4 py-12 sm:py-16';
const frameClass = 'mx-auto w-full max-w-(--page-max)';
const codeClass =
  'gpp-mono overflow-x-auto rounded-md border border-border bg-surface p-4 text-xs leading-relaxed text-text-muted';
const quietLinkClass =
  'text-text underline decoration-border-strong underline-offset-4 hover:decoration-text';
const leadClass = 'font-semibold text-text';

function NewsApiPage() {
  return (
    <div className="min-h-screen bg-page">
      <section
        aria-labelledby="news-api-title"
        className="overflow-hidden border-b border-border px-4 pt-8 pb-10 sm:pt-12 sm:pb-14"
      >
        <div
          className={`${frameClass} grid gap-x-12 gap-y-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,25rem)] lg:items-end`}
        >
          <div className="min-w-0">
            <h1 id="news-api-title" className="text-text">
              <span className="gpp-display block">F1 news</span>
              <span className="gpp-display gpp-display-light mt-[0.12em] block text-text-muted">
                API
              </span>
            </h1>
            <p className="gpp-reading-copy-lg mt-6 max-w-xl text-text-muted">
              Formula 1 news as JSON, from Grand Prix Picks, the F1 prediction
              game. Each story is a headline, a short summary and a link to its
              source, tagged with the race weekend, the sessions it changes, and
              the drivers and team it concerns.
            </p>
            <p className="gpp-reading-copy mt-3 max-w-xl text-text-muted">
              The free plan is open. Paid plans aren’t yet.
            </p>
            <div className="mt-7 flex flex-wrap items-center gap-x-6 gap-y-3">
              <Button asChild>
                <Link
                  to={KEYS_PATH}
                  data-page-cta
                  onClick={() => trackLink('keys')}
                >
                  Get a free key
                </Link>
              </Button>
              <a
                href="#waiting-list"
                className={`text-sm ${quietLinkClass}`}
                onClick={() => trackLink('waiting_list')}
              >
                Join the waiting list
              </a>
              <a
                href={SAMPLE_PATH}
                className={`text-sm ${quietLinkClass}`}
                onClick={() => trackLink('sample')}
              >
                Sample response
              </a>
              <a
                href={OPENAPI_PATH}
                className={`text-sm ${quietLinkClass}`}
                onClick={() => trackLink('openapi')}
              >
                OpenAPI document
              </a>
            </div>
          </div>

          <div className="min-w-0">
            <p className="gpp-mono mb-2.5 text-xs font-medium text-text-muted">
              Five stories from the 2026 Bahrain Grand Prix, run at Sepang in
              Malaysia
            </p>
            <ol className="grid gap-1">
              {STORIES.map((story, index) => (
                <li
                  key={story.headline}
                  className={`gpp-hero-band flex flex-col justify-center px-4 py-3 ${
                    story.team
                      ? 'gpp-team-fill'
                      : 'bg-surface-elevated text-text'
                  }`}
                  style={
                    {
                      ...(story.team ? teamFillStyle(story.team) : {}),
                      animationDelay: `${120 + index * 50}ms`,
                    } as CSSProperties
                  }
                >
                  {story.eyebrow ? (
                    <span className="mb-1 flex flex-wrap items-center gap-x-2 gap-y-1">
                      <span className="gpp-mono text-xs font-semibold tracking-wide">
                        {story.eyebrow}
                      </span>
                      {story.changesRace ? (
                        <span className="gpp-mono rounded-xs bg-page px-1.5 text-[0.6875rem] whitespace-nowrap text-text">
                          Changes the race
                        </span>
                      ) : null}
                    </span>
                  ) : null}
                  <span className="text-[0.9375rem] leading-snug font-semibold text-pretty">
                    {story.headline}
                  </span>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      <section aria-labelledby="news-api-story" className={sectionClass}>
        <div
          className={`${frameClass} grid gap-x-12 gap-y-8 lg:grid-cols-[minmax(0,24rem)_minmax(0,1fr)]`}
        >
          <div className="min-w-0">
            <h2 id="news-api-story" className="gpp-display-h2 text-text">
              What a story holds
            </h2>
            <dl className="mt-6 border-t border-border">
              {FIELDS.map(([name, meaning]) => (
                <div key={name} className="border-b border-border py-3">
                  <dt className="gpp-mono text-sm text-text">{name}</dt>
                  <dd className="mt-1 text-sm leading-relaxed text-text-muted">
                    {meaning}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
          <div className="min-w-0 space-y-3">
            <pre className={codeClass}>
              <code>{EXAMPLE_REQUEST}</code>
            </pre>
            <pre className={codeClass}>
              <code>{EXAMPLE_RESPONSE}</code>
            </pre>
          </div>
        </div>
      </section>

      <section aria-labelledby="news-api-sourcing" className={sectionClass}>
        <div className={frameClass}>
          <h2 id="news-api-sourcing" className="gpp-display-h2 text-text">
            Sources and corrections
          </h2>
          <div className="gpp-reading-copy mt-6 grid gap-x-12 gap-y-6 text-text-muted lg:grid-cols-3">
            <p>
              <strong className={leadClass}>Every story has one source.</strong>{' '}
              It is written from that article and links to it. The last five
              race weekends had between 24 and 88 stories each, from Formula 1,
              the FIA, Motorsport.com, The Race, RaceFans and others.
            </p>
            <p>
              <strong className={leadClass}>A correction keeps its id.</strong>{' '}
              When “at least ten places” becomes “back of the grid”, the story
              is updated in place.
            </p>
            <p>
              <strong className={leadClass}>
                The change feed lists every change.
              </strong>{' '}
              Ask for everything since a date, then send back the cursor each
              response gives you. Published, corrected and retracted stories all
              come through it.
            </p>
          </div>
        </div>
      </section>

      <section aria-labelledby="news-api-uses" className={sectionClass}>
        <div className={frameClass}>
          <h2 id="news-api-uses" className="gpp-display-h2 text-text">
            What you can build
          </h2>
          <ul className="mt-8 grid gap-px overflow-hidden rounded-md border border-border bg-border sm:grid-cols-2 lg:grid-cols-3">
            {USES.map((use) => (
              <li key={use.title} className="bg-page p-5">
                <h3 className="text-base font-semibold text-text">
                  {use.title}
                </h3>
                <p className="mt-1.5 text-sm leading-relaxed text-text-muted">
                  {use.body}
                </p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section aria-labelledby="news-api-plans" className={sectionClass}>
        <div className={frameClass}>
          <h2 id="news-api-plans" className="gpp-display-h2 text-text">
            Plans and prices
          </h2>
          <ul className="mt-8 grid gap-px overflow-hidden rounded-md border border-border bg-border lg:grid-cols-3">
            {PLANS.map((plan) => (
              <li key={plan.name} className="bg-page p-5">
                <h3 className="text-base font-semibold text-text">
                  {plan.name}
                </h3>
                <p className="gpp-mono mt-1 text-sm text-text">{plan.price}</p>
                <p className="mt-1 text-sm text-text-muted">
                  {plan.availability}
                </p>
                <ul className="mt-4 space-y-2 text-sm leading-relaxed text-text-muted">
                  {plan.rows.map((row) => (
                    <li key={row}>{row}</li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
          <div className="gpp-reading-copy mt-6 flex max-w-2xl flex-col gap-3 text-text-muted">
            <p>Paid plan prices may change before they open.</p>
            <p>
              On every plan you can show a story’s headline and summary in your
              own product, with its source link. You can’t resell the stories as
              a news feed.
            </p>
            <p>
              Call the API from a server. A key in browser code can be copied.
            </p>
          </div>
        </div>
      </section>

      <section
        id="waiting-list"
        aria-labelledby="news-api-access"
        className="scroll-mt-24 px-4 py-12 sm:py-16"
      >
        <div className={frameClass}>
          <h2 id="news-api-access" className="gpp-display-h2 text-text">
            Hobby and Commercial plans
          </h2>
          <p className="gpp-reading-copy mt-4 max-w-xl text-text-muted">
            We’ll send one email, when they open.
          </p>
          <NewsApiWaitlist />
        </div>
      </section>
    </div>
  );
}
