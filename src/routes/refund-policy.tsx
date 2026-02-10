import { createFileRoute, Link } from '@tanstack/react-router';

import { ogBaseUrl } from '../lib/site';

export const Route = createFileRoute('/refund-policy')({
  component: RefundPolicyPage,
  head: () => ({
    meta: [
      { title: 'Refund Policy | Grand Prix Picks' },
      {
        name: 'description',
        content:
          'Refund policy for Grand Prix Picks purchases, processed in accordance with Paddle refund terms.',
      },
      { property: 'og:image', content: `${ogBaseUrl}/og/home.png` },
      { name: 'twitter:image', content: `${ogBaseUrl}/og/home.png` },
    ],
  }),
});

function RefundPolicyPage() {
  return (
    <div className="min-h-screen bg-page">
      <div className="mx-auto max-w-4xl px-4 py-8">
        <div className="mb-8">
          <h1 className="mb-2 text-3xl font-bold text-text">Refund Policy</h1>
          <p className="text-sm text-text-muted">Last updated: February 2026</p>
        </div>

        <div className="prose prose-invert max-w-none space-y-6 text-text-muted">
          <section>
            <h2 className="mb-2 text-xl font-semibold text-text">
              Paddle-Handled Refunds
            </h2>
            <p>
              Grand Prix Picks sells digital products via Paddle as Merchant of
              Record. Refunds are handled in accordance with Paddle&apos;s refund
              policy and buyer terms.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-xl font-semibold text-text">
              How to Request a Refund
            </h2>
            <p>
              If you want to request a refund, use Paddle&apos;s customer support
              channels from your purchase receipt, or contact us and we can help
              direct your request to Paddle.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-xl font-semibold text-text">
              Refund Processing
            </h2>
            <p>
              Approved refunds are returned to the original payment method.
              Timing depends on your payment provider and bank.
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
