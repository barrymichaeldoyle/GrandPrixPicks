import { createFileRoute, Link } from '@tanstack/react-router';

import { canonicalMeta, ogBaseUrl } from '../lib/site';

export const Route = createFileRoute('/privacy')({
  component: PrivacyPage,
  head: () => {
    const title = 'Privacy Policy | Grand Prix Picks';
    const description =
      'Privacy policy for Grand Prix Picks. How we collect, use, and protect your information.';
    const canonical = canonicalMeta('/privacy');
    return {
      meta: [
        { title },
        { name: 'description', content: description },
        { property: 'og:title', content: title },
        { property: 'og:description', content: description },
        { property: 'og:image', content: `${ogBaseUrl}/og/home.png` },
        { name: 'twitter:title', content: title },
        { name: 'twitter:description', content: description },
        { name: 'twitter:image', content: `${ogBaseUrl}/og/home.png` },
        ...canonical.meta,
      ],
      links: [...canonical.links],
    };
  },
});

function PrivacyPage() {
  return (
    <div className="min-h-screen bg-page">
      <div className="mx-auto max-w-4xl px-4 py-6">
        <div className="mb-8">
          <h1 className="mb-2 text-3xl font-bold text-text">Privacy Policy</h1>
          <p className="text-sm text-text-muted">Last updated: February 2026</p>
        </div>

        <div className="prose prose-invert max-w-none space-y-6 text-text-muted">
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
              2. Information We Collect
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
              3. How We Use Your Information
            </h2>
            <p>
              Your information is used to run the game: to associate your
              predictions with your account, to calculate and display your
              scores, and to show your username or display name on the
              leaderboard and your public profile page. Your username, display
              name, profile picture, predictions, and scores are publicly
              visible to other users once the relevant session has locked. We
              may use error-reporting or analytics services (e.g. Sentry) to
              improve the app; such services may receive limited technical data
              (e.g. IP address, device info) in accordance with their own
              policies.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-xl font-semibold text-text">
              4. Data Storage and Security
            </h2>
            <p>
              Account and authentication data are handled by Clerk. Prediction
              and leaderboard data are stored in Convex. We rely on these
              providers’ security and compliance practices. We do not store
              payment information; the app is free to use.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-xl font-semibold text-text">
              5. Your Rights and Choices
            </h2>
            <p>
              You can update your display name and account details through your
              account settings (e.g. via Clerk). You can choose to hide yourself
              from the leaderboard in your app settings. You may request
              deletion of your account and associated data by contacting us; we
              will process such requests in line with applicable law.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-xl font-semibold text-text">
              6. Changes to This Policy
            </h2>
            <p>
              We may update this privacy policy from time to time. The
              &quot;Last updated&quot; date at the top will be revised when we
              do. Continued use of the app after changes constitutes acceptance
              of the updated policy.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-xl font-semibold text-text">7. Contact</h2>
            <p>
              For privacy-related questions or requests, you can reach the
              operator of this app via the social media details provided on the
              main site's footer.
            </p>
          </section>
        </div>

        <p className="mt-8">
          <Link to="/" className="text-accent hover:underline">
            ← Back to home
          </Link>
        </p>
      </div>
    </div>
  );
}
