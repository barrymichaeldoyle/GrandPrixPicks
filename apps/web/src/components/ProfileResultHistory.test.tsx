import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { expect, it, vi } from 'vitest';
import type { FeedEvent } from './FeedItem/types';
import { ProfileResultHistory } from './ProfileResultHistory';

vi.mock('./FeedItem/ScorePublishedItem', () => ({
  ScorePublishedItem: ({
    event,
    hideIdentity,
  }: {
    event: FeedEvent;
    hideIdentity?: boolean;
  }) => (
    <div data-session-result={event._id}>
      {hideIdentity ? 'Session picks' : event.username}
    </div>
  ),
}));

it('reveals older weekends and mounts session details only when expanded', async () => {
  const events = Array.from({ length: 5 }, (_, index): FeedEvent => ({
    _id: `event-${index}` as FeedEvent['_id'],
    type: 'score_published',
    raceSlug: `race-${index}`,
    raceName: `Race ${index}`,
    sessionType: 'race',
    points: 5,
    createdAt: 10 - index,
  }));
  const container = document.createElement('div');
  document.body.append(container);
  const root = createRoot(container);
  try {
    act(() => root.render(<ProfileResultHistory events={events} />));
    expect(container.querySelectorAll('details')).toHaveLength(3);
    expect(container.querySelector('[data-session-result]')).toBeNull();
    const details = container.querySelector('details')!;
    await act(async () => {
      details.open = true;
      details.dispatchEvent(new Event('toggle'));
    });
    expect(container.querySelectorAll('[data-session-result]')).toHaveLength(1);
    act(() => container.querySelector<HTMLButtonElement>('button')!.click());
    expect(container.querySelectorAll('details')).toHaveLength(5);
    expect(container.querySelector('button')).toBeNull();
    expect(details.open).toBe(true);
  } finally {
    act(() => root.unmount());
    container.remove();
  }
});
