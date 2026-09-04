import { createFileRoute, Link } from '@tanstack/react-router';
import { CalendarClock, ChevronRight, Flag } from 'lucide-react';

import { displayTeamName } from '@/lib/display';
import {
  HAAS_2027_CONTENDERS,
  LINE_UP_2027,
  LINE_UP_2027_REVIEWED_LABEL,
  type Seat,
  SEAT_STATUS_LABELS,
  type SeatStatus,
  countSeats,
  totalSeats,
} from '@/lib/lineUp2027';
import { setStaticContentCacheHeaders } from '@/lib/publicPageCacheHeaders';
import { breadcrumbSchema, pageMeta, siteConfig } from '@/lib/site';
import { FALLBACK_TEAM_COLOR, TEAM_COLORS } from '@/lib/teamColors';

/**
 * Who is driving what in 2027, while the answer is still being decided.
 *
 * The sibling of `/f1-2027-calendar` and built on the same principle: a page
 * about next season earns its place by being honest about what is not settled
 * yet, not by filling 22 rows with plausible names. Every seat therefore
 * carries a status and the reason for it, and the two seats nobody can call
 * are given the space at the top rather than buried in alphabetical order.
 *
 * All the facts live in `@/lib/lineUp2027`, which is where a re-check happens.
 * This file only decides how they are shown.
 */

const PAGE_TITLE = 'F1 2027 Driver Line-Up | Grand Prix Picks';
const PAGE_DESCRIPTION =
  'Every 2027 F1 seat, team by team: who has signed, who is expected back, and the five drivers Haas is choosing between for one drive.';

const FAQS = [
  {
    question: 'Is the 2027 F1 driver line-up confirmed?',
    answer:
      'Not fully. Most seats are either announced or covered by a contract option, and two drivers on the current grid have nothing for 2027 at all.',
  },
  {
    question: 'Which 2027 F1 seats are still open?',
    answer:
      'Esteban Ocon at Haas and Fernando Alonso at Aston Martin. Both are out of contract at the end of 2026.',
  },
  {
    question: 'Who will replace Esteban Ocon at Haas?',
    answer:
      'Haas has not decided. Ayao Komatsu said on 4 September 2026 that Ocon, Ryo Hirakawa, Jack Doohan, Leonardo Fornaroli and Rafael Camara are all in the running for the one seat.',
  },
  {
    question: 'Is Fernando Alonso racing in 2027?',
    answer:
      'He has not said. His Aston Martin contract ends with this season and he has set no deadline for deciding, though he expects to stay with the team in some role.',
  },
  {
    question: 'Who is Max Verstappen driving for in 2027?',
    answer:
      'Red Bull. He signed an extension to the end of 2030 on 20 August 2026.',
  },
  {
    question: 'Are Mercedes keeping George Russell and Kimi Antonelli?',
    answer:
      'Almost certainly. Both signed extensions in October 2025 that are understood to run past 2026, but Mercedes has never announced either of them for 2027.',
  },
  {
    question: 'How many teams are on the 2027 grid?',
    answer:
      'Eleven, the same as 2026. Cadillac joined this season, so 2027 is the first year the grid has had no new entry to absorb.',
  },
] as const;

export const Route = createFileRoute('/f1-2027-driver-line-up')({
  loader: setStaticContentCacheHeaders,
  component: F1LineUp2027Page,
  head: () => {
    const meta = pageMeta({
      title: PAGE_TITLE,
      description: PAGE_DESCRIPTION,
      path: '/f1-2027-driver-line-up',
      image: `${siteConfig.url}/og/2027-line-up`,
      imageAlt: 'F1 2027 driver line-up, seat by seat',
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
                '@id': `${siteConfig.url}/f1-2027-driver-line-up#page`,
                url: `${siteConfig.url}/f1-2027-driver-line-up`,
                name: 'F1 2027 Driver Line-Up',
                description: PAGE_DESCRIPTION,
                inLanguage: 'en',
                isPartOf: { '@id': `${siteConfig.url}/#app` },
              },
              {
                '@type': 'FAQPage',
                '@id': `${siteConfig.url}/f1-2027-driver-line-up#faq`,
                mainEntity: FAQS.map((faq) => ({
                  '@type': 'Question',
                  name: faq.question,
                  acceptedAnswer: { '@type': 'Answer', text: faq.answer },
                })),
              },
              breadcrumbSchema('/f1-2027-driver-line-up', [
                {
                  name: '2027 driver line-up',
                  path: '/f1-2027-driver-line-up',
                },
              ]),
            ],
          }),
        },
      ],
    };
  },
});

function teamColor(team: string): string {
  return TEAM_COLORS[team] ?? FALLBACK_TEAM_COLOR;
}

/**
 * The status pill.
 *
 * Colour is never the only signal: each pill says its status in words, so the
 * three states survive a greyscale print, a colourblind reader and a screen
 * reader without a second mechanism.
 */
