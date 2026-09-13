import { httpRouter } from 'convex/server';
import { env, httpAction } from './_generated/server';
import { internal } from './_generated/api';
import { resend } from './lib/email';
const http = httpRouter();
async function readWorkerJson(request: Request): Promise<unknown> {
  if (
    !request.body ||
    request.headers.get('content-type')?.split(';')[0] !== 'application/json'
  ) {
    throw new Error('JSON required.');
  }
  const reader = request.body.getReader();
  const parts: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const part = await reader.read();
    if (part.done) {
      break;
    }
    size += part.value.byteLength;
    if (size > 16_384) {
      await reader.cancel();
      throw new Error('Request too large.');
    }
    parts.push(part.value);
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const part of parts) {
    bytes.set(part, offset);
    offset += part.length;
  }
  return JSON.parse(new TextDecoder().decode(bytes)) as unknown;
}
function workerAuthorized(request: Request): boolean {
  const secret = env.NEWS_WORKER_SECRET;
  return (
    !!secret &&
    secret.length >= 32 &&
    request.headers.get('authorization') === `Bearer ${secret}`
  );
}
function workerResponse(value: unknown, status = 200): Response {
  return new Response(JSON.stringify(value), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
    },
  });
}
function objectWithKeys(
  value: unknown,
  required: string[],
  optional: string[] = [],
): value is Record<string, unknown> {
  return (
    !!value &&
    typeof value === 'object' &&
    !Array.isArray(value) &&
    required.every((key) => Object.hasOwn(value, key)) &&
    Object.keys(value).every(
      (key) => required.includes(key) || optional.includes(key),
    )
  );
}
http.route({
  path: '/news-worker/claim',
  method: 'POST',
  handler: httpAction(async (ctx, request) => {
    if (!workerAuthorized(request)) {
      return workerResponse({ error: 'Unauthorized' }, 401);
    }
    try {
      const body = await readWorkerJson(request);
      if (!objectWithKeys(body, [])) {
        return workerResponse({ error: 'Invalid request' }, 400);
      }
      return workerResponse(
        await ctx.runMutation(internal.newsPipeline.claimBatch, {}),
      );
    } catch {
      return workerResponse({ error: 'Invalid request' }, 400);
    }
  }),
});
http.route({
  path: '/news-worker/submit',
  method: 'POST',
  handler: httpAction(async (ctx, request) => {
    if (!workerAuthorized(request)) {
      return workerResponse({ error: 'Unauthorized' }, 401);
    }
    try {
      const body = await readWorkerJson(request);
      if (
        !objectWithKeys(body, ['batchId', 'proposals']) ||
        typeof body.batchId !== 'string' ||
        !Array.isArray(body.proposals) ||
        body.proposals.length > 5
      ) {
        return workerResponse({ error: 'Invalid request' }, 400);
      }
      for (const proposal of body.proposals) {
        if (
          !objectWithKeys(
            proposal,
            [
              'candidateId',
              'headline',
              'body',
              'category',
              'affectsSessions',
              'confidence',
              'reviewReason',
            ],
            ['raceSlug', 'contradictions'],
          )
        ) {
          return workerResponse({ error: 'Invalid proposal' }, 400);
        }
      }
      return workerResponse(
        await ctx.runMutation(internal.newsPipeline.submitBatch, {
          batchId: body.batchId as never,
          proposals: body.proposals as never,
        }),
      );
    } catch {
      return workerResponse({ error: 'Invalid request' }, 400);
    }
  }),
});
http.route({
  path: '/news-worker/fail',
  method: 'POST',
  handler: httpAction(async (ctx, request) => {
    if (!workerAuthorized(request)) {
      return workerResponse({ error: 'Unauthorized' }, 401);
    }
    try {
      const body = await readWorkerJson(request);
      if (
        !objectWithKeys(body, ['batchId']) ||
        typeof body.batchId !== 'string'
      ) {
        return workerResponse({ error: 'Invalid request' }, 400);
      }
      await ctx.runMutation(internal.newsPipeline.failBatch, {
        batchId: body.batchId as never,
      });
      return workerResponse({ ok: true });
    } catch {
      return workerResponse({ error: 'Invalid request' }, 400);
    }
  }),
});
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
