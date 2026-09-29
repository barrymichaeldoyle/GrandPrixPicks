# PostHog queries

The PostHog MCP asks for `info <tool>` and `read-data-schema` before every
query. For the questions this project asks, both are already answered here.
`info execute-sql` alone returns about 42k characters, and `read-data-schema`
for events about 13k, so skip them when a shape below fits.

Project: **Grand Prix Picks**, id 134013, EU cloud.

## Calling SQL

One JSON argument, `query`:

```text
call execute-sql {"query": "SELECT ... LIMIT 50"}
```

Always put a `LIMIT` on it. Results come back as a pipe-separated table.

## Excluding Barry and test accounts

`filterTestAccounts` only exists on the typed `query-*` tools. In SQL, add:

```sql
AND NOT (person.properties.email = 'barrydoyle18@gmail.com'
      OR person.properties.email ILIKE '%@grandprixpicks.com'
      OR person.properties.email ILIKE '%@barrymichaeldoyle.com'
      OR properties.$host ILIKE 'localhost%')
```

This does not catch Barry browsing signed out on a device that never signed
in.

## Event names

Our own events are listed in `analyticsEventNames` in
`packages/shared/src/analytics.ts`: grep that rather than calling
`read-data-schema`. The busiest in September 2026 were `h2h_duel_selected`,
`prediction_saved`, `screen_viewed` (mobile), `session_results_tab_selected`,
`landing_picker_viewed` and `feed_loaded`. Web page views are `$pageview`,
with the path in `properties.$pathname`.

To see what actually fired recently:

```sql
SELECT event, count() AS n, max(timestamp) AS last FROM events
WHERE timestamp > now() - INTERVAL 30 DAY AND event NOT LIKE '$%'
GROUP BY event ORDER BY n DESC LIMIT 30
```

## Common queries

Page views by path, last 7 days:

```sql
SELECT properties.$pathname AS path, count() AS views, uniq(person_id) AS visitors
FROM events
WHERE event = '$pageview' AND timestamp > now() - INTERVAL 7 DAY
  -- plus the exclusion above
GROUP BY path ORDER BY views DESC LIMIT 30
```

Search Console, per page (the warehouse sync). **Do not trust its `clicks`
column**: over its whole history it held 2 clicks, against the console's 17.
Impressions and position are sound.

```sql
SELECT page, sum(impressions) AS impr, round(avg(position), 1) AS pos,
       count(DISTINCT query) AS queries
FROM googlesearchconsole.search_analytics_by_query_page
WHERE date >= today() - 28
GROUP BY page ORDER BY impr DESC LIMIT 30
```

Columns: `date`, `page`, `query`, `impressions`, `clicks`, `position`, `ctr`,
`search_type`.

Funnels and retention follow PostHog's own calculation rules, which approximate
SQL gets wrong. Use `query-funnel` / `query-retention` for those, and accept the
`info` cost.
