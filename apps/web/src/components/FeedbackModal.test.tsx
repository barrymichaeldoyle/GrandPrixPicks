import { act } from 'react';
import type { Root } from 'react-dom/client';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { FeedbackModal } from './FeedbackModal';

(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

const submitRequest = vi.fn(async () => ({ success: true }));

vi.mock('@convex-generated/api', () => ({
  api: { support: { submitRequest: 'submitRequest' } },
}));

vi.mock('convex/react', () => ({
  useMutation: () => submitRequest,
}));

vi.mock('@/lib/analytics', () => ({
  captureAnalyticsEvent: vi.fn(),
}));

describe('feedback modal', () => {
  let container: HTMLDivElement | null = null;
  let root: Root | null = null;
  const onClose = vi.fn();

  beforeEach(() => {
    submitRequest.mockClear();
    onClose.mockClear();
  });

  afterEach(() => {
    act(() => root?.unmount());
    container?.remove();
    container = null;
    root = null;
  });

  function render(open = true) {
    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);
    act(() =>
      root!.render(
        <FeedbackModal open={open} onClose={onClose} source="test" />,
      ),
    );
  }

  function panel() {
    const el = document.querySelector<HTMLElement>('[role="dialog"]');
    if (!el) {
      throw new Error('no feedback dialog rendered');
    }
    return el;
  }

  function type(value: string) {
    const textarea = panel().querySelector('textarea');
    if (!textarea) {
      throw new Error('no message field rendered');
    }
    const setValue = Object.getOwnPropertyDescriptor(
      HTMLTextAreaElement.prototype,
      'value',
    )!.set!;
    act(() => {
      setValue.call(textarea, value);
      textarea.dispatchEvent(new Event('input', { bubbles: true }));
    });
  }

  function submit() {
    const form = panel().querySelector('form');
    if (!form) {
      throw new Error('no feedback form rendered');
    }
    return act(async () => {
      form.dispatchEvent(
        new Event('submit', { bubbles: true, cancelable: true }),
      );
    });
  }

  it('renders nothing while closed', () => {
    render(false);
    expect(document.querySelector('[role="dialog"]')).toBeNull();
  });

  it('sends a message with no subject, and thanks you for it', async () => {
    render();
    type('Sprint quali picks should default to my race picks');
    await submit();

    expect(submitRequest).toHaveBeenCalledWith({
      message: 'Sprint quali picks should default to my race picks',
      category: 'feedback',
    });
    expect(panel().textContent).toContain('That is with Barry now');
  });

  it('carries the chosen category', async () => {
    render();
    const bug = Array.from(panel().querySelectorAll('button')).find(
      (button) => button.textContent === 'Bug',
    )!;
    act(() => bug.click());
    type('H2H picks did not save');
    await submit();

    expect(submitRequest).toHaveBeenCalledWith({
      message: 'H2H picks did not save',
      category: 'bug',
    });
  });

  it('does not send an empty message', async () => {
    render();
    await submit();

    expect(submitRequest).not.toHaveBeenCalled();
  });

  it('keeps the message and explains itself when the send fails', async () => {
    submitRequest.mockRejectedValueOnce(new Error('offline'));
    render();
    type('The countdown is an hour out');
    await submit();

    expect(panel().querySelector('[role="alert"]')).not.toBeNull();
    expect(panel().querySelector('textarea')?.value).toBe(
      'The countdown is an hour out',
    );
  });
});
