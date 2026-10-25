import {
  ClerkWebhookVerificationError,
  handleClerkWebhook,
} from '../../../lib/clerk';
import { captureServerException, startServerSpan } from '../../../lib/sentry';

const JSON_HEADERS = { 'content-type': 'application/json' } as const;

type RouteEvent = {
  req: Request;
};

// Nitro route files are convention-based and require a default export.
export default async function handler(event: RouteEvent) {
  try {
    const result = await startServerSpan({ name: 'api.clerk.webhook' }, () =>
      handleClerkWebhook(event.req),
    );
    return {
      ok: true,
      ...result,
    };
  } catch (error) {
    if (error instanceof ClerkWebhookVerificationError) {
      // Unsigned or forged. A 401 tells a real Clerk delivery with a rotated
      // secret what is wrong, where a 500 read as the server being down, and
      // every probe stays out of Sentry.
      console.warn('[clerk-webhook] rejected_signature');
      return new Response(JSON.stringify({ error: 'Invalid signature' }), {
        status: 401,
        headers: JSON_HEADERS,
      });
    }
    captureServerException(error, { name: 'api.clerk.webhook' });
    console.error('[clerk-webhook] handler_failed', {
      message: error instanceof Error ? error.message : 'unknown_error',
    });
    return new Response(JSON.stringify({ error: 'Webhook handling failed' }), {
      status: 500,
      headers: JSON_HEADERS,
    });
  }
}
