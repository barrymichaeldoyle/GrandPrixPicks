import { createFileRoute, Link } from '@tanstack/react-router';

import { setStaticContentCacheHeaders } from '@/lib/publicPageCacheHeaders';
import { CalendarClock, ChevronRight, Flag } from 'lucide-react';

import {
  CALENDAR_2027,
  CALENDAR_2027_ANNOUNCED_LABEL,
  CALENDAR_2027_REVIEWED_AT,
  CALENDAR_2027_REVIEWED_LABEL,
  sprintRounds,
} from '@/lib/calendar2027';
import { getCountryCodeForRaceSlug } from '@grandprixpicks/shared/raceCountries';
import { breadcrumbSchema, pageMeta, siteConfig } from '@/lib/site';
import { RaceFlag } from '@/components/RaceFlag';
import { PicksCallToAction } from '@/components/PicksCallToAction/PicksCallToAction';

/**
 * The 2027 calendar, now that there is a 2027 calendar.
 *
 * This page spent a year answering "has it been confirmed yet", because a grid
 * of TBC rows is the placeholder shape that got the site turned down by AdSense
 * once already. The FIA ratified the list on 16 September 2026, so the holding
 * page became the round list it always said it would become, and the reporting
 * section went with it.
 *
 * The dates live in `@/lib/calendar2027`, which is where a re-check happens.
 * This file only decides how they are shown.
 */

const PAGE_TITLE = 'F1 2027 Calendar: All 24 Races | Grand Prix Picks';
const PAGE_DESCRIPTION =
  'The confirmed 2027 F1 calendar: 24 races from Bahrain on 14 March to Abu Dhabi on 12 December, ten sprint weekends, and Portugal and Türkiye back.';

const FAQS = [
  {
    question: 'Has the 2027 F1 calendar been confirmed?',
    answer:
      'Yes. The FIA World Motor Sport Council approved it on 16 September 2026 and Formula 1 published it the same day. Rounds can still be amended, as they are most seasons.',
  },
  {
    question: 'When does the 2027 F1 season start?',
    answer:
      'The Bahrain Grand Prix at Sakhir on 12 to 14 March 2027, which is also a sprint weekend. Saudi Arabia follows a week later.',
  },
  {
    question: 'When does the 2027 F1 season finish?',
    answer:
      'The Abu Dhabi Grand Prix at Yas Marina on 10 to 12 December 2027, a sprint weekend and the second half of a December double header with Qatar.',
  },
  {
    question: 'How many races are in the 2027 F1 season?',
    answer:
      'Twenty-four, the fourth season in a row at that number. The 2026 season on this site has 23.',
  },
  {
    question: 'How many sprint races are there in 2027?',
    answer:
      'Ten, up from six. Bahrain, Australia, Japan, Monaco and Abu Dhabi hold a sprint for the first time, and Canada, Great Britain, Italy, Brazil and Qatar keep theirs.',
  },
  {
    question: 'Which races are new on the 2027 F1 calendar?',
    answer:
      'Portugal returns at Portimão on 18 to 20 June and Türkiye returns at Istanbul Park on 1 to 3 October. Both last held a Grand Prix in 2021.',
  },
  {
    question: 'Which races are not on the 2027 F1 calendar?',
    answer:
      'Barcelona-Catalunya and the Dutch Grand Prix at Zandvoort. Madrid keeps the Spanish Grand Prix name on 10 to 12 September.',
  },
  {
    question: 'When is 2027 pre-season testing?',
    answer:
      'One four-day test at the Bahrain International Circuit, 24 to 27 February 2027.',
  },
] as const;

export const Route = createFileRoute('/f1-2027-calendar')({
  loader: setStaticContentCacheHeaders,
  component: F1Calendar2027Page,
  head: () => {
    const meta = pageMeta({
      title: PAGE_TITLE,
      description: PAGE_DESCRIPTION,
      path: '/f1-2027-calendar',
      imageAlt: 'The confirmed 2027 F1 calendar',
    });
    return {
      ...meta,
      scripts: [
        {
          type: 'application/ld+json',
          children: JSON.stringify({
            '@context': 'https://schema.org',
            '@graph': [
              {
                '@type': 'WebPage',
                '@id': `${siteConfig.url}/f1-2027-calendar#page`,
                url: `${siteConfig.url}/f1-2027-calendar`,
                name: 'F1 2027 Calendar',
                description: PAGE_DESCRIPTION,
                inLanguage: 'en',
                // The reviewed stamp the reader sees, in the form a crawler
                // reads. Both come from the data file, so a date edit without
                // a review bump cannot quietly claim freshness.
                dateModified: CALENDAR_2027_REVIEWED_AT,
                isPartOf: { '@id': `${siteConfig.url}/#app` },
              },
              {
                '@type': 'FAQPage',
                '@id': `${siteConfig.url}/f1-2027-calendar#faq`,
                mainEntity: FAQS.map((faq) => ({
                  '@type': 'Question',
                  name: faq.question,
                  acceptedAnswer: { '@type': 'Answer', text: faq.answer },
                })),
              },
              breadcrumbSchema('/f1-2027-calendar', [
                { name: '2027 calendar', path: '/f1-2027-calendar' },
              ]),
            ],
          }),
        },
      ],
    };
  },
});

