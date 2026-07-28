import { act } from 'react';
import type { Root } from 'react-dom/client';
import { createRoot } from 'react-dom/client';
import { afterEach, describe, expect, it } from 'vitest';

import { Avatar } from './Avatar';

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
});

describe('Avatar', () => {
  it('shows the uppercased initial', () => {
    expect(render(<Avatar username="barry" />).textContent).toBe('B');
  });

  // Regression: `??` let an empty string through, so ''[0].toUpperCase() threw.
  it.each([
    ['empty string', ''],
    ['null', null],
    ['undefined', undefined],
  ])('falls back to "?" for a %s username', (_label, username) => {
    expect(render(<Avatar username={username} />).textContent).toBe('?');
  });

  it('renders an image when an avatar url is given', () => {
    const img = render(
      <Avatar avatarUrl="https://example.com/a.png" username="barry" />,
    ).querySelector('img');
    expect(img).not.toBeNull();
    expect(img?.getAttribute('alt')).toBe('barry');
  });

  it('gives an image with no username a descriptive alt', () => {
    const img = render(
      <Avatar avatarUrl="https://example.com/a.png" username="" />,
    ).querySelector('img');
    expect(img?.getAttribute('alt')).toBe('User avatar');
  });
});
