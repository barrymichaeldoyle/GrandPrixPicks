const TITLE_ID_PREFIX = 'gpp-clerk-dialog-title';

let nextTitleId = 0;

/**
 * Names Clerk's modals after the heading they already show.
 *
 * Clerk renders its sign-in (and account) modal as `role="dialog"` with no
 * accessible name, so a screen reader announces only "dialog" when it opens,
 * and axe reports `aria-dialog-name`. Neither `appearance` (classes and styles
 * only) nor the Clerk dashboard can add an attribute, so this points the
 * dialog's `aria-labelledby` at its own `.cl-headerTitle` ("Sign in to Grand
 * Prix Picks"). Labelling by reference keeps Clerk's own wording, including
 * when it moves between sign-in and sign-up.
 *
 * Re-run on every mutation: Clerk can replace the heading element between
 * steps, which would leave the reference pointing at nothing.
 */
export function nameClerkDialogs(root: ParentNode = document): void {
  for (const dialog of root.querySelectorAll<HTMLElement>(
    '.cl-modalContent[role="dialog"]',
  )) {
    if (dialog.hasAttribute('aria-label')) {
      continue;
    }
    const title = dialog.querySelector<HTMLElement>('.cl-headerTitle');
    if (!title) {
      continue;
    }
    if (!title.id) {
      title.id = `${TITLE_ID_PREFIX}-${nextTitleId++}`;
    }
    if (dialog.getAttribute('aria-labelledby') !== title.id) {
      dialog.setAttribute('aria-labelledby', title.id);
    }
  }
}

/** Keeps every Clerk modal named for as long as the page lives. */
export function watchClerkDialogNames(): () => void {
  const observer = new MutationObserver(() => nameClerkDialogs());
  observer.observe(document.body, { childList: true, subtree: true });
  nameClerkDialogs();
  return () => observer.disconnect();
}
