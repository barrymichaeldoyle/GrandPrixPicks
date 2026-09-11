import { act } from 'react';
import type { Root } from 'react-dom/client';
import { createRoot } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { footerPrimaryLink } from '@/lib/navigation';
import { footerWeekendPreview } from '@/lib/raceWriteups';

import { Footer } from './Footer';

vi.mock('@tanstack/react-router', () => ({
  Link: ({
    children,
    to,
    className,
  }: {
    children: React.ReactNode;
    to: string;
    className?: string;
  }) => (
    <a href={to} className={className}>
      {children}
    </a>
  ),
}));

vi.mock('./RaceFlag', () => ({
  RaceFlag: ({ countryCode }: { countryCode: string }) => (
    <span data-flag={countryCode} />
  ),
}));

(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

describe('Footer weekend preview', () => {
  let container: HTMLDivElement | null = null;
  let root: Root | null = null;

  afterEach(() => {
    act(() => root?.unmount());
    container?.remove();
    container = null;
    root = null;
  });

  function render(weekendRace: { slug: string } | null = null) {
    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);
    act(() => root!.render(<Footer weekendRace={weekendRace} />));
    return container;
  }

  it('features the current write-up with its flag, not an accent button', () => {
    const preview = footerWeekendPreview('madrid-2026');
    const html = render({ slug: 'madrid-2026' });
    const link = html.querySelector(`a[href="${preview!.to}"]`);

    expect(link, 'missing weekend preview link').not.toBeNull();
    expect(link!.textContent).toContain('Madrid Weekend News');
    expect(link!.querySelector('[data-flag="es"]')).not.toBeNull();
    expect(link!.className).not.toMatch(/bg-accent/);
  });

  it('falls back to the predictions hub when the round has no write-up', () => {
    const html = render({ slug: 'netherlands-2026' });
    const link = html.querySelector(`a[href="${footerPrimaryLink.to}"]`);

    expect(link, 'missing hub fallback').not.toBeNull();
    expect(link!.textContent).toContain(footerPrimaryLink.label);
    expect(html.querySelector('[data-flag]')).toBeNull();
  });
});
