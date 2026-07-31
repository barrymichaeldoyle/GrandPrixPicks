import { createFileRoute, Link } from '@tanstack/react-router';
import { ArrowRight, Flag, TimerReset } from 'lucide-react';

import { Button } from '@/components/Button/Button';
import { PageHeader } from '@/components/PageHeader';
import { breadcrumbSchema, pageMeta, siteConfig } from '@/lib/site';

const faqs = [
  {
    question: 'Do grid penalties change my qualifying score?',
    answer:
      'No. We use the qualifying classification, not the starting grid. A driver who qualifies P2 and receives a five-place grid penalty still counts as P2.',
  },
  {
    question: 'Do post-race penalties change my race score?',
    answer:
      'Yes, if the penalty changes the official race classification. We update the result and rescore the whole session.',
  },
  {
    question: 'What if a driver is disqualified from qualifying?',
    answer:
      'That does change the qualifying classification, so it changes the result we score. The same applies when deleted lap times alter the published order.',
  },
  {
    question: 'What happens to my Head-to-Head pick if a driver retires?',
    answer:
      'It still counts. Retired and disqualified drivers remain ordered in the official classification, and we use that order to settle the matchup.',
  },
  {
    question: 'What if neither driver in a Head-to-Head matchup starts?',
    answer:
      'The matchup is void and is removed from the available H2H points for that session. Your pick is neither right nor wrong.',
  },
  {
    question: 'How long after a session can my score change?',
    answer:
      'We check at roughly three hours, twelve hours and three days after publication. We can still apply a later FIA amendment manually.',
  },
  {
    question: 'Will I be told if my score changes?',
    answer:
      'Yes. An official amendment that changes your points triggers an in-app notification. The amended session also carries a note explaining the classification change.',
  },
] as const;

/** Bumped whenever the policy itself changes, not on copy tweaks. */
const POLICY_LAST_UPDATED = '2026-07-27';

const POLICY_LAST_UPDATED_LABEL = new Date(
  POLICY_LAST_UPDATED,
).toLocaleDateString('en-GB', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});

const structuredData = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'WebPage',
      '@id': `${siteConfig.url}/results-policy#page`,
      url: `${siteConfig.url}/results-policy`,
      name: 'How F1 penalties affect results',
      description:
        'How Grand Prix Picks scores F1 sessions when penalties, disqualifications and retirements change the official classification.',
      inLanguage: 'en',
      dateModified: POLICY_LAST_UPDATED,
      isPartOf: { '@id': `${siteConfig.url}/#app` },
      about: {
        '@type': 'Thing',
        name: 'Formula 1 penalties and race classification',
      },
    },
    breadcrumbSchema('/results-policy', [
      { name: 'Results policy', path: '/results-policy' },
    ]),
    {
      // Google retired FAQ rich results in May 2026. Kept because it stays
      // valid Schema.org and is still read by Bing and the AI crawlers; do not
      // expect SERP real estate from it.
      '@type': 'FAQPage',
      '@id': `${siteConfig.url}/results-policy#faq`,
      mainEntity: faqs.map((faq) => ({
        '@type': 'Question',
        name: faq.question,
        acceptedAnswer: {
          '@type': 'Answer',
          text: faq.answer,
        },
      })),
    },
  ],
};

export const Route = createFileRoute('/results-policy')({
  component: ResultsPolicyPage,
  head: () => {
    const meta = pageMeta({
      title: 'How F1 Penalties Affect Results | Grand Prix Picks',
      description:
        'Grid penalties change the starting grid, not the qualifying result. Post-race penalties do change the official F1 classification. Here is how we score both.',
      path: '/results-policy',
    });
    return {
      ...meta,
      scripts: [
        {
          type: 'application/ld+json',
          children: JSON.stringify(structuredData),
        },
      ],
    };
  },
});

