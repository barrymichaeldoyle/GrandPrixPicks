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

crons.interval(
  'refresh live timed classification',
  { minutes: 1 },
  internal.liveClassification.refresh,
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
// The publish pings announce a result the moment it lands. Nothing announced a
// hand-edited page, so a guide or a write-up waited for an organic crawl.
// Hourly is well inside the time it takes anyone to notice a stale page, and a
// sweep with nothing to report costs one sitemap fetch.
crons.interval(
  'sweep sitemap for IndexNow',
  { hours: 1 },
  internal.indexNow.sweepSitemap,
  {},
);

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

crons.interval(
  'deliver notifications',
  { minutes: 1 },
  internal.notificationDelivery.dispatchDue,
  {},
);

crons.interval(
  'discover approved news feeds',
  { minutes: 30 },
  internal.newsPipeline.pollDue,
  {},
);
crons.interval(
  'queue news review batches',
  { minutes: 30 },
  internal.newsPipeline.queueBatch,
  {},
);

export default crons;
