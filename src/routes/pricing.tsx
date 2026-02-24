import { useAuth } from '@clerk/clerk-react';
import { createFileRoute, Link } from '@tanstack/react-router';
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { useState } from 'react';

import { canonicalMeta, ogBaseUrl } from '../lib/site';

const EARLY_BIRD_CODE = 'EARLYBIRD2026';
const EARLY_BIRD_EXPIRES_AT_UTC = '2026-04-01T23:59:00Z';

function isEarlyBirdActive(now = new Date()): boolean {
  return now.getTime() <= new Date(EARLY_BIRD_EXPIRES_AT_UTC).getTime();
}

export const Route = createFileRoute('/pricing')({
  component: PricingPage,
  head: () => {
    const title = 'Pricing | Grand Prix Picks';
    const description =
      'Season Pass pricing for Grand Prix Picks. One purchase for the full F1 season—unlock unlimited leagues and public leagues.';
    const canonical = canonicalMeta('/pricing');
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

function PricingPage() {
  const { isSignedIn } = useAuth();
  const [isStartingCheckout, setIsStartingCheckout] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);

  async function startCheckout() {
    setCheckoutError(null);
    setIsStartingCheckout(true);

    try {
      const response = await fetch('/api/paddle/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ season: 2026 }),
      });

      const payload = (await response.json()) as {
        checkoutUrl?: string;
        error?: string;
      };

      if (!response.ok || !payload.checkoutUrl) {
        throw new Error(payload.error ?? 'Could not start checkout');
      }

      const checkoutUrl = new URL(payload.checkoutUrl, window.location.origin);
      if (isEarlyBirdActive()) {
        checkoutUrl.searchParams.set('coupon', EARLY_BIRD_CODE);
      }
      window.location.assign(checkoutUrl.toString());
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Could not start checkout';
      setCheckoutError(message);
      setIsStartingCheckout(false);
    }
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-page">
      <div className="pointer-events-none absolute inset-x-0 top-0 z-0 h-[32rem]">
        <div className="absolute top-0 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-accent/15 blur-3xl" />
        <div className="absolute top-24 right-8 h-60 w-60 rounded-full bg-success/10 blur-3xl" />
        <div className="absolute top-32 left-8 h-56 w-56 rounded-full bg-warning/10 blur-3xl" />
      </div>

      <div className="relative z-10 mx-auto max-w-4xl px-4 py-6">
        <motion.div
          className="mb-8"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
        >
          <h1 className="mb-2 text-3xl font-bold text-text">Pricing</h1>
          <p className="text-text-muted">
            Grand Prix Picks is free to play. Upgrade for full-season league
            access.
          </p>
        </motion.div>

        <div className="space-y-8">
          {isEarlyBirdActive() ? (
            <motion.section
              className="rounded-xl border border-accent/40 bg-accent/10 p-5 shadow-[0_10px_26px_-20px_rgba(13,148,136,0.7)] sm:p-6"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            >
              <p className="text-xs font-semibold tracking-[0.12em] text-accent">
                LIMITED-TIME PROMO
              </p>
              <h2 className="mt-1 text-2xl font-bold text-text">
                Use code {EARLY_BIRD_CODE} at checkout
              </h2>
              <p className="mt-2 text-sm text-text-muted">
                Active through April 1, 2026 at 11:59 PM UTC. We&apos;ll prefill
                the code for you when you launch checkout from this page.
              </p>
            </motion.section>
          ) : null}

          <motion.section
            className="rounded-xl border border-border bg-surface/95 p-6 shadow-[0_12px_30px_-24px_rgba(13,148,136,0.45)] backdrop-blur-[1px] sm:p-8"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          >
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

            <ul className="mb-6 space-y-2 text-sm text-text">
              <motion.li
                className="flex items-start gap-2"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.08 }}
              >
                <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-accent" />
                <span>
                  Join unlimited leagues (free accounts are limited to 5)
                </span>
              </motion.li>
              <motion.li
                className="flex items-start gap-2"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.14 }}
              >
                <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-accent" />
                <span>Create public leagues anyone can discover and join</span>
              </motion.li>
              <motion.li
                className="flex items-start gap-2"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.2 }}
              >
                <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-accent" />
                <span>One-time payment for the entire 2026 season</span>
              </motion.li>
            </ul>

            <button
              type="button"
              onClick={() => {
                void startCheckout();
              }}
              disabled={!isSignedIn || isStartingCheckout}
              aria-disabled={!isSignedIn || isStartingCheckout}
              className="inline-flex items-center gap-1.5 rounded-lg bg-button-accent px-4 py-2.5 text-sm font-semibold text-white shadow-[0_10px_20px_-14px_rgba(13,148,136,0.65)] transition-all hover:-translate-y-0.5 hover:bg-button-accent-hover hover:shadow-[0_16px_28px_-16px_rgba(13,148,136,0.72)] disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isSignedIn
                ? isStartingCheckout
                  ? 'Starting Checkout...'
                  : isEarlyBirdActive()
                    ? `Claim ${EARLY_BIRD_CODE}`
                    : 'Get 2026 Season Pass'
                : 'Sign In to Buy'}
              {!isStartingCheckout ? (
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              ) : null}
            </button>

            <p className="mt-3 text-sm text-text-muted">
              Secure checkout via Paddle. No subscriptions, no gambling, and no
              real-money betting in gameplay.
            </p>
            {checkoutError ? (
              <p className="mt-2 text-sm text-error">{checkoutError}</p>
            ) : null}

            <div className="mt-6 border-t border-border pt-6">
              <h3 className="mb-2 text-sm font-semibold text-text">
                Refund policy
              </h3>
              <p className="mb-2 text-sm text-text-muted">
                If you purchase and change your mind, refunds are handled in
                accordance with Paddle&apos;s refund policy. See our{' '}
                <Link
                  to="/refund-policy"
                  className="text-accent hover:underline"
                >
                  Refund Policy
                </Link>{' '}
                and{' '}
                <Link to="/terms" className="text-accent hover:underline">
                  Terms of Service
                </Link>{' '}
                for details.
              </p>
            </div>
          </motion.section>

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
