import resend from '@convex-dev/resend/convex.config.js';
import rateLimiter from '@convex-dev/rate-limiter/convex.config';
import { defineApp } from 'convex/server';
import { v } from 'convex/values';

const app = defineApp({
  env: {
    OPEN_F1_USERNAME: v.optional(v.string()),
    OPEN_F1_PASSWORD: v.optional(v.string()),
  },
});
app.use(resend);
app.use(rateLimiter);

export default app;
