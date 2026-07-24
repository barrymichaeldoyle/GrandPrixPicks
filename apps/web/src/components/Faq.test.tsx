import { HelpCircle } from 'lucide-react';
import { act } from 'react';
import type { Root } from 'react-dom/client';
import { createRoot } from 'react-dom/client';
import { afterEach, describe, expect, it } from 'vitest';

import { FaqItem } from './Faq';

(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

class IntersectionObserverMock implements IntersectionObserver {
  readonly root = null;
  readonly rootMargin = '0px';
  readonly scrollMargin = '0px';
  readonly thresholds = [0];
  disconnect() {}
  observe() {}
  takeRecords() {
    return [];
  }
  unobserve() {}
}

globalThis.IntersectionObserver = IntersectionObserverMock;

function renderFaqItem() {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root: Root = createRoot(container);

  act(() => {
    root.render(
      <FaqItem icon={HelpCircle} question="When do picks lock?">
        <p>Each session locks at its scheduled start time.</p>
      </FaqItem>,
    );
  });

  return {
    button: () => container.querySelector('button'),
    region: () => container.querySelector('[role="region"]'),
    unmount: () => {
      act(() => {
        root.unmount();
      });
      container.remove();
    },
  };
}

describe('FaqItem', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('keeps a collapsed answer out of the accessibility tree', () => {
    const view = renderFaqItem();

    expect(view.button()?.getAttribute('aria-expanded')).toBe('false');
    expect(view.region()?.getAttribute('aria-hidden')).toBe('true');
    expect(view.region()?.hasAttribute('inert')).toBe(true);

    act(() => {
      view.button()?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(view.button()?.getAttribute('aria-expanded')).toBe('true');
    expect(view.region()?.getAttribute('aria-hidden')).toBe('false');
    expect(view.region()?.hasAttribute('inert')).toBe(false);

    view.unmount();
  });
});
