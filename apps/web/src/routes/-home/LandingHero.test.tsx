import { colors } from '@grandprixpicks/shared/tokens';
import { act } from 'react';
import type { MouseEventHandler, ReactNode } from 'react';
import type { Root } from 'react-dom/client';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { TEAM_COLORS } from '@/lib/teamColors';

import { inkForFill, LandingHero, splitRaceName } from './LandingHero';

vi.mock('@tanstack/react-router', () => ({
  Link: ({
    children,
    to,
    hash,
    className,
    onClick,
  }: {
    children?: ReactNode;
    to: string;
    hash?: string;
    className?: string;
    onClick?: MouseEventHandler<HTMLAnchorElement>;
  }) => (
    <a
      href={hash ? `${to}#${hash}` : to}
      className={className}
      onClick={onClick}
    >
      {children}
    </a>
  ),
}));

vi.mock('@/lib/analytics', () => ({ captureAnalyticsEvent: () => {} }));

const race = {
  name: 'Bahrain Grand Prix',
  slug: 'bahrain-2026',
  round: 16,
  fp1StartAt: Date.UTC(2026, 9, 2, 3, 30),
  fp2StartAt: Date.UTC(2026, 9, 2, 7, 0),
  fp3StartAt: Date.UTC(2026, 9, 3, 3, 30),
  qualiStartAt: Date.UTC(2026, 9, 3, 7, 0),
  raceStartAt: Date.UTC(2026, 9, 4, 7, 0),
};

describe('splitRaceName', () => {
  it('sets the place apart from "Grand Prix"', () => {
    expect(splitRaceName('Las Vegas Grand Prix')).toEqual([
      'Las Vegas',
      'Grand Prix',
    ]);
    expect(splitRaceName('Mexico City Grand Prix')).toEqual([
      'Mexico City',
      'Grand Prix',
    ]);
  });

  it('leaves a name without the suffix whole', () => {
    expect(splitRaceName('Formula 1 Test')).toEqual(['Formula 1 Test', null]);
  });
});

describe('inkForFill', () => {
  it('puts near-black on light team colours and near-white on dark ones', () => {
    expect(inkForFill(TEAM_COLORS.Mercedes!)).toBe(colors.textOnAccent);
    expect(inkForFill(TEAM_COLORS.McLaren!)).toBe(colors.textOnAccent);
    expect(inkForFill(TEAM_COLORS.Williams!)).toBe(colors.text);
  });
});

describe('LandingHero', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  function render(props: Partial<Parameters<typeof LandingHero>[0]> = {}) {
    act(() =>
      root.render(
        <LandingHero
          race={race}
          lockSession={{ label: 'Qualifying', startAt: race.qualiStartAt }}
          now={race.qualiStartAt - (2 * 24 + 5) * 60 * 60_000}
          weather={null}
          news={{
            total: 18,
            items: [
              {
                key: 'colapinto-sepang-grid-penalty',
                headline: 'Colapinto drops 15 places on the Sepang grid',
                sourceName: 'Formula 1',
                driverCodes: ['COL'],
                team: 'Alpine',
              },
              {
                key: 'pirelli-sepang-compounds',
                headline: 'Pirelli brings its hardest compounds',
                sourceName: 'Pirelli',
                driverCodes: [],
                team: null,
              },
            ],
          }}
          cta={<a href="#landing-picks">Make your picks</a>}
          {...props}
        />,
      ),
    );
  }

  it('reads as one sentence naming the race', () => {
    render();
    expect(container.querySelector('h1')?.textContent).toBe(
      'Predict the F1 Top 5 at the Bahrain Grand Prix',
    );
  });

  it('announces the deadline in words', () => {
    render();
    expect(container.textContent).toContain(
      'Qualifying picks lock in 2 days, 5 hours, 0 minutes, at Sat ',
    );
  });

  it('marks the next session to lock and the others that take picks', () => {
    render();
    const sessions = [...container.querySelectorAll('li.gpp-hero-session')];
    expect(sessions).toHaveLength(5);
    const quali = sessions.find((li) => li.textContent?.includes('Qualifying'));
    const grandPrix = sessions.find((li) =>
      li.textContent?.includes('Grand Prix'),
    );
    expect(quali?.textContent).toContain('Next lock');
    expect(grandPrix?.textContent).toContain('Picks');
  });

  it('links each headline to its card on the write-up, in its team colour', () => {
    render();
    const story = container.querySelector(
      'a[href="/f1-2026-bahrain-grand-prix-predictions#news-colapinto-sepang-grid-penalty"]',
    );
    expect(story?.textContent).toContain('Colapinto drops 15 places');
    expect(story?.className).toContain('gpp-hero-band-team');
    expect(
      container.querySelector(
        'a[href="/f1-2026-bahrain-grand-prix-predictions#news-pirelli-sepang-compounds"]',
      )?.className,
    ).not.toContain('gpp-hero-band-team');
    expect(
      container.querySelector(
        'a[href="/f1-2026-bahrain-grand-prix-predictions#weekend-news"]',
      )?.textContent,
    ).toBe('All 18 stories');
  });

  it('shows no news for a race without a write-up to link into', () => {
    render({ race: { ...race, slug: 'no-such-race' } });
    expect(container.textContent).not.toContain('Colapinto');
  });

  it('falls back to the product line between seasons', () => {
    render({ race: null, lockSession: null, news: null });
    expect(container.querySelector('h1')?.textContent).toBe(
      'Predict the F1 Top 5',
    );
  });
});
