import { SignInButton, useAuth } from '@clerk/clerk-react';
import { createFileRoute, Link } from '@tanstack/react-router';
import { motion } from 'framer-motion';
import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  HelpCircle,
  ShieldCheck,
  Users,
} from 'lucide-react';
import { useState } from 'react';

import { Button } from '../components/Button';
import { FaqItem, FaqSection } from '../components/Faq';
import { canonicalMeta, defaultOgImage } from '../lib/site';

const EARLY_BIRD_CODE = 'EARLYBIRD2026';
const EARLY_BIRD_EXPIRES_AT_UTC = '2026-04-01T23:59:00Z';
const fadeUp = {
  initial: { opacity: 0, y: 8 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, amount: 0.18 },
  transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] as const },
};

function isEarlyBirdActive(now = new Date()): boolean {
  return now.getTime() <= new Date(EARLY_BIRD_EXPIRES_AT_UTC).getTime();
}

export const Route = createFileRoute('/pricing')({
  validateSearch: (
    search: Record<string, unknown>,
  ): { checkout?: 'cancelled' } => {
    const checkout = search.checkout === 'cancelled' ? 'cancelled' : undefined;
    return { checkout };
  },
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

function PricingPage() {
  const { isSignedIn } = useAuth();
  const navigate = Route.useNavigate();
  const search = Route.useSearch();
  const [isStartingCheckout, setIsStartingCheckout] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const showCheckoutCancelled = search.checkout === 'cancelled';

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
    <div className="mx-auto max-w-5xl bg-page px-4 py-6 sm:py-8">
      <motion.div
        className="mb-8 text-center sm:mb-10"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      >
        <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-border bg-surface-muted/70 px-3 py-1 text-xs font-semibold text-text-muted">
          <CalendarDays className="h-3.5 w-3.5 text-accent" aria-hidden />
          2026 Season Pricing
        </p>
        <h1 className="mb-2 text-3xl font-bold text-text sm:text-4xl">
          Pricing
        </h1>
        <p className="mx-auto max-w-2xl text-text-muted">
          Grand Prix Picks is free to play. Upgrade for full-season league
          access.
        </p>
      </motion.div>

      <div className="space-y-8 sm:space-y-10">
        {showCheckoutCancelled ? (
          <motion.section
            className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-warning/35 bg-warning-muted/45 p-4"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          >
            <p className="text-sm text-text">
              Checkout was cancelled. You can restart it any time below.
            </p>
            <Button
              type="button"
              variant="text"
              size="inline"
              onClick={() => {
                void navigate({
                  to: '/pricing',
                  search: (prev) => ({ ...prev, checkout: undefined }),
                  replace: true,
                });
              }}
            >
              Dismiss
            </Button>
          </motion.section>
        ) : null}

        {isEarlyBirdActive() ? (
          <motion.section
            className="rounded-xl border border-accent/35 bg-accent-muted/50 p-5 sm:p-6"
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
          className="rounded-2xl border border-border bg-surface/95 p-6 sm:p-8"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        >
          {isEarlyBirdActive() ? (
            <div className="mb-4 inline-flex items-center rounded-full border border-success/35 bg-success/10 px-3 py-1 text-xs font-semibold tracking-[0.1em] text-success">
              EARLY BIRD 50% OFF
            </div>
          ) : null}
          <h2 className="mb-1 text-xl font-semibold text-text">
            Season Pass 2026
          </h2>
          <p className="mb-6 text-sm text-text-muted">
            One purchase for the full 2026 F1 season
          </p>

          {isEarlyBirdActive() ? (
            <div className="mb-6 flex items-baseline gap-3">
              <span className="text-2xl font-semibold tracking-tight text-text-muted line-through">
                $19.99
              </span>
              <span className="text-4xl font-bold tracking-tight text-success">
                $9.99
              </span>
              <span className="text-text-muted">USD</span>
            </div>
          ) : (
            <div className="mb-6 flex items-baseline gap-2">
              <span className="text-4xl font-bold tracking-tight text-text">
                $19.99
              </span>
              <span className="text-text-muted">USD</span>
            </div>
          )}

          <ul className="mb-6 space-y-2 text-sm text-text">
            <motion.li
              className="flex items-start gap-2"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.08 }}
            >
              <CheckCircle2
                className="mt-0.5 h-4 w-4 shrink-0 text-accent"
                aria-hidden
              />
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
              <CheckCircle2
                className="mt-0.5 h-4 w-4 shrink-0 text-accent"
                aria-hidden
              />
              <span>Create public leagues anyone can discover and join</span>
            </motion.li>
            <motion.li
              className="flex items-start gap-2"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.2 }}
            >
              <CheckCircle2
                className="mt-0.5 h-4 w-4 shrink-0 text-accent"
                aria-hidden
              />
              <span>One-time payment for the entire 2026 season</span>
            </motion.li>
          </ul>

          {isSignedIn ? (
            <Button
              type="button"
              onClick={() => {
                void startCheckout();
              }}
              size="sm"
              rightIcon={ArrowRight}
              loading={isStartingCheckout}
              aria-disabled={isStartingCheckout}
            >
              {isEarlyBirdActive()
                ? `Claim ${EARLY_BIRD_CODE}`
                : 'Get 2026 Season Pass'}
            </Button>
          ) : (
            <SignInButton mode="modal">
              <Button type="button" size="sm" rightIcon={ArrowRight}>
                Sign In to Continue
              </Button>
            </SignInButton>
          )}

          <p className="mt-3 text-sm text-text-muted">
            Secure checkout via Paddle. No subscriptions, no gambling, and no
            real-money betting in gameplay.
          </p>
          <p className="mt-1 text-xs text-text-muted">
            {isSignedIn
              ? 'You will be redirected to Paddle to complete payment.'
              : 'Sign in first, then you can complete checkout in under a minute.'}
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
              <Link to="/refund-policy" className="text-accent hover:underline">
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

        <section className="grid gap-3 sm:grid-cols-3">
          <motion.div
            {...fadeUp}
            className="rounded-xl border border-border bg-surface p-4"
          >
            <p className="mb-2 inline-flex h-8 w-8 items-center justify-center rounded-full bg-accent/15 text-accent">
              <Users className="h-4 w-4" aria-hidden />
            </p>
            <h3 className="text-sm font-semibold text-text">
              League Flexibility
            </h3>
            <p className="mt-1 text-sm text-text-muted">
              Create and join as many leagues as you want all season.
            </p>
          </motion.div>

          <motion.div
            {...fadeUp}
            transition={{ ...fadeUp.transition, delay: 0.08 }}
            className="rounded-xl border border-border bg-surface p-4"
          >
            <p className="mb-2 inline-flex h-8 w-8 items-center justify-center rounded-full bg-success/15 text-success">
              <ShieldCheck className="h-4 w-4" aria-hidden />
            </p>
            <h3 className="text-sm font-semibold text-text">
              Fair Competition
            </h3>
            <p className="mt-1 text-sm text-text-muted">
              Session locks and transparent scoring keep competition clean.
            </p>
          </motion.div>

          <motion.div
            {...fadeUp}
            transition={{ ...fadeUp.transition, delay: 0.16 }}
            className="rounded-xl border border-border bg-surface p-4"
          >
            <p className="mb-2 inline-flex h-8 w-8 items-center justify-center rounded-full bg-warning/15 text-warning">
              <CalendarDays className="h-4 w-4" aria-hidden />
            </p>
            <h3 className="text-sm font-semibold text-text">
              Full-Season Access
            </h3>
            <p className="mt-1 text-sm text-text-muted">
              One purchase covers the entire 2026 campaign. No monthly plan.
            </p>
          </motion.div>
        </section>

        <FaqSection title="Pricing FAQ">
          <FaqItem
            icon={HelpCircle}
            question="Do I need the Season Pass to play?"
          >
            <p className="text-sm text-text-muted">
              No. Grand Prix Picks is free to play. The pass unlocks unlimited
              leagues and public league creation.
            </p>
          </FaqItem>
          <FaqItem icon={HelpCircle} question="Is this a subscription?">
            <p className="text-sm text-text-muted">
              No subscription. It is a one-time purchase for the full 2026
              season.
            </p>
          </FaqItem>
        </FaqSection>

        <p className="text-sm text-text-muted">
          <Link to="/" className="text-accent hover:underline">
            ← Back to home
          </Link>
        </p>
      </div>
    </div>
  );
}
