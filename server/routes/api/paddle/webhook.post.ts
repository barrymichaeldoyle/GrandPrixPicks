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
// eslint-disable-next-line no-restricted-syntax
export default async function handler(event: RouteEvent) {
  const signatureHeader = event.req.headers.get('paddle-signature');
  const rawBody = await event.req.text();

  if (!signatureHeader || !rawBody) {
    return new Response(JSON.stringify({ error: 'Missing webhook payload' }), {
      status: 400,
      headers: JSON_HEADERS,
    });
  }

  const webhookSecret = getPaddleConfig().webhookSecret;
  if (!webhookSecret) {
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
    return new Response(JSON.stringify({ error: 'Invalid Paddle signature' }), {
      status: 401,
      headers: JSON_HEADERS,
    });
  }

  const result = await grantSeasonPassFromWebhook(webhookEvent);

  return {
    ok: true,
    ...result,
  };
}
