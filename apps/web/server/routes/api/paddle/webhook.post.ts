import {
  getPaddleConfig,
  grantSeasonPassFromWebhook,
  parsePaddleWebhook,
  verifyPaddleWebhookSignature,
} from '../../../lib/paddle';

const JSON_HEADERS = { 'content-type': 'application/json' } as const;

type RouteEvent = {
  req: Request;
};

// Nitro route files are convention-based and require a default export.
export default async function handler(event: RouteEvent) {
  const signatureHeader = event.req.headers.get('paddle-signature');
  const rawBody = await event.req.text();
  console.info('[paddle-webhook] received', {
    hasSignature: Boolean(signatureHeader),
    payloadLength: rawBody.length,
  });

  if (!signatureHeader || !rawBody) {
    console.warn('[paddle-webhook] rejected_missing_payload');
    return new Response(JSON.stringify({ error: 'Missing webhook payload' }), {
      status: 400,
      headers: JSON_HEADERS,
    });
  }

  const webhookSecret = getPaddleConfig().webhookSecret;
  if (!webhookSecret) {
    console.error('[paddle-webhook] missing_webhook_secret');
    return new Response(
      JSON.stringify({ error: 'Missing PADDLE_WEBHOOK_SECRET' }),
      {
        status: 500,
        headers: JSON_HEADERS,
      },
    );
  }

  let webhookEvent: ReturnType<typeof parsePaddleWebhook>;
  try {
    webhookEvent = parsePaddleWebhook(rawBody);
  } catch {
    console.warn('[paddle-webhook] rejected_invalid_json');
    return new Response(JSON.stringify({ error: 'Invalid JSON payload' }), {
      status: 400,
      headers: JSON_HEADERS,
    });
  }

  const isValid = await verifyPaddleWebhookSignature({
    rawBody,
    signatureHeader,
    webhookSecret,
  });

  if (!isValid) {
    console.warn('[paddle-webhook] rejected_invalid_signature', {
      eventType: webhookEvent.event_type ?? null,
      eventId: webhookEvent.event_id ?? null,
      notificationId: webhookEvent.notification_id ?? null,
    });
    return new Response(JSON.stringify({ error: 'Invalid Paddle signature' }), {
      status: 401,
      headers: JSON_HEADERS,
    });
  }
  console.info('[paddle-webhook] signature_verified', {
    eventType: webhookEvent.event_type ?? null,
    eventId: webhookEvent.event_id ?? null,
    notificationId: webhookEvent.notification_id ?? null,
  });

  try {
    const result = await grantSeasonPassFromWebhook(webhookEvent);
    console.info('[paddle-webhook] handled', {
      eventType: webhookEvent.event_type ?? null,
      eventId: webhookEvent.event_id ?? null,
      notificationId: webhookEvent.notification_id ?? null,
      handled: result.handled,
      reason: 'reason' in result ? result.reason : null,
    });

    return {
      ok: true,
      ...result,
    };
  } catch (error) {
    console.error('[paddle-webhook] handler_failed', {
      eventType: webhookEvent.event_type ?? null,
      eventId: webhookEvent.event_id ?? null,
      notificationId: webhookEvent.notification_id ?? null,
      message: error instanceof Error ? error.message : 'unknown_error',
    });
    return new Response(JSON.stringify({ error: 'Webhook handling failed' }), {
      status: 500,
      headers: JSON_HEADERS,
    });
  }
}