const sessionRules = [
  {
    icon: TimerReset,
    session: 'Qualifying & Sprint Qualifying',
    rule: 'Use the classification, not the grid',
    detail:
      'A grid penalty changes where a driver starts the race. It does not rewrite the qualifying result, so it does not change your qualifying score.',
    noteLabel: 'What changes it',
    exception:
      'A qualifying disqualification or deleted lap time can change the qualifying classification. We use the revised order.',
  },
  {
    icon: Flag,
    session: 'Race & Sprint',
    rule: 'Use the final official classification',
    detail:
      'If a time penalty, disqualification or other stewards’ decision changes the official finishing order, we update our result and rescore the session.',
    noteLabel: 'What does not change it',
    exception:
      'Fines and licence penalty points do not change the classification, so they do not change your score.',
  },
] as const;

const timeline = [
  {
    title: 'We publish the first result',
    detail:
      'We score the classification available after the session. At this point, points may still change.',
  },
  {
    title: 'We check it again',
    detail:
      'Automatic checks run about 3 hours, 12 hours and 3 days after publication. A later FIA amendment can still be applied manually.',
  },
  {
    title: 'We rescore and notify',
    detail:
      'If the official order changed, we recalculate the session for everyone. If your points changed, you receive an in-app notification with your new session total.',
  },
] as const;

