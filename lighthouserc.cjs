/**
 * Lighthouse budgets for the built web app.
 *
 * Run against `pnpm --filter @grandprixpicks/web start`, which serves the Nitro
 * output on 127.0.0.1:3000. That is the closest thing to production we can
 * stand up in CI, but it is not production, and the difference decides what is
 * worth asserting on.
 *
 * ## Why the transport metrics are not asserted
 *
 * The local Node server sends no compression and none of the CDN cache headers
 * that Cloudflare adds, so `uses-text-compression`, `uses-long-cache-ttl` and
 * `server-response-time` all fail here and all pass in production. Asserting on
 * them, or on the overall performance score that folds them in, would mean a
 * permanently red check measuring our lack of a CDN rather than our code.
 *
 * So the budgets below cover the two things this harness measures honestly:
 *
 *   - metrics the browser computes from our own markup and JavaScript, which
 *     transport barely touches (CLS, TBT), asserted tightly at the measured
 *     values;
 *   - accessibility and SEO, which are environment-independent, asserted at the
 *     100s the site currently scores.
 *
 * LCP gets a deliberately loose ceiling. It is transport-sensitive and drifts
 * on a shared CI runner, so a tight budget would flake; 3s still catches the
 * regression that matters (a render-blocking import, a route that lost SSR)
 * while ignoring the noise.
 *
 * Real-world performance numbers should come from field data, not from here.
 * This is a regression gate, not a measurement of what players experience.
 *
 * Baseline measured 2026-08-14, median of 3 desktop runs:
 *   /              perf 88  a11y 100  seo 100  LCP 1538ms  CLS 0  TBT 0ms
 *   /races         perf 90  a11y 100  seo 100  LCP 1506ms  CLS 0  TBT 0ms
 *   /f1-standings  perf 89  a11y 100  seo 100  LCP 1686ms  CLS 0  TBT 0ms
 */
module.exports = {
  ci: {
    collect: {
      url: [
        'http://127.0.0.1:3000/',
        'http://127.0.0.1:3000/races',
        'http://127.0.0.1:3000/f1-standings',
      ],
      numberOfRuns: 3,
      settings: { preset: 'desktop' },
    },
    assert: {
      assertions: {
        'categories:accessibility': ['error', { minScore: 1 }],
        'categories:seo': ['error', { minScore: 1 }],

        // Zero today on every page, and staying there is the point: the whole
        // reveal-animation system is built to not move content around.
        'cumulative-layout-shift': ['error', { maxNumericValue: 0.02 }],
        // Also zero today. This is the one that catches a heavy import landing
        // on the critical path.
        'total-blocking-time': ['error', { maxNumericValue: 200 }],
        'largest-contentful-paint': ['warn', { maxNumericValue: 3000 }],

        // Everything else reports but does not gate. Left explicit rather than
        // absent so the next person can see it was a decision.
        'categories:performance': 'off',
        'categories:best-practices': 'off',
      },
    },
    upload: { target: 'filesystem', outputDir: './.lighthouseci' },
  },
};