const STATUS_CLASSES: Record<SeatStatus, string> = {
  signed: 'border-accent/40 bg-accent/10 text-accent',
  expected: 'border-border bg-surface-muted/50 text-text-muted',
  'out-of-contract': 'border-warning/35 bg-warning-muted/40 text-warning',
};

function StatusPill({ status }: { status: SeatStatus }) {
  return (
    <span
      className={`inline-flex w-fit shrink-0 items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap ${STATUS_CLASSES[status]}`}
    >
      {SEAT_STATUS_LABELS[status]}
    </span>
  );
}

/**
 * One seat.
 *
 * No colour bar of its own: the team heading directly above already carries
 * the livery, and repeating it twice per team turns a 3px accent into a
 * pattern.
 */
function SeatRow({ seat }: { seat: Seat }) {
  return (
    <tr className="border-t border-border/70">
      <th
        scope="row"
        className="px-3 py-3 text-left align-top font-medium text-text sm:px-4"
      >
        {seat.driver}
        {/* The status folds under the name on phones, where a third column
            would squeeze the note to two words a line. */}
        <span className="mt-1.5 block sm:hidden">
          <StatusPill status={seat.status} />
        </span>
      </th>
      <td className="hidden px-4 py-3 align-top sm:table-cell">
        <StatusPill status={seat.status} />
      </td>
      <td className="gpp-reading-meta px-3 py-3 align-top text-text-muted sm:px-4">
        {seat.note}
      </td>
    </tr>
  );
}

