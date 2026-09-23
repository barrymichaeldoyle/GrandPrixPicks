import { act } from 'react';
import type { Root } from 'react-dom/client';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { TrmnlFeedback } from './TrmnlFeedback';

(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

const submitRequest = vi.fn(async () => ({ success: true }));
const requestSignIn = vi.fn();
const auth = { isAuthenticated: false };

vi.mock('@convex-generated/api', () => ({
  api: { support: { submitRequest: 'submitRequest' } },
}));

vi.mock('convex/react', () => ({
  useMutation: () => submitRequest,
  useConvexAuth: () => ({ isAuthenticated: auth.isAuthenticated }),
}));

vi.mock('@/integrations/clerk/runtime-control', () => ({
  useClerkRuntimeControl: () => ({ requestSignIn, signInPending: false }),
  useClerkWarmHandlers: () => ({}),
}));

vi.mock('@/lib/analytics', () => ({
  captureAnalyticsEvent: vi.fn(),
}));

describe('TRMNL feedback', () => {
  let container: HTMLDivElement | null = null;
  let root: Root | null = null;

  beforeEach(() => {
    submitRequest.mockClear();
    requestSignIn.mockClear();
    auth.isAuthenticated = false;
  });

  afterEach(() => {
    act(() => root?.unmount());
    container?.remove();
    container = null;
    root = null;
  });

  function render() {
    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);
    act(() => root!.render(<TrmnlFeedback />));
  }

  function type(text: string) {
    const textarea = container!.querySelector('textarea')!;
    const setter = Object.getOwnPropertyDescriptor(
      HTMLTextAreaElement.prototype,
      'value',
    )!.set!;
    act(() => {
      setter.call(textarea, text);
      textarea.dispatchEvent(new Event('input', { bubbles: true }));
    });
  }

  async function submit() {
    await act(async () => {
      container!
        .querySelector('form')!
        .dispatchEvent(
          new Event('submit', { bubbles: true, cancelable: true }),
        );
    });
  }

  it('sends as TRMNL feedback when signed in', async () => {
    auth.isAuthenticated = true;
    render();
    type('Show the sprint grid too');
    await submit();

    expect(submitRequest).toHaveBeenCalledWith({
      message: 'Show the sprint grid too',
      category: 'trmnl',
    });
    expect(container!.textContent).toContain('Sent. Thanks.');
  });

  it('asks a signed-out visitor to sign in, then sends once they have', async () => {
    render();
    expect(container!.textContent).toContain('Sign in and send');
    type('Bigger flags please');
    await submit();

    expect(requestSignIn).toHaveBeenCalledTimes(1);
    expect(submitRequest).not.toHaveBeenCalled();

    auth.isAuthenticated = true;
    await act(async () => root!.render(<TrmnlFeedback />));

    expect(submitRequest).toHaveBeenCalledTimes(1);
    expect(submitRequest).toHaveBeenCalledWith({
      message: 'Bigger flags please',
      category: 'trmnl',
    });
  });

  it('sends nothing after sign-in if send was never pressed', async () => {
    render();
    type('Just a draft');
    auth.isAuthenticated = true;
    await act(async () => root!.render(<TrmnlFeedback />));

    expect(submitRequest).not.toHaveBeenCalled();
  });
});