/** Nothing on the 2027 list is missing a flag, but the map can return null. */
function RoundFlag({ slug }: { slug: string }) {
  const code = getCountryCodeForRaceSlug(slug);
  return code ? <RaceFlag countryCode={code} size="sm" /> : null;
}

function SprintPill() {
  return (
    <span className="inline-flex w-fit shrink-0 items-center rounded-full border border-accent/40 bg-accent/10 px-2 py-0.5 text-xs font-semibold whitespace-nowrap text-accent">
      Sprint
    </span>
  );
}

function F1Calendar2027Page() {
  const sprints = sprintRounds();
  const opener = CALENDAR_2027[0];
  const finale = CALENDAR_2027[CALENDAR_2027.length - 1];

  return (
    <div className="min-h-full bg-page">
      <div className="mx-auto max-w-(--page-max) px-4 py-6 sm:py-8">
        <header className="max-w-4xl">
          <h1 className="font-title text-3xl font-semibold text-text sm:text-4xl">
            The 2027 F1 calendar
          </h1>
          <p className="gpp-label mt-3 text-text-muted">
            Last reviewed {CALENDAR_2027_REVIEWED_LABEL}
          </p>
          <p className="gpp-reading-copy mt-4 text-text-muted">
            The FIA World Motor Sport Council approved the 2027 calendar on{' '}
            {CALENDAR_2027_ANNOUNCED_LABEL} and Formula 1 published it the same
            day. That is {CALENDAR_2027.length} rounds, from Bahrain on{' '}
            {opener.dates} to Abu Dhabi on {finale.dates}, with {sprints.length}{' '}
            sprint weekends.
          </p>
          <p className="gpp-reading-copy mt-4 text-text-muted">
            <Link
              to="/f1-2027-driver-line-up"
              className="font-medium text-accent underline-offset-2 hover:underline"
            >
              The 2027 driver line-up
            </Link>{' '}
            is tracked on its own page, seat by seat.
          </p>
        </header>

        <section aria-labelledby="every-round" className="mt-10 sm:mt-12">
          <h2
            id="every-round"
            className="font-title text-2xl font-semibold text-text sm:text-3xl"
          >
            Every round
          </h2>
          <div className="mt-6 overflow-x-auto rounded-xl border border-border">
            <table className="w-full min-w-[20rem] border-collapse text-sm sm:min-w-[40rem]">
              <caption className="sr-only">
                The 2027 Formula 1 calendar: every round with its venue, dates
                and whether it runs a sprint.
              </caption>
              <thead>
                <tr className="bg-surface-muted/40 text-left">
                  <th scope="col" className="gpp-label px-3 py-3 sm:px-4">
                    Rd
                  </th>
                  <th scope="col" className="gpp-label px-3 py-3 sm:px-4">
                    Grand Prix
                  </th>
                  <th scope="col" className="gpp-label px-3 py-3 sm:px-4">
                    Dates
                  </th>
                </tr>
              </thead>
              <tbody>
                {CALENDAR_2027.map((round) => (
                  <tr key={round.round} className="border-t border-border/70">
                    <td className="gpp-mono px-3 py-3 align-top text-text-muted sm:px-4">
                      {round.round}
                    </td>
                    <th
                      scope="row"
                      className="px-3 py-3 text-left align-top font-medium text-text sm:px-4"
                    >
                      <span className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
                        <RoundFlag slug={round.slug} />
                        {round.name}
                        {round.sprint ? <SprintPill /> : null}
                      </span>
                      {/* The venue sits under the name rather than in a
                          column of its own: a fourth column leaves the dates
                          two words a line on a phone, and rendering it in both
                          places put every venue into the page twice. */}
                      <span className="gpp-reading-meta mt-1 block text-text-muted">
                        {round.venue}
                      </span>
                    </th>
                    <td className="px-3 py-3 align-top whitespace-nowrap text-text-muted sm:px-4">
                      {round.dates}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="gpp-reading-meta mt-4 rounded-lg border border-border/70 bg-surface-muted/30 px-4 py-3 text-text-muted">
            Session times are not published this far out. Dates can still be
            amended before the season starts, as they are most years.
          </p>
        </section>

        <section aria-labelledby="what-changed" className="mt-12 sm:mt-16">
          <h2
            id="what-changed"
            className="font-title text-2xl font-semibold text-text sm:text-3xl"
          >
            What changed from 2026
          </h2>
          <p className="gpp-reading-copy mt-3 max-w-3xl text-text-muted">
            Portugal comes back at Portimão in mid-June and Türkiye comes back
            at Istanbul Park at the start of October, both for the first time
            since 2021. Formula 1 has signed Istanbul on a deal that runs to the
            end of 2031. Barcelona-Catalunya and the Dutch Grand Prix at
            Zandvoort leave the calendar, and Madrid keeps the Spanish Grand
            Prix name.
          </p>
          <p className="gpp-reading-copy mt-4 max-w-3xl text-text-muted">
            The larger change is the sprint. There were six in 2026 and there
            are {sprints.length} in 2027. Bahrain, Australia, Japan, Monaco and
            Abu Dhabi run one for the first time, and Canada, Great Britain,
            Italy, Brazil and Qatar keep theirs. Monaco is the surprise of the
            ten, and the first and last rounds of a season have never both been
            sprints before. Pre-season testing shrinks to a single four-day run
            at Sakhir from 24 to 27 February.
          </p>
          <p className="gpp-reading-meta mt-4 max-w-3xl text-text-muted">
            A sprint weekend is four sessions to predict rather than two.{' '}
            <Link
              to="/guides/$guideSlug"
              params={{ guideSlug: 'f1-race-weekend-format' }}
              className="font-medium text-accent underline-offset-2 hover:underline"
            >
              What happens across a race weekend
            </Link>{' '}
            covers the order they run in.
          </p>
        </section>

        <section aria-labelledby="questions" className="mt-12 sm:mt-16">
          <h2
            id="questions"
            className="font-title text-2xl font-semibold text-text"
          >
            Questions
          </h2>
          <dl className="mt-7 border-t border-border">
            {FAQS.map((faq) => (
              <div
                key={faq.question}
                className="border-b border-border py-5 sm:grid sm:grid-cols-[minmax(0,1fr)_1.35fr] sm:items-start sm:gap-8 sm:py-6"
              >
                <dt className="font-semibold text-text">{faq.question}</dt>
                <dd className="gpp-reading-copy mt-2 text-text-muted sm:mt-0">
                  {faq.answer}
                </dd>
              </div>
            ))}
          </dl>
        </section>

        <aside
          aria-labelledby="this-season"
          className="mt-10 rounded-xl border border-border bg-surface p-5 sm:mt-12 sm:p-6"
        >
          <h2
            id="this-season"
            className="font-title text-lg font-semibold text-text"
          >
            This season
          </h2>
          <ul className="mt-4 grid gap-3 sm:grid-cols-2">
            <li>
              <Link
                to="/races"
                className="group flex h-full flex-col rounded-lg border border-border p-4 transition-colors hover:border-accent/40 hover:bg-surface-muted/30"
              >
                <span className="inline-flex items-center gap-2 font-semibold text-text group-hover:text-accent">
                  <Flag className="h-4 w-4 text-accent" aria-hidden />
                  The 2026 race calendar
                  <ChevronRight
                    className="h-4 w-4 text-text-muted group-hover:text-accent"
                    aria-hidden
                  />
                </span>
                <span className="gpp-reading-meta mt-2 text-text-muted">
                  Session times and lock times for every round this year.
                </span>
              </Link>
            </li>
            <li>
              <Link
                to="/f1-predictions-this-weekend"
                className="group flex h-full flex-col rounded-lg border border-border p-4 transition-colors hover:border-accent/40 hover:bg-surface-muted/30"
              >
                <span className="inline-flex items-center gap-2 font-semibold text-text group-hover:text-accent">
                  <CalendarClock className="h-4 w-4 text-accent" aria-hidden />
                  This weekend's round
                  <ChevronRight
                    className="h-4 w-4 text-text-muted group-hover:text-accent"
                    aria-hidden
                  />
                </span>
                <span className="gpp-reading-meta mt-2 text-text-muted">
                  Sessions, the grid and when each set of picks locks.
                </span>
              </Link>
            </li>
          </ul>
        </aside>

        <PicksCallToAction className="mt-10" placement="f1_calendar_2027" />
      </div>
    </div>
  );
}
