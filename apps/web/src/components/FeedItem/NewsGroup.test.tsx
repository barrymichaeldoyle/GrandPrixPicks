import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { NewsGroup } from './NewsGroup';
import type { FeedEvent } from './types';

const base = {
  raceName: 'Azerbaijan Grand Prix',
  raceSlug: 'azerbaijan-2026',
  createdAt: Date.UTC(2026, 8, 25),
};

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
