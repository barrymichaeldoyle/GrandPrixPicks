import { act } from 'react';
import type { Root } from 'react-dom/client';
import { createRoot } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { RaceWriteupHero } from './RaceWriteupHero';

vi.mock('@tanstack/react-router', () => ({
  Link: ({
    children,
    params,
    to,
  }: {
    children: React.ReactNode;
    params: { raceSlug: string };
    to: string;
  }) => <a href={to.replace('$raceSlug', params.raceSlug)}>{children}</a>,
}));

(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

describe('RaceWriteupHero', () => {
  let container: HTMLDivElement | null = null;
  let root: Root | null = null;

  afterEach(() => {
    act(() => root?.unmount());
    container?.remove();
    container = null;
    root = null;
  });

  it('opens on the race identity, the phase, and the weekend schedule', () => {
    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);
    act(() =>
      root!.render(
        <RaceWriteupHero
          flagCode="ES"
          eyebrow="11–13 Sep · Madring · Round 15"
          title="2026 Spanish Grand Prix predictions"
          summary="Formula 1 returns to Madrid."
          phase="preview"
          raceSlug="madrid-2026"
          venueName="Madrid"
          schedule={{
            race: { raceStartAt: Date.parse('2026-09-13T13:00:00Z') },
            timeZone: 'Europe/Madrid',
            timeZoneLabel: 'Madrid time',
          }}
        />,
      ),
    );

    expect(container.querySelector('h1')?.textContent).toBe(
      '2026 Spanish Grand Prix predictions',
    );
    expect(container.textContent).toContain('11–13 Sep · Madring · Round 15');
    expect(container.textContent).toContain('Weekend preview');
    expect(container.textContent).toContain('Formula 1 returns to Madrid.');
    expect(
      container.querySelector('[aria-label="Weekend schedule"]'),
    ).not.toBeNull();
    expect(container.querySelector('span[aria-hidden]')?.className).toContain(
      'hidden',
    );
  });
});
