import { createFileRoute, Link } from '@tanstack/react-router';

import { ogBaseUrl } from '../lib/site';

export const Route = createFileRoute('/pricing')({
  component: PricingPage,
  head: () => ({
    meta: [
      { title: 'Pricing | Grand Prix Picks' },
      {
        name: 'description',
        content:
          'Season Pass pricing for Grand Prix Picks. One purchase for the full F1 season—unlock unlimited leagues and public leagues.',
      },
      { property: 'og:image', content: `${ogBaseUrl}/og/home.png` },
      { name: 'twitter:image', content: `${ogBaseUrl}/og/home.png` },
    ],
  }),
});

function PricingPage() {
  return (
    <div className="min-h-screen bg-page">
      <div className="mx-auto max-w-4xl px-4 py-8">
        <div className="mb-8">
          <h1 className="mb-2 text-3xl font-bold text-text">Pricing</h1>
          <p className="text-text-muted">
            Grand Prix Picks is free to play. Upgrade to a Season Pass for
            premium features.
          </p>
        </div>

        <div className="space-y-8">
          <section className="rounded-xl border border-border bg-surface p-6 sm:p-8">
            <h2 className="mb-1 text-xl font-semibold text-text">
              Season Pass 2026
            </h2>
            <p className="mb-6 text-sm text-text-muted">
              One purchase for the full 2026 F1 season
            </p>

            <div className="mb-6 flex items-baseline gap-2">
              <span className="text-4xl font-bold tracking-tight text-text">
                $19.99
              </span>
              <span className="text-text-muted">USD</span>
            </div>

            <p className="mb-6 text-text-muted">
              Season Pass unlocks premium features: join unlimited leagues (free
              accounts are limited to 5), and create public leagues that anyone
              can discover and join. One purchase covers the full F1 season.
              Grand Prix Picks is a fun, social prediction game—no gambling or
              real-money betting, just points and leaderboards.
            </p>

            <p className="text-sm text-text-muted">
              Payment is processed securely by Paddle. Checkout will be
              available when the season pass is launched.
            </p>

            <div className="mt-6 border-t border-border pt-6">
              <h3 className="mb-2 text-sm font-semibold text-text">
                Refund policy
              </h3>
              <p className="mb-2 text-sm text-text-muted">
                You may request a full refund within 14 days of purchase. After
                that, refunds are not available. See our{' '}
                <Link to="/terms" className="text-accent hover:underline">
                  Terms of Service
                </Link>{' '}
                for the full refund policy.
              </p>
            </div>
          </section>

          <p className="text-sm text-text-muted">
            <Link to="/" className="text-accent hover:underline">
              ← Back to home
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
