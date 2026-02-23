import { clerkClient } from '@clerk/tanstack-react-start/server';

import { createPaddleSeasonCheckout } from '../../../lib/paddle';

const DEFAULT_SEASON = 2026;
const JSON_HEADERS = { 'content-type': 'application/json' } as const;

type RouteEvent = {
  req: Request;
};

// Nitro route files are convention-based and require a default export.
// eslint-disable-next-line no-restricted-syntax
export default async function handler(event: RouteEvent) {
  const requestState = await clerkClient().authenticateRequest(event.req, {
    acceptsToken: 'session_token',
  });
  const userId = requestState.toAuth()?.userId;

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
    return new Response(JSON.stringify({ error: message }), {
      status: 502,
      headers: JSON_HEADERS,
    });
  }
}
