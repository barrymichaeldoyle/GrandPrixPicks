import { handleClerkWebhook } from '../../../lib/clerk';

const JSON_HEADERS = { 'content-type': 'application/json' } as const;

type RouteEvent = {
  req: Request;
};

// Nitro route files are convention-based and require a default export.
// eslint-disable-next-line no-restricted-syntax
export default async function handler(event: RouteEvent) {
  try {
    const result = await handleClerkWebhook(event.req);
    return {
      ok: true,
      ...result,
    };
  } catch (error) {
    console.error('[clerk-webhook] handler_failed', {
      message: error instanceof Error ? error.message : 'unknown_error',
    });
    return new Response(JSON.stringify({ error: 'Webhook handling failed' }), {
      status: 500,
      headers: JSON_HEADERS,
    });
  }
}
