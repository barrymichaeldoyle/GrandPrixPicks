import { verifyWebhook } from '@clerk/backend/webhooks';
import { ConvexHttpClient } from 'convex/browser';
import type { FunctionReference } from 'convex/server';

import { buildConvexTokenIdentifier } from './auth';

type ClerkWebhookEvent = {
  type?: string;
  data?: {
    id?: string;
  };
};

type DeleteUserResult =
  | {
      handled: false;
      reason: 'event_ignored' | 'missing_user_id';
    }
  | {
      handled: true;
      convexResult: unknown;
    };

export async function handleClerkWebhook(
  request: Request,
): Promise<DeleteUserResult> {
  const signingSecret = process.env.CLERK_WEBHOOK_SIGNING_SECRET;
  if (!signingSecret) {
    throw new Error('Missing CLERK_WEBHOOK_SIGNING_SECRET');
  }

  const event = (await verifyWebhook(request, {
    signingSecret,
  })) as ClerkWebhookEvent;

  if (event.type !== 'user.deleted') {
    return { handled: false, reason: 'event_ignored' };
  }

  const clerkUserId = event.data?.id;
  if (!clerkUserId) {
    return { handled: false, reason: 'missing_user_id' };
  }

  const clerkSubject = clerkUserId;
  const tokenIdentifier =
    buildConvexTokenIdentifier({
      issuer: process.env.CLERK_JWT_ISSUER_DOMAIN ?? null,
      subject: clerkSubject,
    }) ?? clerkUserId;

  const convexUrl = process.env.VITE_CONVEX_URL;
  const webhookKey = process.env.CLERK_CONVEX_WEBHOOK_KEY;
  if (!convexUrl) {
    throw new Error('Missing VITE_CONVEX_URL');
  }
  if (!webhookKey) {
    throw new Error('Missing CLERK_CONVEX_WEBHOOK_KEY');
  }

  const convex = new ConvexHttpClient(convexUrl);
  const deleteUserMutation =
    'users:deleteUserFromClerkWebhook' as unknown as FunctionReference<'mutation'>;

  const convexResult = await convex.mutation(deleteUserMutation, {
    webhookKey,
    clerkUserId: tokenIdentifier,
    clerkSubject,
  });

  return { handled: true, convexResult };
}
