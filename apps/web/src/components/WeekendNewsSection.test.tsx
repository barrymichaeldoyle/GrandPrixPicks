import { act } from 'react';
import type { Root } from 'react-dom/client';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// The section closes with a router `<Link>`, which needs a router context this
// test has no reason to build: the subject is the attribution row.
vi.mock('@/components/ScoringPolicyNote', () => ({
  ScoringPolicyNote: () => (
    <p>Grid penalties don’t change qualifying results.</p>
  ),
}));

const { WeekendNewsSection } = await import('./WeekendNewsSection');

(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

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

const item = {
  key: 'alonso-pit-lane-start',
  headline: 'Alonso starts from the pit lane at Monza',
  body: 'Aston Martin changed his power unit under parc ferme overnight.',
  affectsSessions: ['race'],
  sourceName: 'Formula 1',
  sourceUrl: 'https://www.formula1.com/en/latest/article/example',
};

function render(items: Parameters<typeof WeekendNewsSection>[0]['items']) {
  act(() => root.render(<WeekendNewsSection items={items} />));
}

const gridItem = {
  key: 'monza-starting-grid',
  headline: 'The Monza grid is set',
  body: 'Gasly starts his maiden pole.',
  affectsSessions: ['race'],
  sourceName: 'Formula 1',
  sourceUrl: 'https://www.formula1.com/en/latest/article/grid',
  startingGrid: [
    { position: 1, code: 'GAS', displayName: 'Pierre Gasly', team: 'Alpine' },
    {
      position: 2,
      code: 'PIA',
      displayName: 'Oscar Piastri',
      team: 'McLaren',
      note: '3-place penalty',
      newsKey: 'piastri-monza-grid-penalty',
    },
  ],
};

const penaltyItem = {
  ...item,
  key: 'piastri-monza-grid-penalty',
  headline: 'Piastri drops to sixth on the Monza grid',
};

describe('WeekendNewsSection grid links', () => {
  it('links a row note to the card that explains it', () => {
    render([gridItem, penaltyItem]);
    const link = container.querySelector('a[href^="#news-"]');
    expect(link?.getAttribute('href')).toBe('#news-piastri-monza-grid-penalty');
    // The visible text stays the caption; the label is what makes the link
    // make sense read on its own.
    expect(link?.textContent).toBe('3-place penalty');
    expect(link?.getAttribute('aria-label')).toBe(
      'Why Oscar Piastri starts P2: Piastri drops to sixth on the Monza grid',
    );
    expect(container.textContent).toContain('GAS');
    expect(container.textContent).toContain('PIA');
  });

  it('anchors the card the row points at', () => {
    render([gridItem, penaltyItem]);
    // The jump target has to exist, or the link scrolls nowhere and the reader
    // is left on a grid wondering what happened.
    expect(
      container.querySelector('#news-piastri-monza-grid-penalty'),
    ).not.toBeNull();
  });

  it('falls back to a plain note when the story is no longer there', () => {
    // A story retracted after the grid went out. A caption that reads normally
    // beats a link that scrolls to nothing.
    render([gridItem]);
    expect(container.querySelector('a[href^="#news-"]')).toBeNull();
    expect(container.textContent).toContain('3-place penalty');
  });

  it('reminds the reader that a penalty does not rewrite qualifying', () => {
    render([gridItem, penaltyItem]);
    expect(container.textContent).toContain(
      'Grid penalties don’t change qualifying results.',
    );
  });
});

describe('WeekendNewsSection source date', () => {
  it('shows when the source published the story', () => {
    render([
      { ...item, sourcePublishedAt: Date.parse('2026-09-05T09:30:00Z') },
    ]);
    const time = container.querySelector('time');
    expect(time?.textContent).toContain('5 Sept 2026');
    // The machine-readable half. A date a reader can see and a crawler cannot
    // parse is half the reason this field exists.
    expect(time?.getAttribute('datetime')).toBe('2026-09-05');
  });

  it('renders the same date whatever the viewer timezone', () => {
    // SSR writes this into HTML a cache hands to everybody, so a local date
    // would either mismatch on hydration or serve one visitor's day to the
    // next. 23:30 UTC is the hour that would slip to the 6th in Sydney and back
    // to the 5th in Los Angeles.
    render([
      { ...item, sourcePublishedAt: Date.parse('2026-09-05T23:30:00Z') },
    ]);
    expect(container.querySelector('time')?.getAttribute('datetime')).toBe(
      '2026-09-05',
    );
  });

  it('shows no date when the source carried none', () => {
    // Older items predate the field, and a source without a date line is left
    // blank rather than guessed at.
    render([item]);
    expect(container.querySelector('time')).toBeNull();
    // The attribution itself still renders.
    expect(container.textContent).toContain('Formula 1');
  });

  it('keeps the scoring reminder off a story that is not a penalty', () => {
    render([item]);
    expect(container.textContent).not.toContain(
      'Grid penalties don’t change qualifying results.',
    );
  });
});
