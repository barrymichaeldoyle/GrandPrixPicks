import { act } from 'react';
import type { Root } from 'react-dom/client';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { RaceWeekendOption } from './RaceWeekendSelect';
import { RaceWeekendSelect } from './RaceWeekendSelect';

(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

Element.prototype.scrollIntoView = () => {};

const RACES: RaceWeekendOption[] = [
  {
    _id: 'spain',
    name: 'Spanish Grand Prix',
    round: 9,
    season: 2026,
    slug: 'spain-2026',
  },
  {
    _id: 'italy',
    name: 'Italian Grand Prix',
    round: 13,
    season: 2026,
    slug: 'italy-2026',
  },
  {
    _id: 'azerbaijan',
    name: 'Azerbaijan Grand Prix',
    round: 17,
    season: 2026,
    slug: 'azerbaijan-2026',
  },
];

let root: Root | null = null;
let container: HTMLDivElement | null = null;

function renderSelect(onChange: (raceId: string) => void = () => {}) {
  container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
  act(() => {
    root!.render(
      <RaceWeekendSelect races={RACES} value="italy" onChange={onChange} />,
    );
  });
  return container;
}

afterEach(() => {
  act(() => root?.unmount());
  container?.remove();
  root = null;
  container = null;
});

function trigger() {
  return container!.querySelector<HTMLButtonElement>('button[aria-haspopup]')!;
}

function open() {
  act(() => trigger().click());
}

describe('RaceWeekendSelect', () => {
  it('shows the selected weekend and its flag on the trigger', () => {
    renderSelect();

    expect(trigger().textContent).toContain('Round 13 · Italian Grand Prix');
    expect(trigger().getAttribute('aria-expanded')).toBe('false');
    expect(trigger().getAttribute('aria-haspopup')).toBe('listbox');
    const flag = trigger().querySelector('img');
    expect(flag?.getAttribute('src')).toContain('/flags/it.svg');
    expect(flag?.getAttribute('alt')).toBe('');
  });

  it('opens a labelled listbox of flagged options', () => {
    renderSelect();
    open();

    expect(trigger().getAttribute('aria-expanded')).toBe('true');
    const listbox = container!.querySelector('[role="listbox"]');
    expect(listbox?.getAttribute('aria-label')).toBe('Race weekends');
    const options = container!.querySelectorAll('[role="option"]');
    expect(options).toHaveLength(3);
    expect(options[1]?.getAttribute('aria-selected')).toBe('true');
    expect(options[1]?.textContent).toContain('Italian Grand Prix');
    expect(options[1]?.querySelector('img')?.getAttribute('src')).toContain(
      '/flags/it.svg',
    );
  });

  it('filters the list from the search field', () => {
    renderSelect();
    open();

    const search = container!.querySelector<HTMLInputElement>(
      'input[role="combobox"]',
    )!;
    const setValue = Object.getOwnPropertyDescriptor(
      HTMLInputElement.prototype,
      'value',
    )?.set;
    act(() => {
      setValue?.call(search, 'azerb');
      search.dispatchEvent(new Event('input', { bubbles: true }));
    });

    const options = container!.querySelectorAll('[role="option"]');
    expect(options).toHaveLength(1);
    expect(options[0]?.textContent).toContain('Azerbaijan Grand Prix');
  });

  it('commits the highlighted option with Enter', () => {
    const onChange = vi.fn();
    renderSelect(onChange);
    open();

    const search = container!.querySelector<HTMLInputElement>(
      'input[role="combobox"]',
    )!;
    act(() => {
      search.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }),
      );
    });
    act(() => {
      search.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }),
      );
    });

    expect(onChange).toHaveBeenCalledWith('azerbaijan');
    expect(trigger().getAttribute('aria-expanded')).toBe('false');
  });

  it('closes on Escape and returns focus to the trigger', () => {
    renderSelect();
    open();

    const search = container!.querySelector<HTMLInputElement>(
      'input[role="combobox"]',
    )!;
    act(() => {
      search.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }),
      );
    });

    expect(container!.querySelector('[role="listbox"]')).toBeNull();
    expect(document.activeElement).toBe(trigger());
  });

  it('does not call scrollIntoView when the pointer moves across options', () => {
    const scrollIntoView = vi.fn();
    Element.prototype.scrollIntoView = scrollIntoView;
    renderSelect();
    open();

    const options = container!.querySelectorAll('[role="option"]');
    act(() => {
      options[0]?.dispatchEvent(
        new MouseEvent('mouseenter', { bubbles: true }),
      );
    });
    act(() => {
      options[2]?.dispatchEvent(
        new MouseEvent('mouseenter', { bubbles: true }),
      );
    });

    expect(scrollIntoView).not.toHaveBeenCalled();
  });
});

function stubMatchMedia(matches: boolean) {
  window.matchMedia = ((query: string) => ({
    matches: query.includes('max-width: 639px') ? matches : false,
    media: query,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia;
}

describe('RaceWeekendSelect mobile takeover', () => {
  const originalMatchMedia = window.matchMedia;

  beforeEach(() => {
    stubMatchMedia(true);
  });

  afterEach(() => {
    window.matchMedia = originalMatchMedia;
  });

  function dialog() {
    return document.querySelector<HTMLElement>('[role="dialog"]');
  }

  it('opens a full-screen dialog instead of a dropdown', () => {
    renderSelect();
    open();

    expect(trigger().getAttribute('aria-haspopup')).toBe('dialog');
    expect(dialog()?.getAttribute('aria-modal')).toBe('true');
    expect(dialog()?.querySelector('h2')?.textContent).toBe('Race weekend');
    expect(container!.querySelector('[role="listbox"]')).toBeNull();
    const listbox = dialog()?.querySelector('[role="listbox"]');
    expect(listbox?.getAttribute('aria-label')).toBe('Race weekends');
    expect(dialog()?.querySelectorAll('[role="option"]')).toHaveLength(3);
  });

  it('closes from the header button and returns focus to the trigger', () => {
    renderSelect();
    open();

    const closeButton = dialog()?.querySelector<HTMLButtonElement>(
      'button[aria-label="Close"]',
    );
    act(() => closeButton?.click());

    expect(dialog()).toBeNull();
    expect(document.activeElement).toBe(trigger());
  });

  it('commits a tap and leaves the takeover', () => {
    const onChange = vi.fn();
    const back = vi.spyOn(window.history, 'back');
    renderSelect(onChange);
    open();

    const azerbaijan = dialog()?.querySelector('[role="option"]:last-child');
    act(() => {
      azerbaijan?.dispatchEvent(
        new MouseEvent('mousedown', { bubbles: true, cancelable: true }),
      );
    });

    expect(onChange).toHaveBeenCalledWith('azerbaijan');
    expect(dialog()).toBeNull();
    expect(back).not.toHaveBeenCalled();
    back.mockRestore();
  });
});
