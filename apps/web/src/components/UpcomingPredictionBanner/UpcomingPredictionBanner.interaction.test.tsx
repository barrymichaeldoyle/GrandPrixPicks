import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({ complete: false }));
vi.mock('@clerk/react', () => ({
  useAuth: () => ({ isLoaded: true, isSignedIn: true }),
}));
vi.mock('@tanstack/react-router', () => ({
  useLocation: () => '/leaderboard',
}));
vi.mock('@convex-generated/api', () => ({
  api: {
    races: { getNextRace: 'race', getPredictionOpenAt: 'open' },
    predictions: { myWeekendPredictions: 'top5' },
    h2h: { myH2HPredictionsForRace: 'h2h' },
    users: { me: 'viewer' },
  },
}));
vi.mock('@/integrations/convex/query', () => ({
  useQuery: (query: string) => {
    if (query === 'race') {
      return {
        _id: 'race',
        slug: 'miami-2026',
        name: 'Miami Grand Prix',
        status: 'upcoming',
        predictionLockAt: Number.MAX_SAFE_INTEGER,
      };
    }
    if (query === 'open') {
      return 0;
    }
    if (query === 'top5') {
      return {
        predictions: state.complete
          ? { quali: ['driver'], race: ['driver'] }
          : {},
      };
    }
    if (query === 'h2h') {
      return state.complete ? { quali: {}, race: {} } : {};
    }
    return undefined;
  },
}));
vi.mock('@/hooks/useUpcomingPredictionBannerDismissal', () => ({
  useUpcomingPredictionBannerDismissal: () => ({
    dismissed: false,
    dismiss: vi.fn(),
  }),
}));
vi.mock('./UpcomingPicksModal', () => ({
  UpcomingPicksModal: ({ onClose }: { onClose: () => void }) => (
    <div role="dialog">
      <button onClick={onClose}>Close picker</button>
    </div>
  ),
}));

import { UpcomingPredictionBanner } from './UpcomingPredictionBanner';

let container: HTMLDivElement;
let root: Root;
beforeEach(() => {
  state.complete = false;
  container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
});
afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
});

async function render() {
  await act(async () => root.render(<UpcomingPredictionBanner />));
}
async function click(selector: string) {
  await act(async () => {
    (container.querySelector(selector) as HTMLButtonElement).click();
  });
}

describe('banner picker entry', () => {
  it('opens in place and can be closed and reopened', async () => {
    await render();
    expect(container.querySelector('a')).toBeNull();
    await click('[aria-haspopup="dialog"]');
    expect(container.querySelector('[role="dialog"]')).not.toBeNull();
    await click('[role="dialog"] button');
    expect(container.querySelector('[role="dialog"]')).toBeNull();
    await click('[aria-haspopup="dialog"]');
    expect(container.querySelector('[role="dialog"]')).not.toBeNull();
  });

  it('keeps the active picker mounted when saved picks remove the nudge', async () => {
    await render();
    await click('[aria-haspopup="dialog"]');
    state.complete = true;
    await render();
    expect(container.querySelector('[aria-haspopup="dialog"]')).toBeNull();
    expect(container.querySelector('[role="dialog"]')).not.toBeNull();
    await click('[role="dialog"] button');
    expect(container.textContent).toBe('');
  });
});