function ResultsPolicyPage() {
  return (
    <div className="min-h-screen bg-page">
      <div className="mx-auto max-w-5xl px-4 py-6">
        <PageHeader
          eyebrow="Results policy"
          title="How results and penalties are scored"
          subtitle="Your picks are scored against the official classification for each session. If that classification changes, we update the scores."
          actions={
            <div className="flex flex-wrap gap-3">
              <Button asChild size="sm" rightIcon={ArrowRight}>
                <Link to="/races">Make your picks</Link>
              </Button>
              <Button asChild size="sm" variant="secondary">
                <Link to="/how-to-play">How scoring works</Link>
              </Button>
            </div>
          }
        />

        <p className="-mt-6 mb-8 text-xs text-text-muted">
          Last updated{' '}
          <time dateTime={POLICY_LAST_UPDATED}>
            {POLICY_LAST_UPDATED_LABEL}
          </time>
        </p>

        <section
          aria-labelledby="principle-heading"
          className="border-y border-border py-10 sm:py-14"
        >
          <p className="mb-1 text-xs font-semibold tracking-label text-accent uppercase">
            The one rule
          </p>
          <h2
            id="principle-heading"
            className="font-title text-2xl font-semibold text-text"
          >
            The published classification is the result
          </h2>
          <div className="mt-4 max-w-3xl border-l-2 border-accent pl-4 text-base leading-7 text-text-muted">
            <p>
              We do not score the starting grid or the order at the chequered
              flag. We score the official classification published for that
              session.
            </p>
            <p className="mt-3 font-semibold text-text">
              When the official classification changes, our scores change with
              it.
            </p>
          </div>
        </section>

        <section
          aria-labelledby="sessions-heading"
          className="border-b border-border py-10 sm:py-14"
        >
          <div className="mb-8 max-w-3xl">
            <p className="mb-1 text-xs font-semibold tracking-label text-accent uppercase">
              What that means per session
            </p>
            <h2
              id="sessions-heading"
              className="font-title text-2xl font-semibold text-text"
            >
              Which result we use
            </h2>
            <p className="mt-2 text-base leading-7 text-text-muted">
              The key distinction is whether a penalty changes the
              classification for the session being scored.
            </p>
          </div>

          <div className="grid sm:grid-cols-2">
            {sessionRules.map((row, index) => (
              <div
                key={row.session}
                className={
                  index === 0
                    ? 'border-t border-border py-6 sm:pr-8'
                    : 'border-t border-border py-6 sm:border-l sm:pl-8'
                }
              >
                <div className="flex items-start gap-3">
                  <row.icon
                    className="mt-1 h-5 w-5 shrink-0 text-accent"
                    aria-hidden
                  />
                  <div className="min-w-0">
                    <h3 className="font-title text-lg font-semibold text-text">
                      {row.session}
                    </h3>
                    <p className="mt-1 text-sm font-semibold text-accent">
                      {row.rule}
                    </p>
                  </div>
                </div>
                <p className="gpp-reading-copy mt-5 text-text-muted">
                  {row.detail}
                </p>
                <p className="gpp-reading-copy mt-4 border-l-2 border-warning/60 pl-3 text-text-muted">
                  <span className="font-semibold text-text">
                    {row.noteLabel}:{' '}
                  </span>
                  {row.exception}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-6 border-t border-border-strong pt-8 sm:mt-8 sm:grid sm:grid-cols-[12rem_1fr] sm:gap-8">
            <h3 className="font-title text-base font-semibold text-text">
              One penalty, two different results
            </h3>
            <div className="mt-3 sm:mt-0">
              <p className="gpp-reading-copy max-w-3xl text-text-muted">
                A driver qualifies P2 and picks up a five-place grid penalty for
                a gearbox change. The next day, they finish P4 but receive a
                ten-second penalty and are classified P6.
              </p>
              <ul className="mt-5 grid gap-3 sm:grid-cols-2">
                <li className="gpp-reading-copy border-t border-border pt-3 text-text-muted">
                  <span className="mb-1 block font-semibold text-accent">
                    Qualifying · P2
                  </span>
                  The grid drop does not change the qualifying classification.
                </li>
                <li className="gpp-reading-copy border-t border-border pt-3 text-text-muted">
                  <span className="mb-1 block font-semibold text-accent">
                    Race · P6
                  </span>
                  The time penalty does change the race classification.
                </li>
              </ul>
            </div>
          </div>
        </section>

        <section
          aria-labelledby="retirements-heading"
          className="border-b border-border py-10 sm:py-14"
        >
          <div className="max-w-3xl">
            <p className="mb-1 text-xs font-semibold tracking-label text-accent uppercase">
              Retirements and non-starters
            </p>
            <h2
              id="retirements-heading"
              className="font-title text-2xl font-semibold text-text"
            >
              DNF, DNS and DSQ
            </h2>
            <dl className="mt-5 divide-y divide-border border-y border-border">
              <div className="py-4 sm:grid sm:grid-cols-[7rem_1fr] sm:gap-5">
                <dt className="font-semibold text-text">DNF, DSQ or NC</dt>
                <dd className="gpp-reading-copy mt-1 text-text-muted sm:mt-0">
                  The driver is still ordered in the official classification. We
                  use that order for Top 5 and Head-to-Head scoring. NC means
                  not classified, usually too few laps completed to be ranked.
                </dd>
              </div>
              <div className="py-4 sm:grid sm:grid-cols-[7rem_1fr] sm:gap-5">
                <dt className="font-semibold text-text">One DNS</dt>
                <dd className="gpp-reading-copy mt-1 text-text-muted sm:mt-0">
                  In a teammate matchup, the driver who started wins.
                </dd>
              </div>
              <div className="py-4 sm:grid sm:grid-cols-[7rem_1fr] sm:gap-5">
                <dt className="font-semibold text-text">Both DNS</dt>
                <dd className="gpp-reading-copy mt-1 text-text-muted sm:mt-0">
                  The matchup is void and removed from the available H2H points
                  for that session.
                </dd>
              </div>
            </dl>
            <p className="gpp-reading-copy mt-4 text-text-muted">
              These labels are shown on the result instead of a finishing
              position.
            </p>
          </div>
        </section>

        <section
          aria-labelledby="timeline-heading"
          className="border-b border-border py-10 sm:py-14"
        >
          <div className="mb-8 max-w-3xl">
            <p className="mb-1 text-xs font-semibold tracking-label text-accent uppercase">
              How a change reaches you
            </p>
            <h2
              id="timeline-heading"
              className="font-title text-2xl font-semibold text-text"
            >
              After a session ends
            </h2>
            <p className="mt-2 text-base leading-7 text-text-muted">
              Early points are provisional. This is what happens if the
              classification changes later.
            </p>
          </div>

          <ol className="grid gap-4 sm:grid-cols-3">
            {timeline.map((step, index) => (
              <li key={step.title} className="border-t-2 border-accent/50 pt-4">
                <h3 className="flex items-baseline gap-3 font-semibold text-text">
                  <span className="font-title gpp-mono text-xs font-semibold text-accent">
                    0{index + 1}
                  </span>
                  {step.title}
                </h3>
                <p className="gpp-reading-copy mt-1.5 text-text-muted">
                  {step.detail}
                </p>
              </li>
            ))}
          </ol>
        </section>

        <section
          aria-labelledby="fairness-heading"
          className="border-b border-border py-10 sm:py-14"
        >
          <div className="max-w-3xl">
            <p className="mb-1 text-xs font-semibold tracking-label text-accent uppercase">
              Fairness
            </p>
            <h2
              id="fairness-heading"
              className="font-title text-2xl font-semibold text-text"
            >
              The same correction applies to everyone
            </h2>
            <div className="gpp-reading-copy mt-4 space-y-4 text-text-muted">
              <p>
                We rescore the full session for every player. Points may go up,
                go down or stay the same. Leaderboards and season standings are
                then recalculated.
              </p>
              <p>
                Your original picks stay locked. An amendment never reopens a
                session or lets anyone edit a prediction.
              </p>
            </div>
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <div className="border border-border p-4">
                <h3 className="font-semibold text-text">Official amendment</h3>
                <p className="gpp-reading-copy mt-1 text-text-muted">
                  The real-world classification changed. We add a note to the
                  session and notify you if your points changed.
                </p>
              </div>
              <div className="border border-border p-4">
                <h3 className="font-semibold text-text">Data correction</h3>
                <p className="gpp-reading-copy mt-1 text-text-muted">
                  Our entry did not match the classification already published.
                  We fix and rescore it without an amendment notification.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section aria-labelledby="faq-heading" className="py-10 sm:py-14">
          <p className="mb-1 text-xs font-semibold tracking-label text-accent uppercase">
            Questions
          </p>
          <h2
            id="faq-heading"
            className="font-title text-2xl font-semibold text-text"
          >
            Common questions
          </h2>
          <dl className="mt-7 border-t border-border">
            {faqs.map((faq) => (
              <div
                key={faq.question}
                className="border-b border-border py-5 sm:grid sm:grid-cols-[1fr_1.4fr] sm:gap-8"
              >
                <dt className="font-semibold text-text">{faq.question}</dt>
                <dd className="gpp-reading-copy mt-2 text-text-muted sm:mt-0">
                  {faq.answer}
                </dd>
              </div>
            ))}
          </dl>
        </section>

        <section className="rounded-xl border border-accent/25 bg-accent-muted/20 p-6 text-center sm:p-8">
          <Flag className="mx-auto mb-3 h-7 w-7 text-accent" aria-hidden />
          <h2 className="font-title text-2xl font-semibold text-text">
            Spotted a result that looks wrong?
          </h2>
          <p className="gpp-reading-copy mx-auto mt-2 max-w-xl text-text-muted">
            If a session does not match the official classification, tell us and
            we will check it against the FIA result and amend it if needed.
          </p>
          <div className="mt-5 flex flex-wrap justify-center gap-3">
            <Button asChild size="sm" rightIcon={ArrowRight}>
              <Link to="/support">Contact support</Link>
            </Button>
            <Button asChild size="sm" variant="secondary">
              <Link to="/how-to-play">How to play</Link>
            </Button>
          </div>
        </section>
      </div>
    </div>
  );
}
