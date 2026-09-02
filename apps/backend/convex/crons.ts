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

// MET Norway supplies cache headers, while weather.refreshWeather adds a
// slower adaptive cadence until the race is close. The hourly tick therefore
// does not imply an hourly provider request throughout the forecast window.
crons.interval(
  'refresh race weekend weather',
  { hours: 1 },
  internal.weather.refreshWeather,
  {},
);

// The creator poll walks itself through a race weekend: predictions open, they
// close when qualifying starts, the Race Report vote opens at the flag, and the
// whole thing rolls on to the next round. Only polls that opted in are touched.
// Fifteen minutes is well inside the tolerance of every boundary it watches.
crons.interval(
  'advance creator polls',
  { minutes: 15 },
  internal.creatorPolls.advanceScheduledPolls,
  {},
);

export default crons;
