import { act } from 'react';
import type { Root } from 'react-dom/client';
import { createRoot } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { listRaceWriteups } from '@/lib/raceWriteups';
import { RaceWriteupCallout } from './RaceWriteupCallout';

vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, to }: { children: React.ReactNode; to: string }) => (
    <a href={to}>{children}</a>
  ),
}));

(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

/**
 * The registry is the single source of which weekends have a write-up, and
 * these assertions are what keep it that way.
 *
 * `CircuitGuide` used to decide with `raceSlug === 'italy-2026'` and had
 * already gone stale: the Madring write-up shipped and that nav never learned
 * about it. A second copy of the answer is the failure mode, so the callout is
 * checked against `listRaceWriteups()` rather than against a slug spelled out
 * here.
 */
describe('race write-up callout', () => {
  let container: HTMLDivElement | null = null;
  let root: Root | null = null;

  afterEach(() => {
    act(() => root?.unmount());
    container?.remove();
    container = null;
    root = null;
  });

  function render(raceSlug: string) {
    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);
    act(() => root!.render(<RaceWriteupCallout raceSlug={raceSlug} />));
    return container;
  }

  it('renders nothing for a weekend with no write-up', () => {
    expect(render('netherlands-2026').textContent).toBe('');
  });

  it('links every registered write-up from its own race page', () => {
    const writeups = listRaceWriteups();
    expect(writeups.length).toBeGreaterThan(0);

    for (const writeup of writeups) {
      // `raceSlug` comes off the registry entry itself, so a third write-up
      // is covered the moment it is added and nothing here needs editing.
      const html = render(writeup.raceSlug);

      const link = html.querySelector('a');
      expect(link, `${writeup.to} has no link`).not.toBeNull();
      expect(link!.getAttribute('href')).toBe(writeup.to);
      // Link text has to stand on its own out of context, which is the job
      // `cta` exists for.
      expect(link!.textContent).toContain(writeup.cta);
      expect(html.textContent).toContain(writeup.summary);

      act(() => root?.unmount());
      container?.remove();
      container = null;
      root = null;
    }
  });

  it('gives every write-up a summary that says what is in it', () => {
    for (const writeup of listRaceWriteups()) {
      expect(writeup.summary.length, writeup.to).toBeGreaterThan(30);
      expect(writeup.summary.trim()).toBe(writeup.summary);
      // A summary that only restates the label tells a reader nothing they
      // could not read off the heading.
      expect(writeup.summary).not.toBe(writeup.label);
    }
  });
});
