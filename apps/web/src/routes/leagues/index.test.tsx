import { act } from 'react';
import type { Root } from 'react-dom/client';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

const viewerSession = {
  isSignedIn: false,
  isLoaded: false,
  confirmedSignedIn: false,
};

vi.mock('@tanstack/react-router', () => ({
  createFileRoute: () => (options: unknown) => options,
  Link: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
}));

// Every Convex subscription is unresolved, as during SSR.
vi.mock('convex/react', () => ({ useQuery: () => undefined }));

vi.mock('@convex-generated/api', () => ({
  api: {
    leagues: {
      getMyLeagues: 'leagues:getMyLeagues',
      getMyLeagueUsage: 'leagues:getMyLeagueUsage',
      listPublicLeagues: 'leagues:listPublicLeagues',
    },
    // Feeds the signed-in rail's ProfileCard; skipped for the signed-out
    // visitors this file covers, but the module still reads the reference.
    users: { me: 'users:me' },
  },
}));

vi.mock('@/integrations/clerk/useViewerSession', () => ({
  useViewerSession: () => viewerSession,
}));

vi.mock('@/integrations/clerk/sign-in-button', () => ({
  AppSignInButton: ({ children }: { children?: React.ReactNode }) => (
    <>{children}</>
  ),
}));

const { Route } = await import('./index');

const LeaguesPage = (Route as unknown as { component: () => React.ReactNode })
  .component;

describe('leagues page for signed-out visitors', () => {
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

  it('renders real content instead of a loading skeleton before Clerk resolves', () => {
    act(() => {
      root.render(<LeaguesPage />);
    });

    const text = container.textContent ?? '';

    // Gating the route on Clerk's isLoaded served crawlers and first-time
    // visitors a skeleton, which was the only version of this page Google saw.
    expect(text).not.toContain('Loading leagues');
    expect(text).toContain('How F1 prediction leagues work');
    expect(text).toContain('Private leagues');
    expect(text).toContain('Public leagues');
    expect(text).toContain('Sign in to manage your leagues');
  });

  it('gives the page enough durable copy to be worth indexing', () => {
    act(() => {
      root.render(<LeaguesPage />);
    });

    const words = (container.textContent ?? '').trim().split(/\s+/).length;
    expect(words).toBeGreaterThan(120);
  });
});
