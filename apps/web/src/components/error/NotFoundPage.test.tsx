import { act } from 'react';
import type { Root } from 'react-dom/client';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

/** What `races.getQuickPickRace` resolves to for the render under test. */
let currentRace: { slug: string } | undefined;

vi.mock('@/integrations/convex/query', () => ({
  useQuery: () => currentRace,
}));

vi.mock('@convex-generated/api', () => ({
  api: { races: { getQuickPickRace: 'races:getQuickPickRace' } },
}));

vi.mock('@tanstack/react-router', () => ({
  Link: ({ to, children }: { to: string; children: React.ReactNode }) => (
    <a href={to}>{children}</a>
  ),
}));

const { NotFoundPage } = await import('./NotFoundPage');

let container: HTMLDivElement;
let root: Root;

function hrefs(): string[] {
  return Array.from(container.querySelectorAll('a')).map(
    (anchor) => anchor.getAttribute('href') ?? '',
  );
}

beforeEach(() => {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => {
    root.unmount();
  });
  container.remove();
  currentRace = undefined;
});

describe('NotFoundPage', () => {
  it('links to the write-up for the weekend that is running', () => {
    // Monza has an entry in the write-up registry.
    currentRace = { slug: 'italy-2026' };
    act(() => {
      root.render(<NotFoundPage />);
    });

    expect(hrefs()).toContain('/f1-2026-italian-grand-prix-predictions');
    expect(container.textContent).toContain('Read the Monza results');
  });

  it('still offers the calendar when the weekend has no write-up', () => {
    // Most weekends: nobody wrote one, and the page must not link a route that
    // does not exist.
    currentRace = { slug: 'japan-2026' };
    act(() => {
      root.render(<NotFoundPage />);
    });

    expect(hrefs()).toEqual(['/', '/races']);
  });

  it('renders before the current race resolves', () => {
    // The read is client-only, so the first paint has no race at all.
    currentRace = undefined;
    act(() => {
      root.render(<NotFoundPage />);
    });

    expect(hrefs()).toEqual(['/', '/races']);
    expect(container.textContent).toContain('Page not found');
  });
});
