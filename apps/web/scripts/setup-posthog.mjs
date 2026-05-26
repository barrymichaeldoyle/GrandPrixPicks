#!/usr/bin/env node

const DEFAULT_HOST = 'https://eu.posthog.com';
const DASHBOARD_NAME = 'Grand Prix Picks - Product Funnels';
const TAGS = ['grand-prix-picks', 'product-funnels'];

const funnels = [
  {
    name: 'Activation: pageview to prediction',
    description: 'Tracks whether visitors reach the core game action.',
    steps: [
      { event: '$pageview', name: 'Pageview' },
      { event: 'prediction_submitted', name: 'Top 5 submitted' },
    ],
  },
  {
    name: 'Prediction completion: Top 5 to H2H',
    description: 'Tracks whether users complete both prediction modes.',
    steps: [
      { event: 'prediction_submitted', name: 'Top 5 submitted' },
      { event: 'h2h_prediction_submitted', name: 'H2H submitted' },
    ],
  },
  {
    name: 'Checkout: pricing to payment complete',
    description: 'Tracks season pass checkout conversion.',
    steps: [
      { event: '$pageview', name: 'Pageview' },
      { event: 'checkout_started', name: 'Checkout started' },
      { event: 'checkout_opened', name: 'Checkout opened' },
      { event: 'checkout_completed', name: 'Checkout completed' },
    ],
  },
  {
    name: 'League growth: pageview to create or join',
    description: 'Tracks whether users create or join leagues.',
    steps: [
      { event: '$pageview', name: 'Pageview' },
      { event: 'league_created', name: 'League created' },
      { event: 'league_joined', name: 'League joined', optional: true },
    ],
  },
  {
    name: 'Social engagement: follow to rev',
    description: 'Tracks whether social discovery leads to feed engagement.',
    steps: [
      { event: '$pageview', name: 'Pageview' },
      { event: 'user_followed', name: 'User followed' },
      { event: 'feed_event_reved', name: 'Feed event reved' },
    ],
  },
];

function requiredEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

const apiKey = requiredEnv('POSTHOG_PERSONAL_API_KEY');
const environmentId = requiredEnv('POSTHOG_ENVIRONMENT_ID');
const host = (process.env.POSTHOG_HOST ?? DEFAULT_HOST).replace(/\/$/, '');

async function posthogFetch(path, init = {}) {
  const response = await fetch(`${host}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      ...(init.headers ?? {}),
    },
  });

  const text = await response.text();
  const payload = text ? JSON.parse(text) : null;

  if (!response.ok) {
    throw new Error(
      [
        `PostHog API request failed: ${response.status} ${response.statusText}`,
        `${init.method ?? 'GET'} ${path}`,
        text,
      ].join('\n'),
    );
  }

  return payload;
}

async function listAll(path) {
  const results = [];
  let nextPath = path;

  while (nextPath) {
    const payload = await posthogFetch(nextPath);
    results.push(...(payload.results ?? []));
    nextPath = payload.next
      ? new URL(payload.next).pathname + new URL(payload.next).search
      : null;
  }

  return results;
}

async function findDashboardByName(name) {
  const dashboards = await listAll(
    `/api/environments/${environmentId}/dashboards/?search=${encodeURIComponent(name)}`,
  );
  return dashboards.find((dashboard) => dashboard.name === name) ?? null;
}

async function createDashboard() {
  return posthogFetch(`/api/environments/${environmentId}/dashboards/`, {
    method: 'POST',
    body: JSON.stringify({
      name: DASHBOARD_NAME,
      description:
        'Core Grand Prix Picks product funnels managed by apps/web/scripts/setup-posthog.mjs.',
      tags: TAGS,
    }),
  });
}

async function findInsightByName(name) {
  const insights = await listAll(
    `/api/environments/${environmentId}/insights/?search=${encodeURIComponent(name)}&saved=true`,
  );
  return insights.find((insight) => insight.name === name) ?? null;
}

function eventNode(step, order) {
  return {
    id: step.event,
    event: step.event,
    name: step.name,
    type: 'events',
    kind: 'EventsNode',
    order,
    optionalInFunnel: Boolean(step.optional),
  };
}

function funnelPayload(funnel, dashboardId) {
  const events = funnel.steps.map(eventNode);
  return {
    name: funnel.name,
    description: funnel.description,
    tags: TAGS,
    dashboards: [dashboardId],
    filters: {
      insight: 'FUNNELS',
      interval: 'day',
      date_from: '-30d',
      events,
      funnel_window_interval: 14,
      funnel_window_interval_unit: 'day',
      layout: 'horizontal',
    },
    query: {
      kind: 'InsightVizNode',
      source: {
        kind: 'FunnelsQuery',
        dateRange: { date_from: '-30d' },
        filterTestAccounts: true,
        funnelsFilter: {
          funnelWindowInterval: 14,
          funnelWindowIntervalUnit: 'day',
          layout: 'horizontal',
        },
        series: events.map((event) => ({
          kind: 'EventsNode',
          event: event.event,
          name: event.name,
          custom_name: event.name,
          optionalInFunnel: event.optionalInFunnel,
        })),
      },
    },
  };
}

async function createInsight(funnel, dashboardId) {
  return posthogFetch(`/api/environments/${environmentId}/insights/`, {
    method: 'POST',
    body: JSON.stringify(funnelPayload(funnel, dashboardId)),
  });
}

async function updateInsight(insightId, funnel, dashboardId) {
  return posthogFetch(
    `/api/environments/${environmentId}/insights/${insightId}/`,
    {
      method: 'PATCH',
      body: JSON.stringify(funnelPayload(funnel, dashboardId)),
    },
  );
}

async function main() {
  process.stderr.write(`Using PostHog host ${host}\n`);

  let dashboard = await findDashboardByName(DASHBOARD_NAME);
  if (!dashboard) {
    dashboard = await createDashboard();
    process.stderr.write(
      `Created dashboard: ${DASHBOARD_NAME} (${dashboard.id})\n`,
    );
  } else {
    process.stderr.write(
      `Found dashboard: ${DASHBOARD_NAME} (${dashboard.id})\n`,
    );
  }

  for (const funnel of funnels) {
    const existing = await findInsightByName(funnel.name);
    if (existing) {
      const updated = await updateInsight(existing.id, funnel, dashboard.id);
      process.stderr.write(
        `Updated insight: ${updated.name} (${updated.id})\n`,
      );
      continue;
    }

    const created = await createInsight(funnel, dashboard.id);
    process.stderr.write(`Created insight: ${created.name} (${created.id})\n`);
  }

  process.stderr.write('\nPostHog product funnels are set up.\n');
}

main().catch((error) => {
  process.stderr.write(
    `${error instanceof Error ? error.message : String(error)}\n`,
  );
  process.exitCode = 1;
});
