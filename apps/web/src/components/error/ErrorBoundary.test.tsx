import { act } from 'react';
import type { ComponentProps } from 'react';
import type { Root } from 'react-dom/client';
import { createRoot } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('./ErrorFallback', () => ({
  ErrorFallback: ({ error }: { error: unknown }) => (
    <div data-testid="default-fallback">{String((error as Error).message)}</div>
  ),
}));

import { ErrorBoundary } from './ErrorBoundary';

(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

function ThrowError(): never {
  throw new Error('boom');
}

function renderBoundary(
  props: Pick<ComponentProps<typeof ErrorBoundary>, 'fallback'> = {},
) {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root: Root = createRoot(container);
  const consoleError = vi
    .spyOn(console, 'error')
    .mockImplementation(() => undefined);

  act(() => {
    root.render(
      <ErrorBoundary {...props}>
        <ThrowError />
      </ErrorBoundary>,
    );
  });

  return {
    container,
    unmount: () => {
      consoleError.mockRestore();
      act(() => {
        root.unmount();
      });
      container.remove();
    },
  };
}

describe('ErrorBoundary', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    document.body.innerHTML = '';
  });

  it('renders the default fallback when no override is provided', () => {
    const { container, unmount } = renderBoundary();

    expect(
      container.querySelector('[data-testid="default-fallback"]'),
    ).not.toBeNull();
    expect(container.textContent).toContain('boom');

    unmount();
  });

  it('renders nothing when the fallback override is null', () => {
    const { container, unmount } = renderBoundary({ fallback: null });

    expect(container.innerHTML).toBe('');

    unmount();
  });

  it('renders a custom fallback override', () => {
    const { container, unmount } = renderBoundary({
      fallback: ({ error }) => (
        <div data-testid="custom-fallback">
          {String((error as Error).message)}
        </div>
      ),
    });

    expect(
      container.querySelector('[data-testid="custom-fallback"]'),
    ).not.toBeNull();
    expect(container.textContent).toContain('boom');

    unmount();
  });
});
