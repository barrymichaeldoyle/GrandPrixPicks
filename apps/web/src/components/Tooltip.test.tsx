import { act } from 'react';
import type { Root } from 'react-dom/client';
import { createRoot } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { Tooltip } from './Tooltip';

(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

function renderTooltip() {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root: Root = createRoot(container);

  act(() => {
    root.render(
      <Tooltip content="Session locked" openOnClick>
        <button type="button">Trigger</button>
      </Tooltip>,
    );
  });

  return {
    trigger: () => container.querySelector('button'),
    tooltip: () => document.body.querySelector('[role="tooltip"]'),
    unmount: () => {
      act(() => {
        root.unmount();
      });
      container.remove();
    },
  };
}

describe('Tooltip', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    document.body.innerHTML = '';
  });

  it('opens on click without hitting a maximum update depth loop', () => {
    const consoleError = vi
      .spyOn(console, 'error')
      .mockImplementation(() => undefined);
    const view = renderTooltip();
    const trigger = view.trigger();

    expect(trigger).not.toBeNull();

    act(() => {
      trigger?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(view.tooltip()).not.toBeNull();
    expect(view.tooltip()?.textContent).toContain('Session locked');
    expect(
      consoleError.mock.calls.some((args) =>
        args.some(
          (arg) =>
            typeof arg === 'string' &&
            arg.includes('Maximum update depth exceeded'),
        ),
      ),
    ).toBe(false);

    view.unmount();
  });
});
