import { afterEach, describe, expect, it, vi } from 'vitest';

import { focusHashTarget } from './useHashTargetFocus';

describe('focusHashTarget', () => {
  afterEach(() => {
    document.body.replaceChildren();
  });

  it('returns null when the hash is empty', () => {
    expect(focusHashTarget(document, '')).toBeNull();
    expect(focusHashTarget(document, '#')).toBeNull();
  });

  it('returns null when no element matches', () => {
    expect(focusHashTarget(document, '#missing')).toBeNull();
  });

  it('makes the target focusable and focuses it without scrolling', () => {
    const heading = document.createElement('h2');
    heading.id = 'track-map';
    document.body.append(heading);
    const focus = vi.spyOn(heading, 'focus');

    expect(focusHashTarget(document, '#track-map')).toBe(heading);
    expect(heading.tabIndex).toBe(-1);
    expect(focus).toHaveBeenCalledWith({ preventScroll: true });
  });

  it('does not overwrite an existing tabindex', () => {
    const section = document.createElement('section');
    section.id = 'make-picks';
    section.tabIndex = 0;
    document.body.append(section);

    focusHashTarget(document, 'make-picks');
    expect(section.tabIndex).toBe(0);
  });
});
