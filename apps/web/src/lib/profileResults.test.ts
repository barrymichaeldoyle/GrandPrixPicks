import { describe, expect, it } from 'vitest';
import type { FeedEvent } from '@/components/FeedItem/types';
import { groupProfileResults } from './profileResults';

function score(id: string, props: Partial<FeedEvent> = {}): FeedEvent {
  return {
    _id: id as FeedEvent['_id'],
    type: 'score_published',
    raceSlug: 'usa-2026',
    raceName: 'United States Grand Prix',
    sessionType: 'race',
    createdAt: 1,
    points: 10,
    ...props,
  };
}

describe('profile weekend results', () => {
  it('uses the latest amended score once and includes H2H points', () => {
    const original = score('original');
    const amendment = score('amended', {
      type: 'results_amended',
      createdAt: 3,
      points: 15,
      h2hScore: { correctPicks: 7, totalPicks: 11, points: 7 },
    });
    const qualifying = score('qualifying', {
      sessionType: 'quali',
      createdAt: 0,
      points: 5,
    });
    const input = [original, amendment, qualifying];
    const [weekend] = groupProfileResults(input);
    expect(weekend.events.map((event) => event._id)).toEqual([
      'amended',
      'qualifying',
    ]);
    expect(weekend.combinedPoints).toBe(27);
    expect(input).toEqual([original, amendment, qualifying]);
  });

  it('prefers an amendment at the same timestamp and keeps other weekends separate', () => {
    const groups = groupProfileResults([
      score('original'),
      score('amended', { type: 'results_amended', points: 0 }),
      score('older', { raceSlug: 'singapore-2026', createdAt: 0 }),
      score('locked', { type: 'session_locked', raceSlug: 'mexico-2026' }),
    ]);
    expect(groups).toHaveLength(2);
    expect(groups[0].combinedPoints).toBe(0);
    expect(groups[0].events[0]._id).toBe('amended');
  });
});
