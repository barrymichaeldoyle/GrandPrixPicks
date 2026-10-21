import { act } from 'react';
import type { Root } from 'react-dom/client';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const consent = vi.hoisted(() => ({
  choice: { inScope: true, cookies: false },
  setAnalyticsCookies: vi.fn(),
}));

vi.mock('@/lib/consent', () => ({
  useAnalyticsCookieChoice: () => consent.choice,
  setAnalyticsCookies: consent.setAnalyticsCookies,
}));

import { AnalyticsCookiesButton } from './AnalyticsCookiesButton';

describe('AnalyticsCookiesButton', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    vi.clearAllMocks();
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  it('renders nothing for a visitor outside the GDPR regions', () => {
    consent.choice = { inScope: false, cookies: true };
    act(() => root.render(<AnalyticsCookiesButton />));
    expect(container.innerHTML).toBe('');
  });

  it('names the current state and flips it on click', () => {
    consent.choice = { inScope: true, cookies: false };
    act(() => root.render(<AnalyticsCookiesButton />));
    const button = container.querySelector('button');
    expect(button?.textContent).toBe('Analytics cookies: off');
    expect(button?.getAttribute('aria-pressed')).toBe('false');
    act(() => button?.click());
    expect(consent.setAnalyticsCookies).toHaveBeenCalledWith(true);
  });
});
