import { act } from 'react';
import type { Root } from 'react-dom/client';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { CommandPalette } from './CommandPalette';

(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

const navigate = vi.fn();

vi.mock('@convex-generated/api', () => ({
  api: { races: { getNextRace: 'getNextRace' } },
}));

vi.mock('@/integrations/convex/query', () => ({
  useQuery: () => ({ name: 'Singapore Grand Prix', slug: 'singapore-2026' }),
}));

vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => navigate,
}));

vi.mock('@/lib/analytics', () => ({
  captureAnalyticsEvent: vi.fn(),
}));

describe('command palette', () => {
  let container: HTMLDivElement | null = null;
  let root: Root | null = null;
  const onClose = vi.fn();

  beforeEach(() => {
    navigate.mockClear();
    onClose.mockClear();
  });

  afterEach(() => {
    act(() => root?.unmount());
    container?.remove();
    container = null;
    root = null;
  });

  function render(open = true, signedIn = true) {
    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);
    act(() =>
      root!.render(
        <CommandPalette open={open} onClose={onClose} signedIn={signedIn} />,
      ),
    );
  }

  function input() {
    const el = document.querySelector<HTMLInputElement>('[role="combobox"]');
    if (!el) {
      throw new Error('no palette input rendered');
    }
    return el;
  }

  function options() {
    return [...document.querySelectorAll<HTMLElement>('[role="option"]')];
  }

  function activeOption() {
    const id = input().getAttribute('aria-activedescendant');
    return id ? document.getElementById(id) : null;
  }

  function type(value: string) {
    const field = input();
    const setValue = Object.getOwnPropertyDescriptor(
      HTMLInputElement.prototype,
      'value',
    )!.set!;
    act(() => {
      setValue.call(field, value);
      field.dispatchEvent(new Event('input', { bubbles: true }));
    });
  }

  function press(key: string) {
    act(() => {
      input().dispatchEvent(
        new KeyboardEvent('keydown', { key, bubbles: true }),
      );
    });
  }

  it('renders nothing while closed', () => {
    render(false);

    expect(document.querySelector('[role="dialog"]')).toBeNull();
  });

  it('highlights the first result without moving focus off the input', () => {
    render();

    expect(document.activeElement).toBe(input());
    expect(activeOption()?.textContent).toBe(
      'Pick your Singapore Grand Prix top 5',
    );
  });

  // The reason every row is a div: an anchor or a button would join
  // `useModalDialog`'s focus trap and desync real focus from the active option.
  it('keeps every result out of the tab order', () => {
    render();

    for (const option of options()) {
      expect(option.tagName).toBe('DIV');
      expect(option.getAttribute('tabindex')).toBe('-1');
    }
  });

  it('moves the highlight with the arrow keys and wraps at both ends', () => {
    render();
    const first = activeOption();

    press('ArrowDown');
    expect(activeOption()).not.toBe(first);

    press('ArrowUp');
    expect(activeOption()).toBe(first);

    press('ArrowUp');
    expect(activeOption()).toBe(options().at(-1));
  });

  it('marks exactly one option selected', () => {
    render();
    press('ArrowDown');

    const selected = options().filter(
      (option) => option.getAttribute('aria-selected') === 'true',
    );
    expect(selected).toHaveLength(1);
    expect(selected[0]).toBe(activeOption());
  });

  it('opens the highlighted result on Enter and closes first', () => {
    render();
    type('leaderboard');
    press('Enter');

    expect(onClose).toHaveBeenCalled();
    expect(navigate).toHaveBeenCalledWith({ to: '/leaderboard' });
  });

  it('opens the row the person actually sees highlighted after grouping', () => {
    render();
    // "p" matches the race pick and several destinations; grouping puts Picks
    // first, so Enter must follow the visible order rather than the ranked one.
    type('p');
    press('Enter');

    expect(navigate).toHaveBeenCalledWith({ to: '/races/singapore-2026' });
  });

  it('resets the highlight to the best match when the query changes', () => {
    render();
    press('ArrowDown');
    press('ArrowDown');
    type('settings');

    expect(activeOption()?.textContent).toBe('Settings');
  });

  it('reports an empty result set instead of an empty panel', () => {
    render();
    type('zzzz');

    expect(options()).toHaveLength(0);
    expect(document.body.textContent).toContain('No matches.');

    press('Enter');
    expect(navigate).not.toHaveBeenCalled();
  });

  it('counts one result in the singular', () => {
    render();
    type('calendar');

    expect(document.body.textContent).toContain('1 result.');
  });

  it('drops viewer-scoped rows for a signed-out visitor', () => {
    render(true, false);
    type('settings');

    expect(options()).toHaveLength(0);
  });

  it('names the listbox it controls', () => {
    render();
    const controls = input().getAttribute('aria-controls');

    expect(controls).toBeTruthy();
    expect(document.getElementById(controls!)?.getAttribute('role')).toBe(
      'listbox',
    );
  });
});
