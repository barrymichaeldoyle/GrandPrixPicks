import { SUPPORT_EMAIL, SUPPORT_MAILTO } from '@grandprixpicks/shared/contact';
import { createFileRoute, Link } from '@tanstack/react-router';

import { setStaticContentCacheHeaders } from '@/lib/publicPageCacheHeaders';
import { ArrowLeft } from 'lucide-react';

import { Button } from '@/components/Button/Button';

import { PageHeader } from '@/components/PageHeader';
import { pageMeta } from '@/lib/site';
import { useInAppView } from '@/hooks/useInAppView';

export const Route = createFileRoute('/privacy')({
  loader: setStaticContentCacheHeaders,
  component: PrivacyPage,
  head: () =>
    pageMeta({
      title: 'Privacy Policy | Grand Prix Picks',
      description:
        'Privacy policy for Grand Prix Picks: what we collect when you play the F1 prediction game, how we use it, and how to delete your account and its data.',
      path: '/privacy',
    }),
});

function PrivacyPage() {
  const inApp = useInAppView();
  return (
    <div className="min-h-screen bg-page">
      <div className="mx-auto max-w-4xl px-4 py-6">
        <PageHeader
          title="Privacy policy"
          subtitle="Last updated: August 2026"
        />

        <div className="reveal-up reveal-delay-1 prose prose-invert max-w-none space-y-6 text-text-muted">
          <section>
            <h2 className="mb-2 text-xl font-semibold text-text">
              1. Introduction
            </h2>
            <p>
              Grand Prix Picks (&quot;we&quot;, &quot;our&quot;, or &quot;the
              app&quot;) is a fan-made prediction game for Formula 1. This
              privacy policy explains how we handle your information when you
              use the service.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-xl font-semibold text-text">
              2. Information we collect
            </h2>
            <p>
              We use Clerk for authentication. When you sign in, we receive and
              store the information you provide (such as your email, username,
              display name, and profile picture) and use it to identify you,
              show your predictions and scores on the leaderboard, and operate
              the app. We also store your predictions (top 5 and head-to-head),
              scores, and follow relationships (who you follow and who follows
              you). We do not sell your data.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-xl font-semibold text-text">
              3. How we use your information
            </h2>
            <p>
              Your information is used to run the game: to associate your
              predictions with your account, to calculate and display your
              scores, and to show your username or display name on the
              leaderboard and your public profile page. Your username, display
              name, profile picture, predictions, and scores are publicly
              visible to other users once the relevant session has locked. We
              may use error-reporting or analytics services (e.g. Sentry and
              PostHog) to improve the app; such services may receive limited
              account, usage, and technical data (e.g. IP address, device info)
              in accordance with their own policies. Outside the European
              Economic Area, the United Kingdom and Switzerland, the website may
              also record a masked replay of page layout and interactions to
              help diagnose usability problems; all visible text and form inputs
              are masked before capture. Visitors in those regions are measured
              without cookies or stored identifiers, and no replay is recorded.
              The mobile app offers an analytics choice in Settings.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-xl font-semibold text-text">
              4. Data storage and security
            </h2>
            <p>
              Account and authentication data are handled by Clerk. Prediction
              and leaderboard data are stored in Convex. We rely on these
              providers’ security and compliance practices. If you make an
              optional purchase, payments are processed by our payment provider
              (Paddle), and we do not store your card or payment details.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-xl font-semibold text-text">
              5. Your rights and choices
            </h2>
            <p>
              You can update your display name and account details through your
              account settings (e.g. via Clerk). You may request deletion of
              your account and associated data by contacting us; we will process
              such requests in line with applicable law.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-xl font-semibold text-text">6. Cookies</h2>
            <p>
              We do not show advertising. Cookies and similar browser storage
              are used to keep you signed in (Clerk) and, outside the European
              Economic Area, the United Kingdom and Switzerland, to recognise a
              returning browser for analytics (PostHog). Visitors in those
              regions are measured without cookies or stored identifiers.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-xl font-semibold text-text">
              7. Changes to this policy
            </h2>
            <p>
              We may update this privacy policy from time to time. The
              &quot;Last updated&quot; date at the top will be revised when we
              do. Continued use of the app after changes constitutes acceptance
              of the updated policy.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-xl font-semibold text-text">8. Contact</h2>
            {/* A privacy policy has to name a way to exercise data rights.
                Pointing at the footer's social links made the reader hunt for
                one, and DM'ing a public account is a poor channel for it. */}
            <p>
              For privacy-related questions or requests, including access and
              deletion, email{' '}
              <a href={SUPPORT_MAILTO} className="text-accent underline">
                {SUPPORT_EMAIL}
              </a>{' '}
              or use the{' '}
              <Link to="/support" className="text-accent underline">
                support form
              </Link>
              .
            </p>
          </section>
        </div>

        {inApp ? null : (
          <Button asChild size="sm" leftIcon={ArrowLeft} className="mt-8">
            <Link to="/">Back to home</Link>
          </Button>
        )}
      </div>
    </div>
  );
}
