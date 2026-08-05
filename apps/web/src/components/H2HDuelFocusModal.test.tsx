import type { Id } from '@convex-generated/dataModel';
import { act } from 'react';
import type { Root } from 'react-dom/client';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { H2HDuelFocusModal } from './H2HDuelFocusModal';
import type { H2HMatchup } from './H2HMatchupGrid';

(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

const submit = vi.fn();

vi.mock('convex/react', () => ({
  useMutation: () => submit,
}));

vi.mock('@/lib/analytics', () => ({
  captureAnalyticsEvent: () => undefined,
}));

const matchup: H2HMatchup = {
  _id: 'matchup-1' as Id<'h2hMatchups'>,
  team: 'Mercedes',
  driver1: {
    _id: 'driver-rus' as Id<'drivers'>,
    code: 'RUS',
    displayName: 'George Russell',
    team: 'Mercedes',
  },
  driver2: {
    _id: 'driver-ant' as Id<'drivers'>,
    code: 'ANT',
    displayName: 'Kimi Antonelli',
    team: 'Mercedes',
  },
};

let root: Root | null = null;

function render(props: Partial<Parameters<typeof H2HDuelFocusModal>[0]> = {}) {
  const onClose = props.onClose ?? vi.fn();
  const host = document.createElement('div');
  document.body.appendChild(host);
  root = createRoot(host);
  act(() =>
    root?.render(
      <H2HDuelFocusModal
        open
        onClose={onClose}
        raceId={'race-1' as Id<'races'>}
        sessionType="quali"
        matchup={matchup}
        selectedDriverId={matchup.driver1._id}
        {...props}
      />,
    ),
  );
  // The overlay portals to the body, so assertions read from there.
  return { onClose, body: document.body };
}

function pick(name: string) {
  document
    .querySelector<HTMLButtonElement>(`[aria-label^="Pick ${name}"]`)
    ?.click();
}

function isPicked(name: string) {
  return (
    document
      .querySelector(`[aria-label^="Pick ${name}"]`)
      ?.getAttribute('aria-pressed') === 'true'
  );
}

beforeEach(() => {
  submit.mockReset();
});

afterEach(() => {
  vi.useRealTimers();
  act(() => root?.unmount());
  root = null;
  document.body.innerHTML = '';
});

describe('H2HDuelFocusModal', () => {
  it('shows the tapped driver as picked before the write comes back', async () => {
    // A write that never settles: whatever the card shows here, it shows on
    // the strength of the tap alone.
    submit.mockReturnValue(new Promise(() => {}));
    render();

    expect(isPicked('George Russell')).toBe(true);

    await act(async () => {
      pick('Kimi Antonelli');
    });

    expect(isPicked('Kimi Antonelli')).toBe(true);
    expect(isPicked('George Russell')).toBe(false);
  });

  it('holds the confirmed card on screen, then closes', async () => {
    vi.useFakeTimers();
    submit.mockResolvedValue(undefined);
    const { onClose, body } = render();

    await act(async () => {
      pick('Kimi Antonelli');
    });

    // Closing on the promise meant the takeover vanished mid-animation.
    expect(onClose).not.toHaveBeenCalled();
    expect(body.textContent).toContain('Saved');

    act(() => {
      vi.runAllTimers();
    });
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('puts the card back to the saved pick when the write fails', async () => {
    submit.mockRejectedValue(new Error('Session is locked'));
    const { onClose, body } = render();

    await act(async () => {
      pick('Kimi Antonelli');
    });

    // Leaving the tapped driver looking chosen next to an error tells two
    // stories about what is saved.
    expect(isPicked('Kimi Antonelli')).toBe(false);
    expect(isPicked('George Russell')).toBe(true);
    expect(body.textContent).toContain('Session is locked');
    expect(onClose).not.toHaveBeenCalled();
  });

  it('names the team with its colour', () => {
    const { body } = render();

    const dot = [...body.querySelectorAll<HTMLElement>('span[aria-hidden]')]
      .map((node) => node.style.backgroundColor)
      .filter(Boolean);

    expect(body.textContent).toContain('Mercedes');
    expect(dot.length).toBeGreaterThan(0);
  });
});
