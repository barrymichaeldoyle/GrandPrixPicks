import { act, type ReactNode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';

import { PublicNavigation } from './PublicNavigation';

vi.mock('@tanstack/react-router', () => ({
  Link: ({
    children,
    to,
    activeProps: _active,
    ...props
  }: {
    children: ReactNode;
    to: string;
    activeProps: unknown;
  }) => (
    <a href={to} {...props}>
      {children}
    </a>
  ),
}));

let container: HTMLDivElement;
let root: Root;
beforeEach(() => {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => root.render(<PublicNavigation />));
});
afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

it('closes on Escape and returns focus to the disclosure', () => {
  const details = container.querySelector('details')!;
  details.open = true;
  const link = container.querySelector('a')!;
  act(() => {
    link.focus();
    link.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }),
    );
  });
  expect(details.open).toBe(false);
  expect(document.activeElement).toBe(container.querySelector('summary'));
});

it('closes after choosing a destination and on an outside pointer press', () => {
  const details = container.querySelector('details')!;
  details.open = true;
  const raceLink =
    container.querySelector<HTMLAnchorElement>('a[href="/races"]')!;
  raceLink.addEventListener('click', (event) => event.preventDefault());
  act(() => raceLink.click());
  expect(details.open).toBe(false);
  details.open = true;
  act(() =>
    document.body.dispatchEvent(new Event('pointerdown', { bubbles: true })),
  );
  expect(details.open).toBe(false);
});

it('stays open when a tap blurs the toggle without focusing the link (Safari)', () => {
  const details = container.querySelector('details')!;
  details.open = true;
  const summary = container.querySelector('summary')!;
  act(() => {
    summary.focus();
    summary.dispatchEvent(
      new FocusEvent('focusout', { bubbles: true, relatedTarget: null }),
    );
  });
  expect(details.open).toBe(true);
});

it('closes when keyboard focus moves past the menu', () => {
  const outside = document.createElement('button');
  document.body.appendChild(outside);
  const details = container.querySelector('details')!;
  details.open = true;
  act(() => {
    container
      .querySelector('summary')!
      .dispatchEvent(
        new FocusEvent('focusout', { bubbles: true, relatedTarget: outside }),
      );
  });
  expect(details.open).toBe(false);
  outside.remove();
});
