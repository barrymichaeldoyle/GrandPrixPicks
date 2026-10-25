import { createFileRoute, Link } from '@tanstack/react-router';
import { ArrowLeft, ArrowRight, CheckCircle2, HelpCircle } from 'lucide-react';
import { useState } from 'react';

import { captureAnalyticsEvent } from '@/lib/analytics';
import { useViewerSession } from '@/integrations/clerk/useViewerSession';

import { Button } from '@/components/Button/Button';
import { SignInActionButton } from '@/integrations/clerk/SignInActionButton';
import { FaqItem, FaqSection } from '@/components/Faq';
import { pageMeta } from '@/lib/site';

/** Single source of truth for the price shown on the page and in Offer markup. */
const SEASON_PASS_PRICE_USD = '19.99';

export const Route = createFileRoute('/pricing')({
  validateSearch: (
    search: Record<string, unknown>,
  ): { checkout?: 'cancelled' } => {
    const checkout = search.checkout === 'cancelled' ? 'cancelled' : undefined;
    return { checkout };
  },
  component: PricingPage,
  head: () =>
    pageMeta({
      title: 'F1 Season Pass Pricing | Grand Prix Picks',
      description:
        'Season Pass pricing for Grand Prix Picks. One purchase for the full F1 season includes unlimited league joins and up to five public leagues.',
      path: '/pricing',
      noIndex: true,
    }),
});

function PricingPage() {
  // SSR-resolved so the checkout CTA renders the right variant on the first
  // paint instead of flashing "Sign in to continue" before Clerk boots.
  const { isSignedIn } = useViewerSession();
  const navigate = Route.useNavigate();
  const search = Route.useSearch();
  const [isStartingCheckout, setIsStartingCheckout] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const showCheckoutCancelled = search.checkout === 'cancelled';

  async function startCheckout() {
    setCheckoutError(null);
    setIsStartingCheckout(true);
    captureAnalyticsEvent('checkout_started', {
      season: 2026,
      source: 'pricing',
      signed_in: isSignedIn,
    });

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
      captureAnalyticsEvent('checkout_redirected', {
        season: 2026,
        source: 'pricing',
      });
      window.location.assign(checkoutUrl.toString());
    } catch (error) {
      captureAnalyticsEvent('checkout_start_failed', {
        season: 2026,
        source: 'pricing',
        signed_in: isSignedIn,
      });
      const message =
        error instanceof Error ? error.message : 'Could not start checkout';
      setCheckoutError(message);
      setIsStartingCheckout(false);
    }
  }

  return (
    <div className="mx-auto max-w-5xl bg-page px-4 py-6 sm:py-8">
      <div className="reveal-up mb-8 text-center sm:mb-10">
        <h1 className="mb-2 text-3xl font-semibold text-text sm:text-4xl">
          Pricing
        </h1>
        <p className="mx-auto max-w-2xl text-text-muted">
          Grand Prix Picks is free to play. The Season Pass raises your league
          limits.
        </p>
      </div>

      <div className="space-y-8 sm:space-y-10">
        {showCheckoutCancelled ? (
          <section className="reveal-up flex flex-wrap items-center justify-between gap-3 rounded-xl border border-warning/35 bg-warning-muted/45 p-4">
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
          </section>
        ) : null}

        <section className="reveal-up rounded-2xl border border-border bg-surface/95 p-6 sm:p-8">
          <h2 className="mb-1 text-xl font-semibold text-text">
            Season Pass 2026
          </h2>
          <p className="mb-6 text-sm text-text-muted">
            One purchase for the full 2026 F1 season
          </p>

          <div className="mb-6 flex items-baseline gap-2">
            <span className="text-4xl font-semibold tracking-tight text-text">
              ${SEASON_PASS_PRICE_USD}
            </span>
            <span className="text-text-muted">USD</span>
          </div>

          <ul className="mb-6 space-y-2 text-sm text-text">
            <li className="reveal-up reveal-delay-1 flex items-start gap-2">
              <CheckCircle2
                className="mt-0.5 h-4 w-4 shrink-0 text-accent"
                aria-hidden
              />
              <span>
                Join unlimited leagues (free accounts are limited to 5)
              </span>
            </li>
            <li className="reveal-up reveal-delay-2 flex items-start gap-2">
              <CheckCircle2
                className="mt-0.5 h-4 w-4 shrink-0 text-accent"
                aria-hidden
              />
              <span>Run up to five public leagues instead of the free one</span>
            </li>
            <li className="reveal-up reveal-delay-3 flex items-start gap-2">
              <CheckCircle2
                className="mt-0.5 h-4 w-4 shrink-0 text-accent"
                aria-hidden
              />
              <span>One-time payment for the entire 2026 season</span>
            </li>
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
              Get 2026 Season Pass
            </Button>
          ) : (
            <SignInActionButton size="sm" rightIcon={ArrowRight}>
              Sign in to continue
            </SignInActionButton>
          )}

          <p className="mt-3 text-sm text-text-muted">
            Secure checkout via Paddle. No subscriptions, no gambling, and no
            real-money betting in gameplay.
          </p>
          {isSignedIn ? (
            <p className="mt-1 text-xs text-text-muted">
              You will be redirected to Paddle to complete payment.
            </p>
          ) : null}
          {checkoutError ? (
            <p className="mt-2 text-sm text-error">{checkoutError}</p>
          ) : null}

          <div className="mt-6 border-t border-border pt-6">
            <h3 className="mb-2 text-sm font-semibold text-text">
              Refund policy
            </h3>
            <p className="mb-2 text-sm text-text-muted">
              Refunds follow Paddle&apos;s refund policy. The details are in our{' '}
              <Link to="/refund-policy" className="text-accent underline">
                Refund Policy
              </Link>{' '}
              and{' '}
              <Link to="/terms" className="text-accent underline">
                Terms of Service
              </Link>
              .
            </p>
          </div>
        </section>

        <FaqSection title="Pricing FAQ">
          <FaqItem
            icon={HelpCircle}
            question="Do I need the Season Pass to play?"
          >
            <p className="text-sm text-text-muted">
              No. Grand Prix Picks is free to play, and every player gets one
              free public league. The pass includes unlimited league joins and
              up to five public leagues.
            </p>
          </FaqItem>
          <FaqItem icon={HelpCircle} question="Is this a subscription?">
            <p className="text-sm text-text-muted">
              No subscription. It is a one-time purchase for the full 2026
              season.
            </p>
          </FaqItem>
        </FaqSection>

        <Button asChild size="sm" leftIcon={ArrowLeft}>
          <Link to="/">Back to home</Link>
        </Button>
      </div>
    </div>
  );
}
