import { act } from 'react';
import type { Root } from 'react-dom/client';
import { createRoot } from 'react-dom/client';
import { afterEach, describe, expect, it } from 'vitest';

import { FriendGameLink } from './FriendGameLink';

(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

let root: Root | undefined;
let container: HTMLDivElement | undefined;

function render() {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => {
    root?.render(<FriendGameLink linkClassName="link" />);
  });
  const anchor = container.querySelector('a');
  if (!anchor) {
    throw new Error('FriendGameLink rendered no anchor');
  }
  return anchor;
}

afterEach(() => {
  act(() => root?.unmount());
  container?.remove();
  root = undefined;
  container = undefined;
});

describe('FriendGameLink', () => {
  /**
   * The point of the link is that the other site can see the traffic arriving
   * from us in their own analytics. `noreferrer` suppresses the `Referer`
   * header, so a well-meaning pass that hardens every outbound `rel` in the
   * footer would turn these clicks into direct traffic without anything
   * visibly breaking.
   */
  it('opens in a new tab without suppressing the referrer', () => {
    const anchor = render();

    expect(anchor.getAttribute('target')).toBe('_blank');
    expect(anchor.getAttribute('rel')).toBe('noopener');
  });

  it('names the destination in the link text', () => {
    const anchor = render();

    expect(anchor.textContent).toBe('Podium Legend');
    expect(anchor.getAttribute('href')).toContain('podiumlegend.com');
  });
});
