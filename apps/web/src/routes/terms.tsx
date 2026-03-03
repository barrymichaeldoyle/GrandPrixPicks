import { createFileRoute, Link } from '@tanstack/react-router';
import { ArrowLeft } from 'lucide-react';

import { Button } from '@/components/Button';

import { PageHero } from '../components/PageHero';
import { canonicalMeta, defaultOgImage } from '../lib/site';

export const Route = createFileRoute('/terms')({
  component: TermsPage,
  head: () => {
    const title = 'Terms of Service | Grand Prix Picks';
    const description =
      'Terms of service for Grand Prix Picks. Rules and conditions for using the prediction game.';
    const canonical = canonicalMeta('/terms');
    return {
      meta: [
        { title },
        { name: 'description', content: description },
        { property: 'og:title', content: title },
        { property: 'og:description', content: description },
        { property: 'og:image', content: defaultOgImage },
        { name: 'twitter:title', content: title },
        { name: 'twitter:description', content: description },
        { name: 'twitter:image', content: defaultOgImage },
        ...canonical.meta,
      ],
      links: [...canonical.links],
    };
  },
});

function TermsPage() {
  return (
    <div className="min-h-screen bg-page">
      <div className="mx-auto max-w-4xl px-4 py-6">
        <PageHero
          eyebrow="Legal"
          title="Terms of Service"
          subtitle="Last updated: February 2026"
        />

        <div className="reveal-up reveal-delay-1 prose prose-invert max-w-none space-y-6 text-text-muted">
          <section>
            <h2 className="mb-2 text-xl font-semibold text-text">
              1. Acceptance of Terms
            </h2>
            <p>
              These Terms of Service govern your use of Grand Prix Picks and are
              provided by Barry Michael Doyle Software Solutions (Pty) Ltd
              (&quot;we&quot;, &quot;us&quot;, or &quot;the app&quot;). By using
              Grand Prix Picks, you agree to these terms. If you do not agree,
              please do not use the app.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-xl font-semibold text-text">
              2. Description of Service
            </h2>
            <p>
              Grand Prix Picks is a fan-made, non-commercial prediction game
              where users predict the top 5 finishers for each session of a
              Formula 1 race weekend (qualifying, sprint qualifying, sprint, and
              race) and earn points based on accuracy. Users can also make
              head-to-head (H2H) predictions on teammate matchups. The app is
              provided for entertainment only and is not affiliated with Formula
              1, the FIA, or any related entities.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-xl font-semibold text-text">
              3. Eligibility and Account
            </h2>
            <p>
              You must be old enough to form a binding contract in your
              jurisdiction to use the app. You are responsible for keeping your
              account credentials secure and for all activity under your
              account. One account per person; do not create multiple accounts
              to gain an unfair advantage. Your username, display name,
              predictions, and scores are publicly visible on your profile page
              and the leaderboard.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-xl font-semibold text-text">
              4. Acceptable Use
            </h2>
            <p>
              You agree to use the app in good faith and not to cheat, abuse
              bugs, manipulate scores, or harass other users. Please choose a
              username that is respectful; we discourage offensive, hateful,
              discriminatory, or otherwise inappropriate usernames. We may
              remove predictions, adjust scores, change or remove usernames, or
              suspend or terminate accounts if we reasonably believe you have
              violated these terms or abused the service.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-xl font-semibold text-text">
              5. Predictions and Scoring
            </h2>
            <p>
              Predictions must be submitted before the deadline for each session
              (qualifying, sprint qualifying, sprint, and race each lock
              independently at their scheduled start time). Once a session is
              locked, predictions for that session cannot be changed. Scoring
              rules are defined within the app and may be updated; we will use
              reasonable efforts to communicate material changes.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-xl font-semibold text-text">
              6. Disclaimer
            </h2>
            <p>
              The app is provided &quot;as is&quot; without warranties of any
              kind. We do not guarantee uninterrupted access, accuracy of data,
              or compatibility with your device. We are not liable for any
              indirect, incidental, or consequential damages arising from your
              use of the app.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-xl font-semibold text-text">
              7. Changes to Terms or Service
            </h2>
            <p>
              We may change these terms or the app at any time. The &quot;Last
              updated&quot; date will be revised when we change the terms.
              Continued use after changes constitutes acceptance. We may
              discontinue the service with reasonable notice where feasible.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-xl font-semibold text-text">
              8. Refund Policy
            </h2>
            <p>
              Refunds for paid products are handled in accordance with
              Paddle&apos;s refund policy and buyer terms. Please see our{' '}
              <Link to="/refund-policy" className="text-accent hover:underline">
                Refund Policy
              </Link>{' '}
              page for details on how to request a refund.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-xl font-semibold text-text">9. Contact</h2>
            <p>
              For questions about these terms or the app, contact us at{' '}
              <a
                href="mailto:barry@barrymichaeldoyle.com"
                className="text-accent hover:underline"
              >
                barry@barrymichaeldoyle.com
              </a>{' '}
              or via the{' '}
              <Link to="/support" className="text-accent hover:underline">
                Support page
              </Link>
              .
            </p>
          </section>
        </div>

        <Button asChild size="sm" leftIcon={ArrowLeft} className="mt-8">
          <Link to="/">Back to home</Link>
        </Button>
      </div>
    </div>
  );
}
