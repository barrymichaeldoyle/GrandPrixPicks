import { act } from 'react';
import type { Root } from 'react-dom/client';
import { createRoot } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { RaceWriteupActions } from './RaceWriteupActions';
import { captureAnalyticsEvent } from '@/lib/analytics';

vi.mock('@/lib/analytics', () => ({ captureAnalyticsEvent: vi.fn() }));

vi.mock('@tanstack/react-router', () => ({
  Link: ({
    children,
    params,
    to,
    onClick,
  }: {
    children: React.ReactNode;
    params: { raceSlug: string };
    to: string;
    onClick?: () => void;
  }) => (
    <a href={to.replace('$raceSlug', params.raceSlug)} onClick={onClick}>
      {children}
    </a>
  ),
}));

(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

describe('race write-up actions', () => {
  let container: HTMLDivElement | null = null;
  let root: Root | null = null;

  afterEach(() => {
    act(() => root?.unmount());
    container?.remove();
    container = null;
    root = null;
    vi.clearAllMocks();
  });

  function render(
    primaryActionTargetId?: string,
    props: Partial<Parameters<typeof RaceWriteupActions>[0]> = {},
  ) {
    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);
    act(() =>
      root!.render(
        <RaceWriteupActions
          phase="preview"
          primaryActionTargetId={primaryActionTargetId}
          raceSlug="italy-2026"
          venueName="Monza"
          {...props}
        />,
      ),
    );
    return container.querySelector('a')!;
  }

  it('keeps an embedded picker CTA on the write-up page', () => {
    expect(render('make-picks').getAttribute('href')).toBe('#make-picks');
  });

  it('uses the race page when there is no embedded action', () => {
    expect(render().getAttribute('href')).toBe('/races/italy-2026');
  });

  it('offers the next playable round from an archive and keeps a result link', () => {
    const primary = render(undefined, {
      phase: 'finished',
      raceSlug: 'bahrain-2026',
      venueName: 'Sepang',
      nextRace: { slug: 'singapore-2026', name: 'Singapore Grand Prix' },
    });
    expect(primary.textContent).toBe('Make Singapore picks');
    expect(primary.getAttribute('href')).toBe('/races/singapore-2026');
    expect(
      container!.querySelector('a[href="/races/bahrain-2026"]')?.textContent,
    ).toBe('See Sepang results');
    act(() => primary.click());
    expect(captureAnalyticsEvent).toHaveBeenCalledWith(
      'public_page_cta_clicked',
      expect.objectContaining({
        destination: 'next_race_page',
        race_slug: 'bahrain-2026',
        target_race_slug: 'singapore-2026',
      }),
    );
  });

  it('keeps a finished round usable when no next race is available', () => {
    expect(
      render(undefined, { phase: 'finished', nextRace: null }).getAttribute(
        'href',
      ),
    ).toBe('/races/italy-2026');
  });

  it('keeps a live write-up focused on its own embedded picks', () => {
    expect(
      render('make-picks', {
        nextRace: { slug: 'singapore-2026', name: 'Singapore Grand Prix' },
      }).getAttribute('href'),
    ).toBe('#make-picks');
  });
});
