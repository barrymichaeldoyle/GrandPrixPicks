#!/usr/bin/env node

const DEFAULT_HOST = 'https://eu.posthog.com';
const DASHBOARD_NAME = 'Grand Prix Picks - Product Funnels';
const TAGS = ['grand-prix-picks', 'product-funnels'];
const TRMNL_DASHBOARD_NAME = 'Grand Prix Picks';
const TRMNL_TAGS = ['grand-prix-picks', 'trmnl'];

const funnels = [
  {
    name: 'Activation: pageview to prediction',
    description: 'Tracks whether visitors reach the core game action.',
    steps: [
      { event: '$pageview', name: 'Landing page viewed', path: '/' },
      {
        event: 'prediction_saved',
        name: 'Top 5 saved',
        properties: { prediction_type: 'top5' },
      },
    ],
  },
  {
    name: 'Prediction completion: Top 5 to H2H',
    description: 'Tracks whether users complete both prediction modes.',
    steps: [
      {
        event: 'prediction_saved',
        name: 'Top 5 saved',
        properties: { prediction_type: 'top5' },
      },
      {
        event: 'prediction_saved',
        name: 'H2H saved',
        properties: { prediction_type: 'h2h' },
      },
    ],
  },
  {
    name: 'Landing activation: picker to saved prediction',
    description:
      'Tracks the complete try-before-signup journey from using the landing picker to a persisted prediction.',
    steps: [
      { event: 'landing_picker_viewed', name: 'Picker viewed' },
      { event: 'landing_first_pick_added', name: 'First pick added' },
      { event: 'landing_top_five_completed', name: 'Top 5 completed' },
      {
        event: 'landing_top5_to_h2h_handoff_completed',
        name: 'H2H handoff completed',
      },
      { event: 'landing_h2h_completed', name: 'H2H completed' },
      {
        event: 'landing_prediction_card_save_started',
        name: 'Save started',
      },
      { event: 'landing_auth_started', name: 'Authentication started' },
      { event: 'landing_auth_completed', name: 'Authentication completed' },
      {
        event: 'prediction_saved',
        name: 'Prediction saved',
        properties: { source: 'landing' },
      },
    ],
  },
  {
    name: 'Checkout: pricing to payment complete',
    description: 'Tracks season pass checkout conversion.',
    steps: [
      { event: '$pageview', name: 'Pricing viewed', path: '/pricing' },
      { event: 'checkout_started', name: 'Checkout started' },
      { event: 'checkout_opened', name: 'Checkout opened' },
      { event: 'purchase_completed', name: 'Purchase completed' },
    ],
  },
  {
    name: 'League creation: pageview to created',
    legacyNames: ['League growth: pageview to create or join'],
    description: 'Tracks whether users complete the league creation flow.',
    steps: [
      {
        event: '$pageview',
        name: 'League creation viewed',
        path: '/leagues/create',
      },
      { event: 'league_created', name: 'League created' },
    ],
  },
  {
    name: 'League acquisition: invite to joined',
    description: 'Tracks whether visitors who open a league go on to join it.',
    steps: [
      { event: '$pageview', name: 'League viewed', pathRegex: '^/leagues/' },
      { event: 'league_joined', name: 'League joined' },
    ],
  },
];

const trends = [
  {
    name: 'Weekly product outcomes',
    description:
      'Unique visitors and users reaching the core activation, league, and purchase outcomes each week.',
    series: [
      { event: '$pageview', name: 'Visitors' },
      { event: 'landing_picker_viewed', name: 'Landing picker users' },
      { event: 'prediction_saved', name: 'Predictors' },
      { event: 'league_joined', name: 'League joiners' },
      { event: 'purchase_completed', name: 'Purchasers' },
    ],
  },
  {
    name: 'Daily analytics health',
    description:
      'Daily ingestion volume and bounded product failures used for operational alerts.',
    interval: 'day',
    dateFrom: '-30d',
    series: [
      { event: '$pageview', name: 'Pageviews' },
      { event: 'prediction_save_failed', name: 'Prediction save failures' },
      { event: 'checkout_start_failed', name: 'Checkout start failures' },
      { event: 'checkout_open_failed', name: 'Checkout open failures' },
    ],
  },
];

const SEARCH_REFERRER = '(^|\\.)(google\\.|bing\\.com$|duckduckgo\\.com$)';

// Mirrored on a TRMNL e-ink screen by the "Dashboards for PostHog" recipe,
// which fits four tiles on the screen (the rest go to "+N more") and draws a
// headline number for time-series only. So: four single-line trends, in
// the order they matter, titled for the screen. Each point is the trailing seven days, plotted
// daily, so the recipe's "Last tick" headline is always a full week. Weekly
// buckets start on Sunday and read as nearly zero early in the week.
const TRMNL_WINDOW = { interval: 'day', dateFrom: '-8w' };

