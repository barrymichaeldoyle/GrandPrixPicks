import AxeBuilder from '@axe-core/playwright';
import { expect, type Page } from '@playwright/test';

/**
 * The rule sets worth failing a build over.
 *
 * WCAG 2 A and AA are the bar the site claims; `best-practice` is deliberately
 * left out, because it flags defensible choices (a landmark nested one level
 * deeper than it likes) alongside real defects, and a check that cries wolf
 * gets muted rather than fixed.
 */
const TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'];

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
  const builder = new AxeBuilder({ page }).withTags(TAGS);
  const results = await (
    disabled.length > 0 ? builder.disableRules(disabled) : builder
  ).analyze();

  const report = results.violations.map((violation) => ({
    id: violation.id,
    impact: violation.impact,
    help: violation.help,
    nodes: violation.nodes.slice(0, 5).map((node) => node.target.join(' ')),
  }));

  expect(report, JSON.stringify(report, null, 2)).toEqual([]);
}
