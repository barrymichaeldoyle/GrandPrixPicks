import { cronJobs } from 'convex/server';

import { internal } from './_generated/api';

const crons = cronJobs();

crons.interval(
  'poll OpenF1 fallback results',
  { minutes: 5 },
  internal.openF1Results.pollDueResults,
  {},
);

export default crons;