const trmnlTrends = [
  {
    ...TRMNL_WINDOW,
    name: 'Visitors',
    legacyNames: ['TRMNL: Visitors'],
    description: 'Unique visitors over the trailing seven days.',
    series: [{ event: '$pageview', name: 'Visitors', math: 'weekly_active' }],
  },
  {
    ...TRMNL_WINDOW,
    name: 'Search visitors',
    legacyNames: ['TRMNL: Search visitors'],
    description:
      'Unique visitors over the trailing seven days arriving from Google, Bing or DuckDuckGo.',
    series: [
      {
        event: '$pageview',
        name: 'Search visitors',
        math: 'weekly_active',
        propertyRegex: { $referring_domain: SEARCH_REFERRER },
      },
    ],
  },
  {
    ...TRMNL_WINDOW,
    name: 'Predictors',
    legacyNames: ['TRMNL: Predictors'],
    description:
      'Unique players over the trailing seven days who saved a prediction.',
    series: [
      {
        event: 'prediction_saved',
        name: 'Predictors',
        math: 'weekly_active',
      },
    ],
  },
  {
    ...TRMNL_WINDOW,
    // Snapshots start on 2026-09-27; days before that chart as zero.
    dateFrom: '-28d',
    name: 'Registered players',
    legacyNames: ['TRMNL: Registered players'],
    description:
      'Total registered players, from the daily site_totals snapshot the backend sends (apps/backend/convex/siteTotals.ts).',
    // The snapshot has no person profile, so test-account filters that read
    // person properties would drop every event.
    filterTestAccounts: false,
    series: [
      {
        event: 'site_totals',
        name: 'Registered players',
        math: 'max',
        mathProperty: 'users',
      },
    ],
  },
];

const retentions = [
  {
    name: 'Predictor weekly retention',
    description:
      'How often users who save a prediction return to save another prediction in following race weeks.',
    event: 'prediction_saved',
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

async function createDashboard({ name, description, tags }) {
  return posthogFetch(`/api/environments/${environmentId}/dashboards/`, {
    method: 'POST',
    body: JSON.stringify({ name, description, tags }),
  });
}

// Scoped to the dashboard, so a plain title like "Visitors" can't pick up an
// insight of the same name that belongs to something else.
async function findInsightByName(name, dashboardId) {
  const insights = await listAll(
    `/api/environments/${environmentId}/insights/?search=${encodeURIComponent(name)}&saved=true`,
  );
  return (
    insights.find(
      (insight) =>
        insight.name === name &&
        (insight.dashboards ?? []).includes(dashboardId),
    ) ?? null
  );
}

async function deleteInsight(insightId) {
  return posthogFetch(
    `/api/environments/${environmentId}/insights/${insightId}/`,
    { method: 'PATCH', body: JSON.stringify({ deleted: true }) },
  );
}

function eventNode(step, order) {
  const properties = [
    ...(step.path
      ? [
          {
            key: '$pathname',
            value: step.path,
            operator: 'exact',
            type: 'event',
          },
        ]
      : []),
    ...(step.pathRegex
      ? [
          {
            key: '$pathname',
            value: step.pathRegex,
            operator: 'regex',
            type: 'event',
          },
        ]
      : []),
    ...Object.entries(step.properties ?? {}).map(([key, value]) => ({
      key,
      value,
      operator: 'exact',
      type: 'event',
    })),
    ...Object.entries(step.propertyRegex ?? {}).map(([key, value]) => ({
      key,
      value,
      operator: 'regex',
      type: 'event',
    })),
  ];
  return {
    id: step.event,
    event: step.event,
    name: step.name,
    type: 'events',
    kind: 'EventsNode',
    order,
    properties,
    optionalInFunnel: Boolean(step.optional),
  };
}

function funnelPayload(funnel, dashboardId, tags) {
  const events = funnel.steps.map(eventNode);
  return {
    name: funnel.name,
    description: funnel.description,
    tags,
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
          properties: event.properties,
          optionalInFunnel: event.optionalInFunnel,
        })),
      },
    },
  };
}

function trendPayload(trend, dashboardId, tags) {
  const interval = trend.interval ?? 'week';
  const dateFrom = trend.dateFrom ?? '-12w';
  return {
    name: trend.name,
    description: trend.description,
    tags,
    dashboards: [dashboardId],
    query: {
      kind: 'InsightVizNode',
      source: {
        kind: 'TrendsQuery',
        dateRange: { date_from: dateFrom },
        interval,
        filterTestAccounts: trend.filterTestAccounts ?? true,
        trendsFilter: {
          display: 'ActionsLineGraph',
          showLegend: trend.series.length > 1,
        },
        series: trend.series.map((series, order) => ({
          kind: 'EventsNode',
          event: series.event,
          name: series.name,
          custom_name: series.name,
          math: series.math ?? 'dau',
          ...(series.mathProperty
            ? { math_property: series.mathProperty }
            : {}),
          properties: eventNode(series, order).properties,
        })),
      },
    },
  };
}

