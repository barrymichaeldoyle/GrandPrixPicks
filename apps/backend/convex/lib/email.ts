import { Resend } from '@convex-dev/resend';

import { components } from '../_generated/api';

export const resend = new Resend(components.resend, {
  testMode: process.env.RESEND_TEST_MODE !== 'false',
});
