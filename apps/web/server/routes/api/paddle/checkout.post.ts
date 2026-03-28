import { getAuthenticatedClerkUserId } from '../../../lib/auth';
import { createPaddleSeasonCheckout } from '../../../lib/paddle';

const DEFAULT_SEASON = 2026;
const JSON_HEADERS = { 'content-type': 'application/json' } as const;

type RouteEvent = {
  req: Request;
};

// Nitro route files are convention-based and require a default export.
export default async function handler(event: RouteEvent) {
  let userId: string | null = null;
  try {
    userId = await getAuthenticatedClerkUserId(event.req);
  } catch (error) {
    console.error('[paddle-checkout] auth_failed', {
      message: error instanceof Error ? error.message : 'unknown_error',
    });
    return new Response(JSON.stringify({ error: 'Authentication failed' }), {
      status: 500,
      headers: JSON_HEADERS,
    });
  }

  if (!userId) {
    return new Response(JSON.stringify({ error: 'Not authenticated' }), {
      status: 401,
      headers: JSON_HEADERS,
    });
  }

  const body = (await event.req.json()) as { season?: number };
  const season = body.season ?? DEFAULT_SEASON;

  if (!Number.isInteger(season) || season < 2026 || season > 2100) {
    return new Response(JSON.stringify({ error: 'Invalid season' }), {
      status: 400,
      headers: JSON_HEADERS,
    });
  }

  try {
    const checkout = await createPaddleSeasonCheckout({
      clerkUserId: userId,
      season,
    });

    return {
      checkoutUrl: checkout.checkoutUrl,
      transactionId: checkout.transactionId,
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Checkout creation failed';
    console.error('[paddle-checkout] create_failed', {
      userId,
      season,
      message,
    });
    return new Response(JSON.stringify({ error: message }), {
      status: 502,
      headers: JSON_HEADERS,
    });
  }
}
