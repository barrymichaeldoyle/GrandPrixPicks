import { act } from 'react';
import type { Root } from 'react-dom/client';
import { createRoot } from 'react-dom/client';
import { afterEach, describe, expect, it } from 'vitest';

import { PicksFormActionRow } from './PicksSaveStatus';

(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

describe('PicksFormActionRow', () => {
  let container: HTMLDivElement;
  let root: Root;

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  function render(complete: boolean) {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    act(() => {
      root.render(
        <PicksFormActionRow
          complete={complete}
          saveState={complete ? 'saving' : 'unsaved'}
          primaryLabel="Continue to team-mate picks"
        />,
      );
    });
  }

  it('keeps the next-action button in the layout before the set is valid', () => {
    render(false);

    const button = [...container.querySelectorAll('button')].find((node) =>
      node.textContent?.includes('Continue to team-mate picks'),
    );
    expect(button).toBeTruthy();
    expect(button?.disabled).toBe(true);
    expect(
      container.querySelector('[data-testid="picks-save-status"]')
        ?.parentElement?.className,
    ).toContain('invisible');
  });

  it('enables the same button when the set is valid', () => {
    render(true);

    const button = [...container.querySelectorAll('button')].find((node) =>
      node.textContent?.includes('Continue to team-mate picks'),
    );
    expect(button?.disabled).toBe(false);
    expect(container.textContent).toContain('Saving');
  });
});
