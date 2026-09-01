import { act } from 'react';
import type { Root } from 'react-dom/client';
import { createRoot } from 'react-dom/client';
import { afterEach, describe, expect, it } from 'vitest';

import {
  WriteUpNewsPhoto,
  type WriteUpNewsPhotoProps,
} from './WriteUpNewsPhoto';

(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

const BROWNING: WriteUpNewsPhotoProps = {
  src: '/media/lukas-raich-williams-browning-austria-2026-1600.webp',
  srcSet:
    '/media/lukas-raich-williams-browning-austria-2026-800.webp 800w, /media/lukas-raich-williams-browning-austria-2026-1600.webp 1600w',
  sizes: '(min-width: 640px) 28rem, 100vw',
  alt: 'Luke Browning in the Williams FW48 at the 2026 Austrian Grand Prix',
  width: 1600,
  height: 800,
  context: 'Austria, 2026',
  creditName: 'Lukas Raich',
  creditUrl:
    'https://commons.wikimedia.org/wiki/File:FIA_F1_Austria_2026_Nr._46_Browning_(1).jpg',
  licenseName: 'CC BY-SA 4.0',
  licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/',
  modificationNote: 'resized',
};

describe('WriteUpNewsPhoto', () => {
  let container: HTMLDivElement | null = null;
  let root: Root | null = null;

  afterEach(() => {
    act(() => root?.unmount());
    container?.remove();
    container = null;
    root = null;
  });

  function render(props: WriteUpNewsPhotoProps) {
    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);
    act(() => root!.render(<WriteUpNewsPhoto {...props} />));
    return container;
  }

  it('renders the caption links, the honest alt text and the srcset', () => {
    render(BROWNING);

    const img = container!.querySelector('img')!;
    expect(img.getAttribute('alt')).toBe(
      'Luke Browning in the Williams FW48 at the 2026 Austrian Grand Prix',
    );
    expect(img.getAttribute('srcset')).toBe(BROWNING.srcSet);
    expect(img.getAttribute('sizes')).toBe(BROWNING.sizes);

    const caption = container!.querySelector('figcaption')!.textContent;
    expect(caption).toBe(
      'Austria, 2026. Photo: Lukas Raich, CC BY-SA 4.0 (resized)',
    );

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

  it('leaves a landscape photo at the full width of its column', () => {
    render(BROWNING);

    expect(container!.querySelector('figure')!.className).not.toContain(
      'max-w-',
    );
  });

  it('caps a portrait photo so it cannot outgrow the reading column', () => {
    render({
      ...BROWNING,
      src: '/media/rick-dikeman-schumacher-ferrari-indianapolis-2002-900.webp',
      srcSet: undefined,
      sizes: undefined,
      alt: 'Michael Schumacher in Ferrari overalls, riding a folding scooter down the Indianapolis pit lane in 2002',
      width: 900,
      height: 1350,
      context: 'Indianapolis, 2002',
    });

    expect(container!.querySelector('figure')!.className).toContain(
      'max-w-64 sm:max-w-xs',
    );
    expect(container!.querySelector('figcaption')!.textContent).toContain(
      'Indianapolis, 2002. Photo: Lukas Raich',
    );
  });

  it('omits the context prefix when the photo is from this race', () => {
    render({ ...BROWNING, context: undefined });

    expect(container!.querySelector('figcaption')!.textContent).toBe(
      'Photo: Lukas Raich, CC BY-SA 4.0 (resized)',
    );
  });
});
