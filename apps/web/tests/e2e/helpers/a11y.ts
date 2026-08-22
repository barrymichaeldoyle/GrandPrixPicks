import AxeBuilder from '@axe-core/playwright';
import { expect, type Page } from '@playwright/test';

/**
 * The rule sets worth failing a build over.
 *
 * WCAG 2 A and AA are the bar the site claims; `best-practice` is deliberately
 * left out, because it flags defensible choices (a landmark nested one level
 * deeper than it likes) alongside real defects, and a check that cries wolf
 * gets muted rather than fixed.
 *
 * `wcag22aa` is in for one rule in particular: `target-size`. This is a game
 * played by tapping driver chips and duel cards on a phone, so 2.5.8 is the
 * success criterion most likely to describe a real defect here — and it only
 * says anything at a mobile viewport, which is why it arrived alongside the
 * mobile project in `playwright.config.ts`.
 */
const TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];

/**
 * Rules pulled back in from `best-practice` one at a time.
 *
 * The blanket exclusion above is right about most of that tag, but not about
 * this rule: a heading level that jumps h1 -> h3 breaks the outline a screen
 * reader user navigates by, which is a defect and not a matter of taste.
 * Enabling it by id keeps that catch without reopening the noisy rules beside
 * it.
 */
const EXTRA_RULES = ['heading-order'];

/**
 * Runs axe against the current page and fails with a readable report.
 *
 * This exists because oxlint's `jsx-a11y` plugin cannot see any of what axe
 * sees. Static analysis reads one component's JSX; contrast, focus order,
 * duplicate ids, and ARIA relationships are all properties of the composed
 * document, which only exists in a browser.
 *
 * `disableRules` takes a rule id and a reason, never a bare id: a suppression
 * with no argument attached to it is indistinguishable from giving up.
 */
export async function expectNoA11yViolations(
  page: Page,
  { disableRules = {} }: { disableRules?: Record<string, string> } = {},
) {
  // Settle animations before measuring. The reveal classes animate from
  // opacity 0 with `animation-fill-mode: both`, so a card with a stagger delay
  // is genuinely transparent until its turn comes — and axe, which computes
  // contrast against what is painted right now, reports that as a contrast
  // failure on text that is perfectly legible a moment later. Whether it fired
  // before or after the delay was luck, which made these runs flaky.
  //
  // Killing the animation reverts each element to its own styles, which is the
  // settled state (the reveal classes set no static opacity of their own), so
  // this removes the false positives without hiding a real contrast problem.
  await page.addStyleTag({
    content: `*, *::before, *::after {
      animation: none !important;
      transition: none !important;
    }`,
  });

  const disabled = Object.keys(disableRules);
  const build = () => {
    const builder = new AxeBuilder({ page });
    return disabled.length > 0 ? builder.disableRules(disabled) : builder;
  };

  // Two passes, because axe cannot express "these tags, plus these rules" in
  // one. `withTags` sets `runOnly`, and adding the extra rules through
  // `options({ rules })` does not narrow it back down — it discards the tag
  // filter and runs the entire default rule set, dragging in all 28
  // best-practice rules. That is precisely the blanket the comment above
  // rejects, and it arrives silently: the run still passes on most pages, so
  // it reads as working.
  //
  // Running the rules in their own scoped pass keeps the set exactly as
  // declared, at the cost of one more analyze() per page.
  //
  // Sequential, not `Promise.all`: axe refuses to start a second run while one
  // is in flight on the same page ("Axe is already running").
  const tagged = await build().withTags(TAGS).analyze();
  const extra = await build().withRules(EXTRA_RULES).analyze();
  const results = { violations: [...tagged.violations, ...extra.violations] };

  const report = results.violations.map((violation) => ({
    id: violation.id,
    impact: violation.impact,
    help: violation.help,
    nodes: violation.nodes.slice(0, 5).map((node) => node.target.join(' ')),
  }));

  expect(report, JSON.stringify(report, null, 2)).toEqual([]);
}
