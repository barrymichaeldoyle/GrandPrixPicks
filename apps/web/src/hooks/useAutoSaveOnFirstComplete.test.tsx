import { act } from 'react';
import type { Root } from 'react-dom/client';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useAutoSaveOnFirstComplete } from './useAutoSaveOnFirstComplete';

(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

type HookProps = {
  enabled: boolean;
  complete: boolean;
  picksSignature: string;
  save: () => void;
};

const DELAY_MS = 1000;

function renderHook(initial: HookProps) {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root: Root = createRoot(container);
  let latest: ReturnType<typeof useAutoSaveOnFirstComplete> | null = null;

  function TestHarness(props: HookProps) {
    latest = useAutoSaveOnFirstComplete({ ...props, delayMs: DELAY_MS });
    return null;
  }

  act(() => {
    root.render(<TestHarness {...initial} />);
  });

  return {
    getLatest: () => {
      if (!latest) {
        throw new Error('hook not rendered');
      }
      return latest;
    },
    rerender: (props: HookProps) => {
      act(() => {
        root.render(<TestHarness {...props} />);
      });
    },
    unmount: () => {
      act(() => {
        root.unmount();
      });
      container.remove();
    },
  };
}

describe('useAutoSaveOnFirstComplete', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('saves once after the delay when completed via interaction', () => {
    const save = vi.fn();
    const harness = renderHook({
      enabled: true,
      complete: false,
      picksSignature: 'a',
      save,
    });

    act(() => {
      harness.getLatest().markInteraction();
    });
    harness.rerender({
      enabled: true,
      complete: true,
      picksSignature: 'a,b',
      save,
    });

    act(() => {
      vi.advanceTimersByTime(DELAY_MS - 1);
    });
    expect(save).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(save).toHaveBeenCalledTimes(1);
    harness.unmount();
  });

  it('never fires without user interaction (restored complete draft)', () => {
    const save = vi.fn();
    const harness = renderHook({
      enabled: true,
      complete: true,
      picksSignature: 'a,b',
      save,
    });

    act(() => {
      vi.advanceTimersByTime(DELAY_MS * 5);
    });
    expect(save).not.toHaveBeenCalled();
    harness.unmount();
  });

  it('re-arms the timer when the picks change before it fires', () => {
    const save = vi.fn();
    const harness = renderHook({
      enabled: true,
      complete: false,
      picksSignature: 'a',
      save,
    });
    act(() => {
      harness.getLatest().markInteraction();
    });

    harness.rerender({
      enabled: true,
      complete: true,
      picksSignature: 'a,b',
      save,
    });
    act(() => {
      vi.advanceTimersByTime(DELAY_MS - 100);
    });
    // Reorder just before the timer fires — full delay should restart.
    harness.rerender({
      enabled: true,
      complete: true,
      picksSignature: 'b,a',
      save,
    });
    act(() => {
      vi.advanceTimersByTime(DELAY_MS - 100);
    });
    expect(save).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(100);
    });
    expect(save).toHaveBeenCalledTimes(1);
    harness.unmount();
  });

  it('cancels when the picks become incomplete', () => {
    const save = vi.fn();
    const harness = renderHook({
      enabled: true,
      complete: false,
      picksSignature: 'a',
      save,
    });
    act(() => {
      harness.getLatest().markInteraction();
    });

    harness.rerender({
      enabled: true,
      complete: true,
      picksSignature: 'a,b',
      save,
    });
    harness.rerender({
      enabled: true,
      complete: false,
      picksSignature: 'a',
      save,
    });
    act(() => {
      vi.advanceTimersByTime(DELAY_MS * 2);
    });
    expect(save).not.toHaveBeenCalled();
    harness.unmount();
  });

  it('fires at most once per mount', () => {
    const save = vi.fn();
    const harness = renderHook({
      enabled: true,
      complete: false,
      picksSignature: 'a',
      save,
    });
    act(() => {
      harness.getLatest().markInteraction();
    });

    harness.rerender({
      enabled: true,
      complete: true,
      picksSignature: 'a,b',
      save,
    });
    act(() => {
      vi.advanceTimersByTime(DELAY_MS);
    });
    expect(save).toHaveBeenCalledTimes(1);

    // Simulate a failed save: still complete, picks change again.
    harness.rerender({
      enabled: true,
      complete: true,
      picksSignature: 'b,a',
      save,
    });
    act(() => {
      vi.advanceTimersByTime(DELAY_MS * 2);
    });
    expect(save).toHaveBeenCalledTimes(1);
    harness.unmount();
  });

  it('does not fire while disabled', () => {
    const save = vi.fn();
    const harness = renderHook({
      enabled: false,
      complete: false,
      picksSignature: 'a',
      save,
    });
    act(() => {
      harness.getLatest().markInteraction();
    });

    harness.rerender({
      enabled: false,
      complete: true,
      picksSignature: 'a,b',
      save,
    });
    act(() => {
      vi.advanceTimersByTime(DELAY_MS * 2);
    });
    expect(save).not.toHaveBeenCalled();
    harness.unmount();
  });
});
