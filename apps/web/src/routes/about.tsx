import { createFileRoute, Link } from '@tanstack/react-router';

import { setStaticContentCacheHeaders } from '@/lib/publicPageCacheHeaders';
import { ArrowRight } from 'lucide-react';

import { Button } from '@/components/Button/Button';
import { PageHeader } from '@/components/PageHeader';
import {
  breadcrumbSchema,
  organizationSchema,
  pageMeta,
  siteConfig,
} from '@/lib/site';

export const Route = createFileRoute('/about')({
  loader: setStaticContentCacheHeaders,
  component: AboutPage,
  head: () => {
    const meta = pageMeta({
      title: 'About Grand Prix Picks | Who Makes It and How It Works',
      description:
        'An independent, fan-made Formula 1 prediction game with no gambling and no real-money betting. Who builds it, where results come from, and how to get in touch.',
      path: '/about',
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
                '@type': 'AboutPage',
                '@id': `${siteConfig.url}/about#page`,
                url: `${siteConfig.url}/about`,
                name: 'About Grand Prix Picks',
                inLanguage: 'en',
                isPartOf: { '@id': `${siteConfig.url}/#app` },
              },
              organizationSchema(),
              breadcrumbSchema('/about', [{ name: 'About', path: '/about' }]),
            ],
          }),
        },
      ],
    };
  },
});

function AboutPage() {
  return (
    <div className="min-h-screen bg-page">
      <div className="mx-auto max-w-3xl px-4 py-6">
        <PageHeader
          title="About Grand Prix Picks"
          subtitle="An independent Formula 1 prediction game, built and run by one person."
        />

        <section className="mt-2 border-t border-border pt-8">
          <h2 className="font-title text-2xl font-semibold text-text">
            What this is
          </h2>
          <p className="gpp-reading-copy mt-4 text-text-muted">
            Grand Prix Picks is a free prediction game for Formula 1 race
            weekends. You rank the five drivers you expect to finish at the
            front of each session, choose who will finish ahead in each team,
            and score points based on how close you were. Your results carry
            across the season on a global leaderboard and in any private leagues
            you join.
          </p>
          <p className="gpp-reading-copy mt-4 text-text-muted">
            There is no gambling here and no real-money betting of any kind. You
            cannot stake money on an outcome, and there is nothing to cash out.
            The game is free to play in full. An optional Season Pass raises the
            limits on how many leagues you can create and join, and that is the
            only thing money buys.
          </p>
        </section>

        <section className="mt-10 border-t border-border pt-8">
          <h2 className="font-title text-2xl font-semibold text-text">
            Who makes it
          </h2>
          <p className="gpp-reading-copy mt-4 text-text-muted">
            Grand Prix Picks is built and maintained by{' '}
            <a
              href={siteConfig.author.url}
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-accent hover:underline"
            >
              {siteConfig.author.name}
            </a>
            , a software engineer and Formula 1 fan. It started as a way to
            settle arguments with friends about who would finish where, and grew
            into a full season-long game with leagues, head-to-head picks and a
            mobile app.
          </p>
          <p className="gpp-reading-copy mt-4 text-text-muted">
            It is operated by Barry Michael Doyle Software Solutions (Pty) Ltd.
            The site is not affiliated with, endorsed by, or connected to
            Formula 1, the FIA, or any Formula 1 team. All team and driver names
            are used for identification only.
          </p>
        </section>

        <section className="mt-10 border-t border-border pt-8">
          <h2 className="font-title text-2xl font-semibold text-text">
            Where the results come from
          </h2>
          <p className="gpp-reading-copy mt-4 text-text-muted">
            Every session is scored against the official FIA classification
            rather than the order cars crossed the line. That distinction
            matters: post-race penalties change the classification, and when
            they do, affected sessions are rescored so that the game reflects
            the result that actually counts for the championship.
          </p>
          <p className="gpp-reading-copy mt-4 text-text-muted">
            Published results are automatically reconciled against timing data
            after each session to catch late amendments. The full policy,
            including how grid penalties are handled differently from post-race
            penalties, is written up on the{' '}
            <Link
              to="/results-policy"
              className="font-medium text-accent hover:underline"
            >
              results and penalties page
            </Link>
            .
          </p>
        </section>

        <section className="mt-10 border-t border-border pt-8">
          <h2 className="font-title text-2xl font-semibold text-text">
            Getting in touch
          </h2>
          <p className="gpp-reading-copy mt-4 text-text-muted">
            The quickest route is the{' '}
            <Link
              to="/support"
              className="font-medium text-accent hover:underline"
            >
              support form
            </Link>
            , which goes straight to me. If something has been scored wrongly,
            include the race and session and I will look at it.
          </p>
          <p className="gpp-reading-copy mt-4 text-text-muted">
            You can also find the game on{' '}
            <a
              href={siteConfig.social.x.url}
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-accent hover:underline"
            >
              {siteConfig.social.x.handle} on X
            </a>
            ,{' '}
            <a
              href={siteConfig.social.instagram.url}
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-accent hover:underline"
            >
              {siteConfig.social.instagram.handle} on Instagram
            </a>
            , and at{' '}
            <a
              href={siteConfig.social.reddit.url}
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-accent hover:underline"
            >
              {siteConfig.social.reddit.name}
            </a>
            .
          </p>
        </section>

        <section className="mt-12 border-t border-border pt-8">
          <h2 className="font-title text-xl font-semibold text-text">
            Start playing
          </h2>
          <p className="gpp-reading-copy mt-2 text-text-muted">
            You can build a prediction before you create an account. Sign in
            only when you want to save it.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Button asChild size="sm" rightIcon={ArrowRight}>
              <Link to="/races">View race weekends</Link>
            </Button>
            <Button asChild size="sm" variant="secondary">
              <Link to="/how-to-play">Read the rules</Link>
            </Button>
          </div>
        </section>
      </div>
    </div>
  );
}
