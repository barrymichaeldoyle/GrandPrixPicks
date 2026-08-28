import { describe, expect, it } from 'vitest';

import { groupFeedEvents } from './groupFeedEvents';

function news(id: string) {
  return { _id: id, type: 'race_news' };
}

function score(id: string, race = 'r1', session = 'race') {
  return {
    _id: id,
    type: 'score_published',
    raceId: race,
    sessionType: session,
  };
}

describe('groupFeedEvents', () => {
  it('folds a run of news into one block', () => {
    // The point of the change: two adjacent cards each repeated the eyebrow,
    // the chips and the same policy link.
    const groups = groupFeedEvents([news('a'), news('b')]);

    expect(groups).toHaveLength(1);
    expect(groups[0]).toMatchObject({ kind: 'news' });
    expect((groups[0] as { events: { _id: string }[] }).events).toHaveLength(2);
  });

  it('does not join news separated by another event', () => {
    // Adjacency is the whole rule. Joining these would lift the later item up
    // beside the earlier one and reorder the weekend.
    const groups = groupFeedEvents([news('a'), score('s'), news('b')]);

    expect(groups.map((g) => g.kind)).toEqual(['news', 'session', 'news']);
  });

  it('still keys session groups, so a split session rejoins', () => {
    // The deliberate asymmetry: scores for one session belong together
    // wherever they land, which is why they are keyed and news is not.
    const groups = groupFeedEvents([score('a'), news('n'), score('b')]);

    expect(groups.map((g) => g.kind)).toEqual(['session', 'news']);
    expect((groups[0] as { events: { _id: string }[] }).events).toHaveLength(2);
  });

  it('leaves a lone news item as its own block', () => {
    const groups = groupFeedEvents([news('a')]);
    expect(groups).toEqual([{ kind: 'news', events: [news('a')] }]);
  });

  it('keeps anything else standalone', () => {
    const groups = groupFeedEvents([{ _id: 'l', type: 'lineup_change' }]);
    expect(groups[0]).toMatchObject({ kind: 'standalone' });
  });
});
