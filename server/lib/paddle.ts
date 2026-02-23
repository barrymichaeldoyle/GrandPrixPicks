import { ConvexHttpClient } from 'convex/browser';

import { api } from '../../convex/_generated/api';

type PaddleApiResponse<TData> = {
  data?: TData;
  error?: {
    code?: string;
    detail?: string;
  };
};

type PaddleCheckoutResponseData = {
  id: string;
  checkout?: {
    url?: string | null;
  } | null;
};

type PaddleCompletedTransactionEvent = {
  event_type?: string;
  data?: {
    id?: string;
    custom_data?: {
      clerkUserId?: string;
      season?: number;
    };
    items?: Array<{
      price?: {
        product_id?: string;
      };
    }>;
  };
};

const PADDLE_API_BASE = 'https://api.paddle.com';
const PADDLE_VERSION = '1';
const DEFAULT_SEASON = 2026;

export function getPaddleConfig() {
  const apiKey = process.env.PADDLE_API_KEY;
  const seasonPassPriceId = process.env.PADDLE_SEASON_PASS_PRICE_ID;
  const webhookSecret = process.env.PADDLE_WEBHOOK_SECRET;

  return {
    apiBase: process.env.PADDLE_API_BASE ?? PADDLE_API_BASE,
    apiKey,
    seasonPassPriceId,
    webhookSecret,
  };
}

function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }

  let result = 0;
  for (let i = 0; i < a.length; i += 1) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

function parsePaddleSignature(signatureHeader: string) {
  const parts = signatureHeader.split(';');
  const signatures: Array<string> = [];
  let timestamp: number | null = null;

  for (const part of parts) {
    const [rawKey, rawValue] = part.split('=');
    if (!rawKey || !rawValue) {
      continue;
    }

    const key = rawKey.trim();
    const value = rawValue.trim();

    if (key === 'ts') {
      const parsed = Number(value);
      if (Number.isFinite(parsed)) {
        timestamp = parsed;
      }
    }

    if (key === 'h1') {
      signatures.push(value.toLowerCase());
    }
  }

  return { timestamp, signatures };
}

async function hmacHex(secret: string, payload: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );

  const signature = await crypto.subtle.sign(
    'HMAC',
    key,
    new TextEncoder().encode(payload),
  );

  return Array.from(new Uint8Array(signature))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

export async function verifyPaddleWebhookSignature(params: {
  rawBody: string;
  signatureHeader: string;
  webhookSecret: string;
  toleranceSeconds?: number;
}): Promise<boolean> {
  const toleranceSeconds = params.toleranceSeconds ?? 300;
  const { timestamp, signatures } = parsePaddleSignature(
    params.signatureHeader,
  );

  if (!timestamp || signatures.length === 0) {
    return false;
  }

  const ageSeconds = Math.abs(Math.floor(Date.now() / 1000) - timestamp);
  if (ageSeconds > toleranceSeconds) {
    return false;
  }

  const signedPayload = `${timestamp}:${params.rawBody}`;
  const expected = await hmacHex(params.webhookSecret, signedPayload);

  return signatures.some((candidate) => constantTimeEqual(candidate, expected));
}

export async function createPaddleSeasonCheckout(params: {
  clerkUserId: string;
  season?: number;
}) {
  const config = getPaddleConfig();
  if (!config.apiKey) {
    throw new Error('Missing PADDLE_API_KEY');
  }
  if (!config.seasonPassPriceId) {
    throw new Error('Missing PADDLE_SEASON_PASS_PRICE_ID');
  }

  const season = Number.isInteger(params.season)
    ? (params.season as number)
    : DEFAULT_SEASON;

  const response = await fetch(`${config.apiBase}/transactions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
      'Paddle-Version': PADDLE_VERSION,
    },
    body: JSON.stringify({
      collection_mode: 'automatic',
      items: [
        {
          price_id: config.seasonPassPriceId,
          quantity: 1,
        },
      ],
      custom_data: {
        clerkUserId: params.clerkUserId,
        season,
      },
    }),
  });

  const payload =
    (await response.json()) as PaddleApiResponse<PaddleCheckoutResponseData>;

  if (!response.ok || !payload.data) {
    const detail =
      payload.error?.detail ?? `Paddle request failed (${response.status})`;
    throw new Error(detail);
  }

  const checkoutUrl = payload.data.checkout?.url;

  if (!checkoutUrl) {
    throw new Error(
      'Paddle did not return a checkout URL for this transaction',
    );
  }

  return {
    transactionId: payload.data.id,
    checkoutUrl,
  };
}

export function parsePaddleWebhook(
  rawBody: string,
): PaddleCompletedTransactionEvent {
  return JSON.parse(rawBody) as PaddleCompletedTransactionEvent;
}

export async function grantSeasonPassFromWebhook(
  event: PaddleCompletedTransactionEvent,
) {
  if (event.event_type !== 'transaction.completed') {
    return { handled: false, reason: 'event_ignored' as const };
  }

  const clerkUserId = event.data?.custom_data?.clerkUserId;
  const season = event.data?.custom_data?.season;

  if (!clerkUserId || !Number.isInteger(season)) {
    return { handled: false, reason: 'missing_custom_data' as const };
  }
  const normalizedSeason = Number(season);

  const convexUrl = process.env.VITE_CONVEX_URL;
  const webhookKey = process.env.PADDLE_CONVEX_WEBHOOK_KEY;

  if (!convexUrl) {
    throw new Error('Missing VITE_CONVEX_URL');
  }
  if (!webhookKey) {
    throw new Error('Missing PADDLE_CONVEX_WEBHOOK_KEY');
  }

  const convex = new ConvexHttpClient(convexUrl);

  const result = await convex.mutation(api.billing.grantSeasonPassFromPaddle, {
    webhookKey,
    clerkUserId,
    season: normalizedSeason,
    paddleCheckoutId: event.data?.id,
    paddleProductId: event.data?.items?.[0]?.price?.product_id,
  });

  return { handled: true, result };
}
