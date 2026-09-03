import { act } from 'react';
import type { Root } from 'react-dom/client';
import { createRoot } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { RaceWriteupActions } from './RaceWriteupActions';

vi.mock('@tanstack/react-router', () => ({
  Link: ({
    children,
    params,
    to,
  }: {
    children: React.ReactNode;
    params: { raceSlug: string };
    to: string;
  }) => <a href={to.replace('$raceSlug', params.raceSlug)}>{children}</a>,
}));

(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

describe('race write-up actions', () => {
  let container: HTMLDivElement | null = null;
  let root: Root | null = null;

  afterEach(() => {
    act(() => root?.unmount());
    container?.remove();
    container = null;
    root = null;
  });

  function render(primaryActionTargetId?: string) {
    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);
    act(() =>
      root!.render(
        <RaceWriteupActions
          phase="preview"
          primaryActionTargetId={primaryActionTargetId}
          raceSlug="italy-2026"
          venueName="Monza"
        />,
      ),
    );
    return container.querySelector('a')!;
  }

  it('keeps an embedded picker CTA on the write-up page', () => {
    expect(render('make-picks').getAttribute('href')).toBe('#make-picks');
  });

  it('uses the race page when there is no embedded action', () => {
    expect(render().getAttribute('href')).toBe('/races/italy-2026');
  });
});
