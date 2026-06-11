import { Resend, type SendEmailOptions } from '@convex-dev/resend';

import { components } from '../_generated/api';
import type { ActionCtx } from '../_generated/server';

const resend = new Resend(components.resend, {
  testMode: process.env.RESEND_TEST_MODE !== 'false',
});

type ResendMutationCtx = Parameters<typeof resend.sendEmail>[0];

export function sendEmail(ctx: ActionCtx, options: SendEmailOptions) {
  // Resend supports action contexts at runtime, but its current context type is
  // broader than Convex 1.41's action runMutation signature.
  return resend.sendEmail(ctx as unknown as ResendMutationCtx, options);
}