function F1LineUp2027Page() {
  const counts = countSeats();
  const total = totalSeats();
  const unsettled = LINE_UP_2027.flatMap((entry) =>
    entry.seats
      .filter((seat) => seat.status === 'out-of-contract')
      .map((seat) => ({ ...seat, team: entry.team })),
  );

  return (
    <div className="min-h-full bg-page">
      <div className="mx-auto max-w-(--page-max) px-4 py-6 sm:py-8">
        <header className="max-w-4xl">
          <h1 className="font-title text-3xl font-semibold text-text sm:text-4xl">
            The 2027 F1 driver line-up
          </h1>
          <p className="gpp-label mt-3 text-text-muted">
            Last reviewed {LINE_UP_2027_REVIEWED_LABEL}
          </p>
          <p className="gpp-reading-copy mt-4 text-text-muted">
            {counts.signed} of the {total} seats have been announced for 2027.
            Another {counts.expected} are covered by a contract or an option the
            team has not made public. {counts['out-of-contract']} drivers on the
            current grid have nothing for next year.
          </p>
        </header>

        <section aria-labelledby="still-open" className="mt-10 sm:mt-12">
          <h2
            id="still-open"
            className="font-title text-2xl font-semibold text-text sm:text-3xl"
          >
            The seats still to be decided
          </h2>
          <ul className="mt-6 grid gap-4 sm:grid-cols-2">
            {unsettled.map((seat) => (
              <li
                key={seat.driver}
                className="rounded-xl border border-border bg-surface p-5"
              >
                <p className="gpp-label text-text-muted">
                  {displayTeamName(seat.team)}
                </p>
                <p className="font-title mt-1.5 text-xl font-semibold text-text">
                  {seat.driver}
                </p>
                <p className="gpp-reading-meta mt-3 text-text-muted">
                  {seat.note}
                </p>
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="haas-fight" className="mt-12 sm:mt-16">
          <h2
            id="haas-fight"
            className="font-title text-2xl font-semibold text-text sm:text-3xl"
          >
            Five drivers, one Haas seat
          </h2>
          <p className="gpp-reading-copy mt-3 max-w-3xl text-text-muted">
            Haas holds an option on Esteban Ocon for a third year and has spent
            the summer testing alternatives to it instead. Ayao Komatsu put the
            contest on the record on 4 September 2026: five drivers, one seat,
            and no date by which he has to choose.
          </p>
          <ol className="mt-6 border-t border-border">
            {HAAS_2027_CONTENDERS.map((contender, index) => (
              <li
                key={contender.driver}
                className="flex gap-4 border-b border-border py-4 sm:py-5"
              >
                <span
                  aria-hidden
                  className="gpp-mono shrink-0 pt-0.5 text-sm font-semibold text-text-muted"
                >
                  {index + 1}
                </span>
                <span className="min-w-0">
                  <span className="block font-semibold text-text">
                    {contender.driver}
                  </span>
                  <span className="gpp-reading-meta mt-1 block text-text-muted">
                    {contender.claim}
                  </span>
                </span>
              </li>
            ))}
          </ol>
          <p className="gpp-reading-meta mt-4 text-text-muted">
            <Link
              to="/f1-team-mate-battles"
              className="font-medium text-accent underline-offset-2 hover:underline"
            >
              Ocon and Bearman's season head to head
            </Link>{' '}
            is the number Komatsu is being asked about every weekend.
          </p>
        </section>

        <section aria-labelledby="team-by-team" className="mt-12 sm:mt-16">
          <h2
            id="team-by-team"
            className="font-title text-2xl font-semibold text-text sm:text-3xl"
          >
            Every team, seat by seat
          </h2>
          {/*
            One table for all 22 seats rather than eleven cards. The teams are
            row groups, which is what they are: a reader comparing Haas with
            Aston Martin should be reading down one set of columns, and eleven
            bordered boxes each holding two rows turns the border into the
            loudest thing on the page.
          */}
          <div className="mt-6 overflow-x-auto rounded-xl border border-border">
            <table className="w-full min-w-[20rem] border-collapse text-sm sm:min-w-[40rem]">
              <caption className="sr-only">
                Every 2027 Formula 1 seat by team, with how firm each one is and
                what that rests on.
              </caption>
              <thead>
                <tr className="bg-surface-muted/50 text-left text-xs font-semibold tracking-label text-text-muted uppercase">
                  <th scope="col" className="px-3 py-2.5 sm:px-4">
                    Driver
                  </th>
                  <th scope="col" className="hidden px-4 py-2.5 sm:table-cell">
                    2027
                  </th>
                  <th scope="col" className="px-3 py-2.5 sm:px-4">
                    Where it stands
                  </th>
                </tr>
              </thead>
              {LINE_UP_2027.map((entry) => (
                <tbody key={entry.team}>
                  <tr>
                    <th
                      scope="colgroup"
                      colSpan={3}
                      className="relative border-t border-border bg-surface-muted/20 px-3 py-2.5 text-left font-semibold text-text sm:px-4"
                    >
                      {/* Flush to the table's own edge rather than indented
                          beside the name: the livery is the group's marker,
                          and at 3px it has to be somewhere the eye can run
                          down. */}
                      <span
                        aria-hidden
                        className="absolute top-1/2 left-0 h-5 w-[3px] -translate-y-1/2"
                        style={{ backgroundColor: teamColor(entry.team) }}
                      />
                      {displayTeamName(entry.team)}
                    </th>
                  </tr>
                  {entry.seats.map((seat) => (
                    <SeatRow key={seat.driver} seat={seat} />
                  ))}
                </tbody>
              ))}
            </table>
          </div>
        </section>

        <section
          aria-labelledby="what-the-labels-mean"
          className="mt-10 rounded-lg border border-border/60 bg-surface-muted/20 p-5 sm:mt-12 sm:p-6"
        >
          <h2
            id="what-the-labels-mean"
            className="text-base font-semibold text-text-muted"
          >
            What the labels mean
          </h2>
          <dl className="mt-4 space-y-3">
            <div className="sm:flex sm:gap-4">
              <dt className="sm:w-40 sm:shrink-0">
                <StatusPill status="signed" />
              </dt>
              <dd className="gpp-reading-meta mt-1.5 text-text-muted sm:mt-0.5">
                The team or the driver has said publicly that the seat is his
                for 2027.
              </dd>
            </div>
            <div className="sm:flex sm:gap-4">
              <dt className="sm:w-40 sm:shrink-0">
                <StatusPill status="expected" />
              </dt>
              <dd className="gpp-reading-meta mt-1.5 text-text-muted sm:mt-0.5">
                A contract or an option covers 2027, but nobody has announced
                it. These rarely change; they are just not facts yet.
              </dd>
            </div>
            <div className="sm:flex sm:gap-4">
              <dt className="sm:w-40 sm:shrink-0">
                <StatusPill status="out-of-contract" />
              </dt>
              <dd className="gpp-reading-meta mt-1.5 text-text-muted sm:mt-0.5">
                The driver has no deal for 2027 and the seat is genuinely in
                play.
              </dd>
            </div>
          </dl>
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
                to="/f1-standings"
                className="group flex h-full flex-col rounded-lg border border-border p-4 transition-colors hover:border-accent/40 hover:bg-surface-muted/30"
              >
                <span className="inline-flex items-center gap-2 font-semibold text-text group-hover:text-accent">
                  <Flag className="h-4 w-4 text-accent" aria-hidden />
                  F1 championship standings
                  <ChevronRight
                    className="h-4 w-4 text-text-muted group-hover:text-accent"
                    aria-hidden
                  />
                </span>
                <span className="gpp-reading-meta mt-2 text-text-muted">
                  How the drivers arguing for these seats are actually scoring.
                </span>
              </Link>
            </li>
            <li>
              <Link
                to="/f1-2027-calendar"
                className="group flex h-full flex-col rounded-lg border border-border p-4 transition-colors hover:border-accent/40 hover:bg-surface-muted/30"
              >
                <span className="inline-flex items-center gap-2 font-semibold text-text group-hover:text-accent">
                  <CalendarClock className="h-4 w-4 text-accent" aria-hidden />
                  The 2027 F1 calendar
                  <ChevronRight
                    className="h-4 w-4 text-text-muted group-hover:text-accent"
                    aria-hidden
                  />
                </span>
                <span className="gpp-reading-meta mt-2 text-text-muted">
                  What is known about next year's dates, and when they become
                  official.
                </span>
              </Link>
            </li>
          </ul>
        </aside>
      </div>
    </div>
  );
}
