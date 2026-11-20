import { act, useState } from 'react';
import type { Root } from 'react-dom/client';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { useSessionDraft } from './useSessionDraft';

(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

const KEY = 'test:draft';

function Form() {
  const [message, setMessage] = useState('');
  useSessionDraft(KEY, message ? { message } : null, (draft) => {
    setMessage(draft.message);
  });
  return (
    <textarea
      value={message}
      onChange={(event) => setMessage(event.target.value)}
    />
  );
}

let container: HTMLDivElement;
let root: Root;

function mount() {
  container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
  act(() => root.render(<Form />));
}

function unmount() {
  act(() => root.unmount());
  container.remove();
}

function field() {
  return container.querySelector('textarea')!;
}

/** Sets a controlled field the way a keystroke does, so React hears it. */
function type(value: string) {
  const setter = Object.getOwnPropertyDescriptor(
    HTMLTextAreaElement.prototype,
    'value',
  )!.set!;
  act(() => {
    setter.call(field(), value);
    field().dispatchEvent(new Event('input', { bubbles: true }));
  });
}

describe('useSessionDraft', () => {
  beforeEach(() => {
    window.sessionStorage.clear();
  });
  afterEach(() => {
    unmount();
  });

  it('brings a draft back after a remount', () => {
    mount();
    type('Picks did not save');
    unmount();

    mount();

    expect(field().value).toBe('Picks did not save');
    // Mounting empty must not erase the draft it is about to restore.
    expect(window.sessionStorage.getItem(KEY)).toContain('Picks did not save');
  });

  it('clears the entry once there is nothing to keep', () => {
    mount();
    type('Sent in a moment');
    expect(window.sessionStorage.getItem(KEY)).not.toBeNull();

    type('');

    expect(window.sessionStorage.getItem(KEY)).toBeNull();
  });

  it('starts empty when the stored entry is malformed', () => {
    window.sessionStorage.setItem(KEY, '{not json');

    mount();

    expect(field().value).toBe('');
  });
});
