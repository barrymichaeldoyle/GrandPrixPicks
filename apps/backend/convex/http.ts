import { httpRouter } from 'convex/server';
import { httpAction } from './_generated/server';
import { internal } from './_generated/api';
import { resend } from './lib/email';
const http = httpRouter();
http.route({
  path: '/resend-webhook',
  method: 'POST',
  handler: httpAction(async (ctx, request) =>
    resend.handleResendEventWebhook(ctx, request),
  ),
});
const unsubscribe = httpAction(async (ctx, request) => {
  const url = new URL(request.url);
  const token = url.searchParams.get('token');
  const category = url.searchParams.get('category');
  if (
    !token ||
    token.length > 200 ||
    (category !== 'results' && category !== 'reminders')
  ) {
    return new Response('Invalid unsubscribe link.', { status: 400 });
  }
  if (request.method === 'GET') {
    // Link scanners must not change preferences. One-click providers POST.
    return new Response(
      '<!doctype html><meta name="viewport" content="width=device-width"><title>Unsubscribe</title><form method="post"><button>Unsubscribe</button></form>',
      {
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
          'Cache-Control': 'no-store',
          'Referrer-Policy': 'no-referrer',
        },
      },
    );
  }
  const ok = await ctx.runMutation(internal.notificationEmails.unsubscribe, {
    token,
    category,
  });
  return new Response(ok ? 'Unsubscribed.' : 'Invalid unsubscribe link.', {
    status: ok ? 200 : 400,
    headers: { 'Cache-Control': 'no-store' },
  });
});
http.route({
  path: '/notifications/unsubscribe',
  method: 'GET',
  handler: unsubscribe,
});
http.route({
  path: '/notifications/unsubscribe',
  method: 'POST',
  handler: unsubscribe,
});
export default http;
