import { act } from 'react';
import type { Root } from 'react-dom/client';
import { createRoot } from 'react-dom/client';
import { afterEach, describe, expect, it } from 'vitest';

import { WriteUpNewsPhoto } from './WriteUpNewsPhoto';

(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

describe('WriteUpNewsPhoto', () => {
  let container: HTMLDivElement | null = null;
  let root: Root | null = null;

  afterEach(() => {
    act(() => root?.unmount());
    container?.remove();
    container = null;
    root = null;
  });

  function render() {
    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);
    act(() =>
      root!.render(
        <WriteUpNewsPhoto
          src="/media/lukas-raich-williams-browning-austria-2026-1920.jpg"
          alt="Luke Browning in the Williams FW48 at the 2026 Austrian Grand Prix"
          width={1920}
          height={960}
          creditName="Lukas Raich"
          creditUrl="https://commons.wikimedia.org/wiki/File:FIA_F1_Austria_2026_Nr._46_Browning_(1).jpg"
          licenseName="CC BY-SA 4.0"
          licenseUrl="https://creativecommons.org/licenses/by-sa/4.0/"
        />,
      ),
    );
  }

  it('renders the Barry-approved caption links and honest alt text', () => {
    render();

    const img = container!.querySelector('img')!;
    expect(img.getAttribute('alt')).toBe(
      'Luke Browning in the Williams FW48 at the 2026 Austrian Grand Prix',
    );

    const caption = container!.querySelector('figcaption')!.textContent;
    expect(caption).toBe('Photo: Lukas Raich, CC BY-SA 4.0');

    expect(
      container!.querySelector<HTMLAnchorElement>(
        'figcaption a[href*="commons.wikimedia.org"]',
      )!.textContent,
    ).toBe('Lukas Raich');
    expect(
      container!.querySelector<HTMLAnchorElement>(
        'figcaption a[href*="creativecommons.org"]',
      )!.textContent,
    ).toBe('CC BY-SA 4.0');
  });

  it('renders the Schumacher tribute caption', () => {
    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);
    act(() =>
      root!.render(
        <WriteUpNewsPhoto
          src="/media/rick-dikeman-schumacher-ferrari-indianapolis-2002.jpg"
          alt="Michael Schumacher in Ferrari overalls, Indianapolis 2002"
          width={900}
          height={1350}
          creditName="Rick Dikeman"
          creditUrl="https://commons.wikimedia.org/wiki/File:Michael_Schumacher_2002.jpg"
          licenseName="CC BY-SA 3.0"
          licenseUrl="http://creativecommons.org/licenses/by-sa/3.0/"
        />,
      ),
    );

    expect(container!.querySelector('figcaption')!.textContent).toBe(
      'Photo: Rick Dikeman, CC BY-SA 3.0',
    );
    expect(container!.querySelector('img')!.getAttribute('alt')).toBe(
      'Michael Schumacher in Ferrari overalls, Indianapolis 2002',
    );
  });
});
