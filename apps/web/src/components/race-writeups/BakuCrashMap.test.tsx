import { act } from 'react';
import type { Root } from 'react-dom/client';
import { createRoot } from 'react-dom/client';
import { afterEach, describe, expect, it } from 'vitest';

import { BakuCrashMap } from './BakuCrashMap';

(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

describe('BakuCrashMap callouts', () => {
  let container: HTMLDivElement | null = null;
  let root: Root | null = null;

  afterEach(() => {
    act(() => root?.unmount());
    container?.remove();
    container = null;
    root = null;
  });

  it('keeps the turn and the count as separate words in the marker', () => {
    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);
    act(() => root!.render(<BakuCrashMap />));

    const marker = container.querySelector('[data-corner="3"]');
    expect(marker?.getAttribute('aria-label')).toMatch(
      /^Turn 3, \d+ incidents$/,
    );
    // Two tspans with no break concatenate to "Turn 311", which is not in the
    // accessible name. Whitespace between them is what WCAG 2.5.3 needs.
    expect(marker?.textContent).toMatch(/Turn 3\s+\d+/);
    expect(marker?.textContent).not.toMatch(/Turn 3\d/);
  });
});
