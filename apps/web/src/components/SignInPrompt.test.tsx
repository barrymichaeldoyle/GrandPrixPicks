import { act } from 'react';
import type { Root } from 'react-dom/client';
import { createRoot } from 'react-dom/client';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('@tanstack/react-router', () => ({
  Link: ({
    children,
    to,
    params,
    ...props
  }: React.AnchorHTMLAttributes<HTMLAnchorElement> & {
    to?: string;
    params?: Record<string, string>;
  }) => (
    <a href={to} data-params={JSON.stringify(params ?? {})} {...props}>
      {children}
    </a>
  ),
}));

const requestSignIn = vi.fn();
vi.mock('@/integrations/clerk/runtime-control', () => ({
  useClerkRuntimeControl: () => ({ requestSignIn, signInPending: false }),
  useClerkWarmHandlers: () => ({}),
}));

const { SignInPrompt } = await import('./SignInPrompt');

(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

let container: HTMLDivElement | null = null;
let root: Root | null = null;

function render(ui: React.ReactNode) {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => {
    root?.render(ui);
  });
  return container;
}

afterEach(() => {
  act(() => {
    root?.unmount();
  });
  container?.remove();
  container = null;
  root = null;
  requestSignIn.mockClear();
});

const prompt = (
  <SignInPrompt
    title="Your notifications"
    description="Everything that happened while you were away."
    actionLabel="Sign in to see your notifications"
  />
);

describe('SignInPrompt', () => {
  // The whole point of this component: the gated pages used to server-render a
  // spinner and only paint the sign-in card after Clerk booted. It must render
  // with no browser and no Clerk.
  it('server-renders its copy without a Clerk runtime', () => {
    const html = renderToStaticMarkup(prompt);
    expect(html).toContain('Your notifications');
    expect(html).toContain('Everything that happened while you were away.');
    expect(html).toContain('Sign in to see your notifications');
  });

  it('renders the page heading as an h1', () => {
    expect(render(prompt).querySelector('h1')?.textContent).toBe(
      'Your notifications',
    );
  });

  // A gated URL is often a first touch from a shared link, so it must not be a
  // dead end for someone without an account.
  it('offers public pages to a visitor who will not sign in', () => {
    const hrefs = Array.from(render(prompt).querySelectorAll('nav a')).map(
      (anchor) => anchor.getAttribute('href'),
    );
    expect(hrefs).toContain('/how-to-play');
    expect(hrefs).toContain('/races');
    expect(hrefs).toContain('/leaderboard');
  });

  // Goes through the runtime control rather than Clerk's SignInButton so the
  // page stays on its own URL and Clerk is never imported until it is wanted.
  it('opens sign-in through the runtime control', () => {
    render(prompt).querySelector('button')?.click();
    expect(requestSignIn).toHaveBeenCalledTimes(1);
  });
});
