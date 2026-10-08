import { afterEach, describe, expect, it } from 'vitest';

import { nameClerkDialogs } from './clerkDialogName';

afterEach(() => {
  document.body.innerHTML = '';
});

function mountModal(title: string | null): HTMLElement {
  document.body.innerHTML = `<div class="cl-modalContent" role="dialog" aria-modal="true">${
    title === null ? '' : `<h1 class="cl-headerTitle">${title}</h1>`
  }</div>`;
  return document.querySelector('[role="dialog"]')!;
}

describe('nameClerkDialogs', () => {
  it('labels the dialog by its own heading', () => {
    const dialog = mountModal('Sign in to Grand Prix Picks');
    nameClerkDialogs();
    const id = dialog.getAttribute('aria-labelledby')!;
    expect(document.getElementById(id)?.textContent).toBe(
      'Sign in to Grand Prix Picks',
    );
  });

  it('follows a heading Clerk replaces between steps', () => {
    const dialog = mountModal('Sign in to Grand Prix Picks');
    nameClerkDialogs();
    dialog.innerHTML = '<h1 class="cl-headerTitle">Create your account</h1>';
    nameClerkDialogs();
    const id = dialog.getAttribute('aria-labelledby')!;
    expect(document.getElementById(id)?.textContent).toBe(
      'Create your account',
    );
  });

  it('waits for the heading rather than guessing a name', () => {
    const dialog = mountModal(null);
    nameClerkDialogs();
    expect(dialog.hasAttribute('aria-labelledby')).toBe(false);
  });
});
