import { createFileRoute, Link } from '@tanstack/react-router';

import { PageHero } from '../components/PageHero';
import { canonicalMeta, ogBaseUrl } from '../lib/site';

export const Route = createFileRoute('/refund-policy')({
  component: RefundPolicyPage,
  head: () => {
    const title = 'Refund Policy | Grand Prix Picks';
    const description =
      'Refund policy for Grand Prix Picks purchases, processed in accordance with Paddle refund terms.';
    const canonical = canonicalMeta('/refund-policy');
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

function RefundPolicyPage() {
  return (
    <div className="min-h-screen bg-page">
      <div className="mx-auto max-w-4xl px-4 py-6">
        <PageHero
          eyebrow="Legal"
          title="Refund Policy"
          subtitle="Last updated: February 2026"
        />

        <div className="reveal-up reveal-delay-1 prose prose-invert max-w-none space-y-6 text-text-muted">
          <section>
            <h2 className="mb-2 text-xl font-semibold text-text">
              Paddle-Handled Refunds
            </h2>
            <p>
              Grand Prix Picks sells digital products via Paddle as Merchant of
              Record. Refunds are handled in accordance with Paddle&apos;s
              refund policy and buyer terms.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-xl font-semibold text-text">
              How to Request a Refund
            </h2>
            <p>
              If you want to request a refund, use Paddle&apos;s customer
              support channels from your purchase receipt, or contact us and we
              can help direct your request to Paddle.
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