function retentionPayload(retention, dashboardId, tags) {
  const entity = { id: retention.event, type: 'events' };
  return {
    name: retention.name,
    description: retention.description,
    tags,
    dashboards: [dashboardId],
    query: {
      kind: 'InsightVizNode',
      source: {
        kind: 'RetentionQuery',
        dateRange: { date_from: '-12w' },
        filterTestAccounts: true,
        retentionFilter: {
          targetEntity: entity,
          returningEntity: entity,
          period: 'Week',
          retentionType: 'retention_recurring',
          retentionReference: 'total',
          timeWindowMode: 'strict_calendar_dates',
          totalIntervals: 8,
          cumulative: false,
        },
      },
    },
  };
}

function managedInsightPayload(definition, dashboardId, tags) {
  if ('steps' in definition) {
    return funnelPayload(definition, dashboardId, tags);
  }
  if ('series' in definition) {
    return trendPayload(definition, dashboardId, tags);
  }
  return retentionPayload(definition, dashboardId, tags);
}

async function createInsight(definition, dashboardId, tags) {
  return posthogFetch(`/api/environments/${environmentId}/insights/`, {
    method: 'POST',
    body: JSON.stringify(managedInsightPayload(definition, dashboardId, tags)),
  });
}

async function updateInsight(insightId, definition, dashboardId, tags) {
  return posthogFetch(
    `/api/environments/${environmentId}/insights/${insightId}/`,
    {
      method: 'PATCH',
      body: JSON.stringify(
        managedInsightPayload(definition, dashboardId, tags),
      ),
    },
  );
}

const dashboards = [
  {
    name: DASHBOARD_NAME,
    description:
      'Weekly product decision dashboard for acquisition, activation, prediction completion, social participation, leagues, and verified purchases. Managed by apps/web/scripts/setup-posthog.mjs.',
    tags: TAGS,
    insights: [...funnels, ...trends, ...retentions],
  },
  {
    name: TRMNL_DASHBOARD_NAME,
    legacyNames: ['Grand Prix Picks - TRMNL'],
    description:
      'Four weekly numbers for the TRMNL e-ink screen. Managed by apps/web/scripts/setup-posthog.mjs.',
    tags: TRMNL_TAGS,
    insights: trmnlTrends,
    retiredInsights: ['TRMNL: Race page visitors', 'TRMNL: Picker users'],
  },
];

async function setUpDashboard(config) {
  let dashboard = await findDashboardByName(config.name);
  for (const legacyName of config.legacyNames ?? []) {
    if (dashboard) {
      break;
    }
    const legacy = await findDashboardByName(legacyName);
    if (legacy) {
      dashboard = await posthogFetch(
        `/api/environments/${environmentId}/dashboards/${legacy.id}/`,
        {
          method: 'PATCH',
          body: JSON.stringify({
            name: config.name,
            description: config.description,
          }),
        },
      );
      process.stderr.write(
        `Renamed dashboard: ${legacyName} -> ${config.name}\n`,
      );
    }
  }
  if (!dashboard) {
    dashboard = await createDashboard(config);
    process.stderr.write(
      `Created dashboard: ${config.name} (${dashboard.id})\n`,
    );
  } else {
    process.stderr.write(`Found dashboard: ${config.name} (${dashboard.id})\n`);
  }

  for (const definition of config.insights) {
    let existing = await findInsightByName(definition.name, dashboard.id);
    for (const legacyName of definition.legacyNames ?? []) {
      existing ??= await findInsightByName(legacyName, dashboard.id);
    }
    if (existing) {
      const updated = await updateInsight(
        existing.id,
        definition,
        dashboard.id,
        config.tags,
      );
      process.stderr.write(
        `Updated insight: ${updated.name} (${updated.id})\n`,
      );
      continue;
    }

    const created = await createInsight(definition, dashboard.id, config.tags);
    process.stderr.write(`Created insight: ${created.name} (${created.id})\n`);
  }

  for (const name of config.retiredInsights ?? []) {
    const retired = await findInsightByName(name, dashboard.id);
    if (retired) {
      await deleteInsight(retired.id);
      process.stderr.write(`Deleted insight: ${name} (${retired.id})\n`);
    }
  }

  process.stderr.write(
    `${config.name}: ${host}/project/${environmentId}/dashboard/${dashboard.id}\n`,
  );
}

async function main() {
  process.stderr.write(`Using PostHog host ${host}\n`);
  for (const config of dashboards) {
    await setUpDashboard(config);
  }
  process.stderr.write('\nPostHog dashboards are set up.\n');
}

main().catch((error) => {
  process.stderr.write(
    `${error instanceof Error ? error.message : String(error)}\n`,
  );
  process.exitCode = 1;
});
