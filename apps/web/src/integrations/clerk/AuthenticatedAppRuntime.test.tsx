import { act, type PropsWithChildren } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getWebTop5DraftStorageKey } from '@grandprixpicks/shared/picks';

const mocks = vi.hoisted(() => ({
  signedIn: false,
  identify: vi.fn(),
  capture: vi.fn(),
  reset: vi.fn(),
  submit: vi.fn().mockResolvedValue(null),
  syncProfile: vi.fn().mockResolvedValue({ isNewSignup: false }),
}));
vi.mock('@clerk/react', () => ({
  useAuth: () => ({ isLoaded: true, isSignedIn: mocks.signedIn }),
  useUser: () => ({
    isLoaded: true,
    user: mocks.signedIn ? { id: 'clerk_player' } : null,
  }),
}));
vi.mock('@/lib/analytics', () => ({
  identifyAnalyticsUser: mocks.identify,
  captureAnalyticsEvent: mocks.capture,
  resetAnalyticsUser: mocks.reset,
}));
vi.mock('@sentry/tanstackstart-react', () => ({ setUser: vi.fn() }));
vi.mock('./provider', () => ({
  AppClerkProvider: ({ children }: PropsWithChildren) => children,
}));
vi.mock('@/integrations/convex/provider', () => ({
  AppConvexProvider: ({ children }: PropsWithChildren) => children,
}));
vi.mock('@/components/PushRegistrationSync', () => ({
  PushRegistrationSync: () => null,
}));
vi.mock(
  '@/components/UpcomingPredictionBanner/UpcomingPredictionBanner',
  () => ({ UpcomingPredictionBanner: () => null }),
);
vi.mock('@/integrations/clerk/auth-curtain', () => ({
  useAuthCurtainGate: vi.fn(),
}));
vi.mock('@tanstack/react-router', () => ({ useNavigate: () => vi.fn() }));
vi.mock('convex/react', () => ({
  useConvexAuth: () => ({ isAuthenticated: mocks.signedIn }),
  useMutation: (name: string) =>
    name === 'syncProfile' ? mocks.syncProfile : mocks.submit,
}));
vi.mock('@convex-generated/api', () => ({
  api: {
    users: { syncProfile: 'syncProfile' },
    predictions: { submitPrediction: 'submitPrediction' },
    h2h: { submitH2HPredictions: 'submitH2HPredictions' },
  },
}));

import { PendingPickSubmitter } from '@/components/PendingPickSubmitter';
import { AuthenticatedAppRuntime } from './AuthenticatedAppRuntime';

describe('authenticated runtime analytics ordering', () => {
  let root: Root;
  let container: HTMLDivElement;

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.signedIn = false;
    window.localStorage.clear();
    window.sessionStorage.clear();
    container = document.createElement('div');
    root = createRoot(container);
  });

  afterEach(() => act(() => root.unmount()));

  it('identifies the player before the landing auth and saved events', async () => {
    const key = getWebTop5DraftStorageKey('race_1');
    window.localStorage.setItem(
      key,
      JSON.stringify({ picks: ['d1', 'd2', 'd3', 'd4', 'd5'] }),
    );
    window.sessionStorage.setItem(`${key}:pending-submit`, 'landing');
    await act(async () =>
      root.render(
        <AuthenticatedAppRuntime>
          <PendingPickSubmitter />
        </AuthenticatedAppRuntime>,
      ),
    );
    expect(mocks.capture).not.toHaveBeenCalled();

    mocks.signedIn = true;
    await act(async () =>
      root.render(
        <AuthenticatedAppRuntime>
          <PendingPickSubmitter />
        </AuthenticatedAppRuntime>,
      ),
    );

    expect(mocks.identify).toHaveBeenCalledWith(
      'clerk_player',
      expect.any(Object),
    );
    const authIndex = mocks.capture.mock.calls.findIndex(
      ([name]) => name === 'landing_auth_completed',
    );
    const saveIndex = mocks.capture.mock.calls.findIndex(
      ([name]) => name === 'landing_prediction_saved',
    );
    expect(authIndex).toBeGreaterThanOrEqual(0);
    expect(saveIndex).toBeGreaterThan(authIndex);
    expect(mocks.identify.mock.invocationCallOrder[0]).toBeLessThan(
      mocks.capture.mock.invocationCallOrder[authIndex],
    );
    expect(mocks.capture).toHaveBeenCalledWith(
      'prediction_saved',
      expect.objectContaining({ source: 'landing', after_sign_in: true }),
    );
    expect(window.localStorage.getItem(key)).toBeNull();
  });
});
