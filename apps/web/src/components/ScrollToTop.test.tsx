import { act } from 'react';
import type { Root } from 'react-dom/client';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ScrollToTop } from './ScrollToTop';

const locationState = vi.hoisted(() => ({ pathname: '/' }));

vi.mock('@tanstack/react-router', () => ({
  useLocation: () => ({ pathname: locationState.pathname }),
}));

(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

describe('ScrollToTop', () => {
  let container: HTMLDivElement;
  let root: Root;
  let scrollToSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    locationState.pathname = '/';
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    scrollToSpy = vi
      .spyOn(window, 'scrollTo')
      .mockImplementation(() => undefined);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    scrollToSpy.mockRestore();
  });

  it('scrolls for route changes but not for an initial shell mount', () => {
    act(() => root.render(<ScrollToTop />));
    expect(scrollToSpy).not.toHaveBeenCalled();

    locationState.pathname = '/races';
    act(() => root.render(<ScrollToTop />));

    expect(scrollToSpy).toHaveBeenCalledOnce();
    expect(scrollToSpy).toHaveBeenCalledWith({
      top: 0,
      left: 0,
      behavior: 'instant',
    });
  });

  it('does not scroll when the shell remounts at the same location', () => {
    act(() => root.render(<ScrollToTop />));
    act(() => root.unmount());

    root = createRoot(container);
    act(() => root.render(<ScrollToTop />));

    expect(scrollToSpy).not.toHaveBeenCalled();
  });
});
