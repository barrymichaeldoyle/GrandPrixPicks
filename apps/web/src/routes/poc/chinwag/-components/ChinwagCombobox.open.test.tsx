import { act } from 'react';
import type { Root } from 'react-dom/client';
import { createRoot } from 'react-dom/client';
import { afterEach, describe, expect, it } from 'vitest';

import type { ComboboxOption } from './ChinwagCombobox';
import { ChinwagCombobox } from './ChinwagCombobox';

(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

// jsdom has no layout, so it implements no scrolling. The component keeps the
// active option in view; there is nothing to keep in view here. Stubbed the
// same way `Faq.test.tsx` stubs IntersectionObserver, rather than guarding the
// call in the component for an environment gap no browser has.
Element.prototype.scrollIntoView = () => {};

const DRIVERS: ComboboxOption[] = [
  {
    code: 'VER',
    label: 'Max Verstappen',
    team: 'Red Bull Racing',
    value: 'VER',
  },
  { code: 'NOR', label: 'Lando Norris', team: 'McLaren', value: 'NOR' },
];

let root: Root | null = null;
let container: HTMLDivElement | null = null;

function renderTwo() {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);

  act(() => {
    root!.render(
      <>
        <ChinwagCombobox
          id="first"
          onChange={() => {}}
          options={DRIVERS}
          value={undefined}
        />
        <ChinwagCombobox
          id="second"
          onChange={() => {}}
          options={DRIVERS}
          value={undefined}
        />
      </>,
    );
  });

  return {
    first: container.querySelector<HTMLInputElement>('#first')!,
    second: container.querySelector<HTMLInputElement>('#second')!,
  };
}

afterEach(() => {
  act(() => root?.unmount());
  container?.remove();
  root = null;
  container = null;
});

function openListboxes() {
  return document.querySelectorAll('[role="listbox"]').length;
}

describe('ChinwagCombobox popup state', () => {
  it('opens its list on focus', () => {
    const { first } = renderTwo();

    act(() => first.focus());

    expect(openListboxes()).toBe(1);
    expect(first.getAttribute('aria-expanded')).toBe('true');
  });

  /**
   * The bug this exists for: moving focus to the next category used to leave
   * the previous list open, so a keyboard user tabbing through six questions
   * ended up with six popups on screen and `aria-expanded="true"` on five
   * controls that were no longer focused.
   */
  it('closes the previous list when focus moves to the next one', () => {
    const { first, second } = renderTwo();

    act(() => first.focus());
    expect(openListboxes()).toBe(1);

    act(() => second.focus());

    expect(openListboxes()).toBe(1);
    expect(first.getAttribute('aria-expanded')).toBe('false');
    expect(second.getAttribute('aria-expanded')).toBe('true');
  });

  it('closes on blur to nothing at all', () => {
    const { first } = renderTwo();

    act(() => first.focus());
    act(() => first.blur());

    expect(openListboxes()).toBe(0);
    expect(first.getAttribute('aria-expanded')).toBe('false');
  });
});
