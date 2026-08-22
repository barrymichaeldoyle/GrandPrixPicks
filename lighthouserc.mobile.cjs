/**
 * The same built app, measured as a phone.
 *
 * `lighthouserc.cjs` runs `preset: 'desktop'` and nothing else did, which meant
 * every automated check in the repo — that config, and the axe sweep beside it
 * — looked at the site at 1280px only. An accessibility and SEO audit in August
 * 2026 found a serious WCAG violation that existed only below 440px and was
 * therefore invisible to all of them. The axe side of that gap is closed by the
 * `mobile-chromium` Playwright project; this is the Lighthouse side.
 *
 * ## What this run is actually for
 *
 * Two SEO audits only exist in mobile emulation and so have never run here:
 *
 *   - `font-size`, which fails a page whose body copy is too small to read on a
 *     phone (currently ~70-75% legible text across the sampled pages, against a
 *     60% floor — passing, but not by so much that a type change could not
 *     break it);
 *   - `tap-targets`, Lighthouse's own heuristic for controls too small or too
 *     close to hit with a thumb.
 *
 * That is the whole reason this file exists. Everything else it measures is
 * either already covered at desktop or not worth gating twice.
 *
 * ## Why accessibility is asserted but is not the real gate
 *
 * It scores 100 here and is cheap to keep at 100, so it is asserted. But the
 * authority on accessibility in this repo is `tests/e2e/a11y-smoke.spec.ts`
 * running under `mobile-chromium`: it checks WCAG 2.2 AA against the full axe
 * rule set at 412px, where Lighthouse runs a curated subset. If the two ever
 * disagree, axe is right and this number is a smoke alarm, not a survey.
 *
 * ## Why performance is off entirely
 *
 * Mobile emulation applies 4x CPU throttling on top of a local Node server that
 * sends no compression and none of Cloudflare's cache headers. The resulting
 * numbers describe the CI runner, not the site. The desktop config already
 * holds the CLS and TBT lines, and those are the transport-independent ones.
 *
 * Baseline measured 2026-08-22 against production, single run per URL:
 *   /              a11y 100  seo 100  (perf 69)
 *   /races         a11y 100  seo 100  (perf 67)
 *   /f1-standings  a11y 100  seo 100  (perf 82)
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
      // No preset: mobile emulation is Lighthouse's default, and naming it
      // explicitly is the point of this file existing next to the other one.
    },
    assert: {
      assertions: {
        'categories:accessibility': ['error', { minScore: 1 }],
        'categories:seo': ['error', { minScore: 1 }],

        // See above. Left explicit rather than absent so the next person can
        // see it was a decision.
        'categories:performance': 'off',
        'categories:best-practices': 'off',
      },
    },
    upload: { target: 'filesystem', outputDir: './.lighthouseci-mobile' },
  },
};
