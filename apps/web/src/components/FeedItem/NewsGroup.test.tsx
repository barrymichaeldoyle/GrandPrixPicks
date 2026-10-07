import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

// The scoring note is a router `<Link>`, which needs a router context this
// test has no reason to build: the subject is the run itself.
vi.mock('@/components/ScoringPolicyNote', () => ({
  ScoringPolicyNote: () => (
    <p>Grid penalties don’t change qualifying results.</p>
  ),
}));

const { NewsGroup } = await import('./NewsGroup');
type FeedEvent = import('./types').FeedEvent;

const base = {
  raceName: 'Azerbaijan Grand Prix',
  raceSlug: 'azerbaijan-2026',
  createdAt: Date.UTC(2026, 8, 25),
};

function story(index: number): FeedEvent {
  return {
    ...base,
    _id: `story-${index}` as FeedEvent['_id'],
    type: 'race_news',
    newsKey: `story-${index}`,
    newsHeadline: `Story ${index}`,
    newsBody: `Body ${index}`,
  } as FeedEvent;
}

const gridCard = {
  ...base,
  _id: 'grid' as FeedEvent['_id'],
  type: 'race_news' as const,
  newsKey: 'baku-grid',
  newsHeadline: 'The Baku grid is set',
  newsStartingGrid: [
    {
      position: 1,
      code: 'VER',
      displayName: 'Max Verstappen',
      team: 'Red Bull Racing',
    },
    {
      position: 2,
      code: 'PIA',
      displayName: 'Oscar Piastri',
      team: 'McLaren',
      note: '3-place penalty',
      newsKey: 'piastri-penalty',
    },
  ],
} as FeedEvent;

describe('NewsGroup', () => {
  it('keeps a grid change and weekend story under one heading', () => {
    const events = [
      {
        ...base,
        _id: 'lineup' as FeedEvent['_id'],
        type: 'lineup_change' as const,
        seatMoves: [
          {
            team: 'Red Bull Racing',
            inDriverCode: 'HAD',
            inDriverName: 'Isack Hadjar',
          },
        ],
      },
      {
        ...base,
        _id: 'story' as FeedEvent['_id'],
        type: 'race_news' as const,
        newsKey: 'hadjar-returns',
        newsHeadline: 'Hadjar returns at Baku',
      },
    ];

    const html = renderToStaticMarkup(<NewsGroup events={events} />);
    expect(html).toContain('aria-label="Weekend news, Azerbaijan Grand Prix"');
    expect(html).toContain('New line-up from the Azerbaijan Grand Prix');
    expect(html).toContain('Hadjar returns at Baku');
    expect(html).not.toContain('Grid change');
  });
});

describe('NewsGroup fold', () => {
  const many = Array.from({ length: 9 }, (_, index) => story(index));

  function render(events: FeedEvent[], pinned?: ReadonlySet<string>) {
    const html = renderToStaticMarkup(
      <NewsGroup events={events} pinnedNewsKeys={pinned} />,
    );
    const doc = new DOMParser().parseFromString(html, 'text/html');
    return { html, doc };
  }

  function folded(doc: Document) {
    return [...doc.querySelectorAll('details [id^="feed-news-"]')].map(
      (card) => card.id,
    );
  }

  it('shows the newest six and folds the rest', () => {
    const { doc } = render(many);
    expect(folded(doc)).toEqual([
      'feed-news-story-6',
      'feed-news-story-7',
      'feed-news-story-8',
    ]);
    expect(doc.querySelector('summary')?.textContent).toContain(
      '3 earlier stories',
    );
    // Folded, not dropped.
    expect(doc.body.textContent).toContain('Story 8');
  });

  it('draws no fold when everything fits', () => {
    const { doc } = render(many.slice(0, 6));
    expect(doc.querySelector('details')).toBeNull();
  });

  it('keeps a grid, and the card a grid row links to, out of the fold', () => {
    const { doc } = render(
      [...many, gridCard, { ...story(9), newsKey: 'piastri-penalty' }],
      new Set(['piastri-penalty']),
    );
    expect(folded(doc)).not.toContain('feed-news-baku-grid');
    expect(folded(doc)).not.toContain('feed-news-piastri-penalty');
    expect(folded(doc)).toContain('feed-news-story-8');
  });

  it('folds a story behind its headline on a phone until it is tapped', () => {
    const { doc } = render([story(0)]);
    const toggle = doc.querySelector('#feed-news-story-0 button');
    expect(toggle?.getAttribute('aria-expanded')).toBe('false');
    const body = doc.querySelector('#feed-news-story-0 p + div');
    expect(body?.className).toContain('max-sm:hidden');
    // The story is still in the HTML.
    expect(body?.textContent).toContain('Body 0');
  });

  it('never folds a grid, or the card a grid row links to', () => {
    const { doc } = render(
      [gridCard, { ...story(0), newsKey: 'piastri-penalty' }],
      new Set(['piastri-penalty']),
    );
    expect(doc.querySelector('#feed-news-baku-grid button')).toBeNull();
    expect(doc.querySelector('#feed-news-piastri-penalty button')).toBeNull();
  });
});
