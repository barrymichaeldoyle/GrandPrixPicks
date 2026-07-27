import { cronJobs } from 'convex/server';

import { internal } from './_generated/api';

const crons = cronJobs();

crons.interval(
  'poll OpenF1 fallback results',
  { minutes: 5 },
  internal.openF1Results.pollDueResults,
  {},
);

crons.interval(
  'poll OpenF1 practice results',
  { minutes: 5 },
  internal.practiceResults.pollDuePracticeResults,
  {},
);

// Reconcile published results against the official classification so
// post-session stewards' decisions flow through to scores automatically.
crons.interval(
  'recheck published results',
  { minutes: 30 },
  internal.resultsRecheck.runDueRechecks,
  {},
);

export default crons;
