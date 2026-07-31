import { act } from 'react';
import type { Root } from 'react-dom/client';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { TabSwitch } from './TabSwitch';

const options = [
  { value: 'top5', label: 'Top 5' },
  { value: 'h2h', label: 'Teammate H2H' },
] as const;

describe('TabSwitch', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  it('uses ordinary pressed buttons when it is only a view switch', () => {
    act(() => {
      root.render(
        <TabSwitch
          value="top5"
          onChange={() => undefined}
          options={[...options]}
          ariaLabel="Prediction type"
        />,
      );
    });

    expect(container.querySelector('[role="group"]')).not.toBeNull();
    expect(
      container.querySelector('button')?.getAttribute('aria-pressed'),
    ).toBe('true');
  });

  it('connects a tab panel and supports arrow-key navigation', () => {
    const onChange = vi.fn();
    act(() => {
      root.render(
        <>
          <TabSwitch
            id="prediction-tabs"
            panelId="prediction-panel"
            value="top5"
            onChange={onChange}
            options={[...options]}
            ariaLabel="Prediction type"
          />
          <div
            id="prediction-panel"
            role="tabpanel"
            aria-labelledby="prediction-tabs-top5"
          />
        </>,
      );
    });

    const [topFive, h2h] = Array.from(
      container.querySelectorAll<HTMLButtonElement>('[role="tab"]'),
    );
    expect(topFive.getAttribute('aria-controls')).toBe('prediction-panel');
    expect(topFive.tabIndex).toBe(0);
    expect(h2h.tabIndex).toBe(-1);

    act(() => {
      topFive.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }),
      );
    });

    expect(onChange).toHaveBeenCalledWith('h2h');
    expect(document.activeElement).toBe(h2h);
  });
});
