import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { SubmitRow } from './SubmitRow';

function label(picksLeft: number, isAuthenticated = false) {
  const html = renderToStaticMarkup(
    <SubmitRow
      showSaving={false}
      saved={false}
      picksLeft={picksLeft}
      disabled={picksLeft > 0}
      isAuthenticated={isAuthenticated}
      isEdit={false}
      showSuccess={false}
      errorMessage={null}
      onSubmit={() => {}}
    />,
  );
  return new DOMParser()
    .parseFromString(html, 'text/html')
    .querySelector('[data-testid="submit-prediction"]')?.textContent;
}

describe('SubmitRow', () => {
  it('names the picks still needed instead of a sign-in prompt', () => {
    expect(label(5)).toBe('Pick 5 drivers');
    expect(label(2)).toBe('Pick 2 more drivers');
    expect(label(1, true)).toBe('Pick 1 more driver');
  });

  it('asks a signed-out player to sign in once the Top 5 is full', () => {
    expect(label(0)).toBe('Sign in to save your picks');
    expect(label(0, true)).toBe('Save Predictions');
  });
});
