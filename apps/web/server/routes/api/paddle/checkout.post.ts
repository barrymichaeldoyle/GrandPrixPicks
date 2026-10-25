import { getAuthenticatedClerkIdentity } from '../../../lib/auth';
import { createPaddleSeasonCheckout } from '../../../lib/paddle';
import { captureServerException, startServerSpan } from '../../../lib/sentry';

const DEFAULT_SEASON = 2026;
/**
 * The seasons a pass is on sale for. Billing is pinned to 2026: there is one
 * price, and the webhook grants whatever season the checkout carried, so an
 * open range sold a 2031 pass at the 2026 price.
 */
const SELLABLE_SEASONS: ReadonlySet<number> = new Set([2026]);
const JSON_HEADERS = { 'content-type': 'application/json' } as const;

type RouteEvent = {
  req: Request;
};

// Nitro route files are convention-based and require a default export.
export default async function handler(event: RouteEvent) {
  let identity = null;
  try {
    identity = await startServerSpan(
      { name: 'api.paddle.checkout.authenticate' },
      () => getAuthenticatedClerkIdentity(event.req),
    );
  } catch (error) {
    captureServerException(error, { name: 'api.paddle.checkout.authenticate' });
    console.error('[paddle-checkout] auth_failed', {
      message: error instanceof Error ? error.message : 'unknown_error',
    });
    return new Response(JSON.stringify({ error: 'Authentication failed' }), {
      status: 500,
      headers: JSON_HEADERS,
    });
  }

  if (!identity) {
    return new Response(JSON.stringify({ error: 'Not authenticated' }), {
      status: 401,
      headers: JSON_HEADERS,
    });
  }

  // An empty or non-JSON body is the caller's mistake, so a 400 rather than
  // the 500 an uncaught parse error became.
  let body: { season?: unknown } | null = null;
  try {
    body = (await event.req.json()) as { season?: unknown } | null;
  } catch {
    body = null;
  }
  const season = body?.season ?? DEFAULT_SEASON;

  if (typeof season !== 'number' || !SELLABLE_SEASONS.has(season)) {
    return new Response(JSON.stringify({ error: 'Invalid season' }), {
      status: 400,
      headers: JSON_HEADERS,
    });
  }

  try {
    const checkout = await startServerSpan(
      {
        name: 'api.paddle.checkout.create',
        tags: {
          season,
          clerk_user_id: identity.userId,
        },
      },
      () =>
        createPaddleSeasonCheckout({
          clerkUserId: identity.tokenIdentifier,
          clerkSubject: identity.subject,
          season,
        }),
    );

    return {
      checkoutUrl: checkout.checkoutUrl,
      transactionId: checkout.transactionId,
    };
  } catch (error) {
    captureServerException(error, {
      name: 'api.paddle.checkout.create',
      tags: {
        season,
        clerk_user_id: identity.userId,
      },
    });
    const message =
      error instanceof Error ? error.message : 'Checkout creation failed';
    console.error('[paddle-checkout] create_failed', {
      userId: identity.userId,
      season,
      message,
    });
    // The detail (a missing env var, Paddle's own error text) is in Sentry
    // and the log above. The pricing page shows this string to the player.
    return new Response(
      JSON.stringify({
        error: 'Checkout could not be started. Try again in a moment.',
      }),
      {
        status: 502,
        headers: JSON_HEADERS,
      },
    );
  }
}
