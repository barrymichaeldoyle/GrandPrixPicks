import { act } from 'react';
import type { Root } from 'react-dom/client';
import { createRoot } from 'react-dom/client';
import { afterEach, describe, expect, it } from 'vitest';

import { useHasPicksAnchorOnPage, useRegisterPicksAnchor } from './picksAnchor';

(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

function PickerSection() {
  useRegisterPicksAnchor();
  return <section />;
}

function HeaderCta() {
  return (
    <a href={useHasPicksAnchorOnPage() ? '#make-picks' : '/#make-picks'}>
      Make your picks
    </a>
  );
}

describe('picks anchor registration', () => {
  let container: HTMLDivElement | null = null;
  let root: Root | null = null;

  function render(children: React.ReactNode) {
    if (!root) {
      container = document.createElement('div');
      document.body.append(container);
      root = createRoot(container);
    }
    act(() => root!.render(children));
    return container!.querySelector('a')!.getAttribute('href');
  }

  afterEach(() => {
    act(() => root?.unmount());
    container?.remove();
    container = null;
    root = null;
  });

  it('sends the reader to the landing picker only when this page has none', () => {
    expect(render(<HeaderCta />)).toBe('/#make-picks');

    expect(
      render(
        <>
          <HeaderCta />
          <PickerSection />
        </>,
      ),
    ).toBe('#make-picks');

    expect(render(<HeaderCta />)).toBe('/#make-picks');
  });

  // A route transition can hold the outgoing section and the incoming one at
  // once. A flag would be cleared by whichever unmounts second, leaving the
  // header pointing away from a picker that is on the page.
  it('survives one picker replacing another', () => {
    render(
      <>
        <HeaderCta />
        <PickerSection key="outgoing" />
      </>,
    );

    expect(
      render(
        <>
          <HeaderCta />
          <PickerSection key="outgoing" />
          <PickerSection key="incoming" />
        </>,
      ),
    ).toBe('#make-picks');

    expect(
      render(
        <>
          <HeaderCta />
          <PickerSection key="incoming" />
        </>,
      ),
    ).toBe('#make-picks');
  });
});
