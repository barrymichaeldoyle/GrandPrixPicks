import { groupFeedEvents } from '@grandprixpicks/shared/feedGroups';
import { describe, expect, it } from 'vitest';

import { feedGroupKey, reuseFeedGroups } from './feedGroupIdentity';

function score(id: string, raceId: string, sessionType: string) {
  return { _id: id, type: 'score_published', raceId, sessionType };
}
function news(id: string, raceId?: string) {
  return { _id: id, type: 'race_news', raceId };
}
function joined(id: string) {
  return { _id: id, type: 'joined_league' };
}

describe('reuseFeedGroups', () => {
  it('returns the previous array when nothing changed', () => {
    const events = [score('s1', 'r1', 'race'), news('n1', 'r1'), joined('j1')];
    const previous = groupFeedEvents(events);
    const next = groupFeedEvents(events);
    expect(reuseFeedGroups(previous, next)).toBe(previous);
  });

  it('keeps old block objects when a page is appended', () => {
    const page0 = [score('s1', 'r1', 'race'), news('n1', 'r1'), joined('j1')];
    const previous = groupFeedEvents(page0);
    const next = groupFeedEvents([...page0, joined('j2'), news('n2', 'r0')]);
    const merged = reuseFeedGroups(previous, next);
    expect(merged).not.toBe(previous);
    expect(merged.slice(0, 3)).toEqual(previous);
    expect(merged[0]).toBe(previous[0]);
    expect(merged[1]).toBe(previous[1]);
    expect(merged[2]).toBe(previous[2]);
    expect(merged.map(feedGroupKey)).toEqual([
      'r1_race',
      'news-n1',
      'j1',
      'j2',
      'news-n2',
    ]);
  });

  it('replaces only the block whose event object changed', () => {
    const s1 = score('s1', 'r1', 'race');
    const j1 = joined('j1');
    const previous = groupFeedEvents([s1, j1]);
    const updated = { ...s1, points: 12 };
    const merged = reuseFeedGroups(previous, groupFeedEvents([updated, j1]));
    expect(merged[0]).not.toBe(previous[0]);
    expect(merged[1]).toBe(previous[1]);
  });

  it('replaces a session block that gained an event', () => {
    const previous = groupFeedEvents([score('s1', 'r1', 'race')]);
    const next = groupFeedEvents([
      score('s1', 'r1', 'race'),
      score('s2', 'r1', 'race'),
    ]);
    const merged = reuseFeedGroups(previous, next);
    expect(merged[0]).toBe(next[0]);
  });

  it('does not reuse across kinds with a colliding key', () => {
    const previous = groupFeedEvents([joined('x')]);
    const next = groupFeedEvents([news('x')]);
    expect(reuseFeedGroups(previous, next)[0]).toBe(next[0]);
  });
});
