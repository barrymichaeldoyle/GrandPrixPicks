import { createFileRoute, Link } from '@tanstack/react-router';

import { setStaticContentCacheHeaders } from '@/lib/publicPageCacheHeaders';
import { ArrowLeft } from 'lucide-react';

import { Button } from '@/components/Button/Button';

import { PageHeader } from '@/components/PageHeader';
import { pageMeta } from '@/lib/site';

export const Route = createFileRoute('/refund-policy')({
  loader: setStaticContentCacheHeaders,
  component: RefundPolicyPage,
  head: () =>
    pageMeta({
      title: 'Refund Policy | Grand Prix Picks',
      description:
        'Refund policy for Grand Prix Picks season pass purchases, processed in accordance with Paddle refund terms. How to request a refund and what happens next.',
      path: '/refund-policy',
    }),
});

function RefundPolicyPage() {
  return (
    <div className="min-h-screen bg-page">
      <div className="mx-auto max-w-4xl px-4 py-6">
        <PageHeader
          eyebrow="Legal"
          title="Refund Policy"
          subtitle="Last updated: August 2026"
        />

        <div className="reveal-up reveal-delay-1 prose prose-invert max-w-none space-y-6 text-text-muted">
          <section>
            <h2 className="mb-2 text-xl font-semibold text-text">
              What You Can Buy
            </h2>
            <p>
              Grand Prix Picks is free to play. The only paid product is the
              Season Pass, a one-off purchase that unlocks premium features for
              a single Formula 1 season. It is not a subscription: nothing
              renews automatically, and there is nothing to cancel. Making
              predictions, joining a league, and appearing on the global
              leaderboard never require a purchase.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-xl font-semibold text-text">
              Paddle-Handled Refunds
            </h2>
            <p>
              Grand Prix Picks sells digital products via Paddle as Merchant of
              Record. That means Paddle, not Grand Prix Picks, is the seller on
              your receipt and the party that takes payment and issues refunds.
              Refunds are handled in accordance with Paddle&apos;s refund policy
              and buyer terms, and where consumer law gives you a right to
              withdraw from a digital purchase, Paddle applies it as Merchant of
              Record.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-xl font-semibold text-text">
              How to Request a Refund
            </h2>
            <p>
              Use Paddle&apos;s customer support channels from your purchase
              receipt. That receipt is emailed to you at the time of purchase
              and is the fastest route, because Paddle holds the transaction.
            </p>
            <p>
              You can also{' '}
              <Link to="/support" className="text-accent underline">
                contact us
              </Link>{' '}
              and we will help direct your request. We cannot process or refuse
              a refund ourselves, so anything we receive is forwarded to Paddle
              rather than decided here. Tell us the email address you paid with
              so we can match the purchase.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-xl font-semibold text-text">
              Duplicate or Accidental Purchases
            </h2>
            <p>
              If you were charged twice for the same season, or bought a Season
              Pass you did not intend to,{' '}
              <Link to="/support" className="text-accent underline">
                get in touch
              </Link>
              . Please raise it before starting a chargeback with your bank: a
              chargeback can lock the account out of future purchases while it
              is investigated, and a duplicate charge is usually quicker to
              resolve directly.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-xl font-semibold text-text">
              What Happens to Your Access
            </h2>
            <p>
              When a refund is approved, the Season Pass for that season ends
              and the premium features it unlocked are no longer available. Your
              account, your predictions, your scores, and your league
              memberships are not deleted, and you can carry on playing the free
              game exactly as before. Points you have already scored stay on the
              leaderboard.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-xl font-semibold text-text">
              Refund Processing
            </h2>
            <p>
              Approved refunds are returned to the original payment method.
              Timing depends on your payment provider and bank, and the money
              can take several working days to appear after Paddle has released
              it. If a refund is confirmed by Paddle but has not reached you, it
              is worth checking with your bank before contacting us, as the
              delay is normally on that side.
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
