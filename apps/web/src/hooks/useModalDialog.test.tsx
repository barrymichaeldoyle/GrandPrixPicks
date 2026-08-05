import { act, useRef } from 'react';
import type { Root } from 'react-dom/client';
import { createRoot } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { useModalDialog } from './useModalDialog';

(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

function Dialog({
  onClose,
  suspended,
  focusFirstButton = false,
}: {
  onClose?: () => void;
  suspended?: boolean;
  focusFirstButton?: boolean;
}) {
  const firstRef = useRef<HTMLButtonElement>(null);
  const panelRef = useModalDialog<HTMLDivElement>({
    onClose,
    suspended,
    initialFocusRef: focusFirstButton ? firstRef : undefined,
  });

  return (
    <div ref={panelRef} tabIndex={-1} data-testid="panel">
      <button type="button" ref={firstRef}>
        first
      </button>
      <button type="button">last</button>
    </div>
  );
}

function press(key: string, options: KeyboardEventInit = {}) {
  act(() => {
    document.dispatchEvent(
      new KeyboardEvent('keydown', { key, bubbles: true, ...options }),
    );
  });
}

describe('modal dialog behaviour', () => {
  let container: HTMLDivElement | null = null;
  let root: Root | null = null;

  afterEach(() => {
    act(() => root?.unmount());
    container?.remove();
    container = null;
    root = null;
    document.body.style.overflow = '';
  });

  function render(ui: React.ReactNode) {
    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);
    act(() => root!.render(ui));
  }

  function buttons() {
    return [...(container?.querySelectorAll('button') ?? [])];
  }

  it('stops the page behind it scrolling, and gives it back on close', () => {
    render(<Dialog />);
    expect(document.body.style.overflow).toBe('hidden');

    act(() => root!.unmount());
    root = null;
    expect(document.body.style.overflow).toBe('');
  });

  it('keeps the page locked until the last stacked modal closes', () => {
    // A duel takeover can stack a confirm dialog on top of it. If the lock were
    // not counted, dismissing the inner one would hand scrolling back to a page
    // the outer one is still covering.
    render(
      <>
        <Dialog />
        <Dialog />
      </>,
    );
    expect(document.body.style.overflow).toBe('hidden');

    act(() => root!.render(<Dialog />));
    expect(document.body.style.overflow).toBe('hidden');

    act(() => root!.unmount());
    root = null;
    expect(document.body.style.overflow).toBe('');
  });

  it('moves focus into the panel, and to a requested element when given one', () => {
    render(<Dialog />);
    expect(document.activeElement).toBe(
      container?.querySelector('[data-testid="panel"]'),
    );

    act(() => root!.unmount());
    root = null;
    render(<Dialog focusFirstButton />);
    expect(document.activeElement).toBe(buttons()[0]);
  });

  it('wraps Tab at the end of the panel instead of leaving it', () => {
    render(<Dialog focusFirstButton />);
    const [first, last] = buttons();

    act(() => last!.focus());
    press('Tab');
    expect(document.activeElement).toBe(first);

    press('Tab', { shiftKey: true });
    expect(document.activeElement).toBe(last);
  });

  it('pulls focus back in when it is somewhere outside the panel', () => {
    render(<Dialog />);
    const outside = document.createElement('button');
    document.body.append(outside);
    act(() => outside.focus());

    press('Tab');
    expect(document.activeElement).toBe(buttons()[0]);
    outside.remove();
  });

  it('closes on Escape', () => {
    const onClose = vi.fn();
    render(<Dialog onClose={onClose} />);

    press('Escape');
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('ignores Escape and Tab while suspended, so a stacked dialog owns them', () => {
    const onClose = vi.fn();
    render(<Dialog onClose={onClose} suspended />);
    const [, last] = buttons();
    act(() => last!.focus());

    press('Escape');
    press('Tab');

    expect(onClose).not.toHaveBeenCalled();
    expect(document.activeElement).toBe(last);
  });
});
