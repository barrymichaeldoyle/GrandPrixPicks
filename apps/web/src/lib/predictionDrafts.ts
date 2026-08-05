function canUseStorage() {
  return (
    typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'
  );
}

export function loadPredictionDraft<T>(key: string): T | null {
  if (!canUseStorage()) {
    return null;
  }
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) {
      return null;
    }
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function savePredictionDraft<T>(key: string, draft: T) {
  if (!canUseStorage()) {
    return;
  }
  try {
    window.localStorage.setItem(key, JSON.stringify(draft));
  } catch {
    // Ignore storage quota or availability errors.
  }
}

export function clearPredictionDraft(key: string) {
  if (!canUseStorage()) {
    return;
  }
  try {
    window.localStorage.removeItem(key);
  } catch {
    // Ignore storage availability errors.
  }
}

// ── Pending submit (try-before-signup) ──
// When a signed-out user finishes their picks and hits "save", we remember that
// intent so the draft auto-submits the moment they finish signing in. Kept in
// sessionStorage (not localStorage): it's a single-session handoff across the
// Clerk modal, and should not resurrect on a later visit.

function canUseSessionStorage() {
  return (
    typeof window !== 'undefined' &&
    typeof window.sessionStorage !== 'undefined'
  );
}

function pendingSubmitKey(draftKey: string) {
  return `${draftKey}:pending-submit`;
}

export function setPendingSubmit(draftKey: string) {
  if (!canUseSessionStorage()) {
    return;
  }
  try {
    window.sessionStorage.setItem(pendingSubmitKey(draftKey), '1');
  } catch {
    // Ignore storage quota or availability errors.
  }
}

export function hasPendingSubmit(draftKey: string): boolean {
  if (!canUseSessionStorage()) {
    return false;
  }
  try {
    return window.sessionStorage.getItem(pendingSubmitKey(draftKey)) === '1';
  } catch {
    return false;
  }
}

export function clearPendingSubmit(draftKey: string) {
  if (!canUseSessionStorage()) {
    return;
  }
  try {
    window.sessionStorage.removeItem(pendingSubmitKey(draftKey));
  } catch {
    // Ignore storage availability errors.
  }
}

const PENDING_SUBMIT_SUFFIX = ':pending-submit';

/**
 * Every draft key currently waiting on a sign-in, whatever wrote it.
 *
 * The flags above are read by whichever form owns that key, which only works
 * while such a form is mounted. It is not on the landing page: signing in swaps
 * the whole page for the dashboard on the same beat that auth lands, so both
 * pickers unmount before they can act on their own flag. This is how the
 * recovery pass finds what they left behind. See `PendingPickSubmitter`.
 */
export function listPendingSubmitDraftKeys(): string[] {
  if (!canUseSessionStorage()) {
    return [];
  }
  try {
    const keys: string[] = [];
    for (let index = 0; index < window.sessionStorage.length; index += 1) {
      const key = window.sessionStorage.key(index);
      if (
        key?.endsWith(PENDING_SUBMIT_SUFFIX) &&
        window.sessionStorage.getItem(key) === '1'
      ) {
        keys.push(key.slice(0, -PENDING_SUBMIT_SUFFIX.length));
      }
    }
    return keys;
  } catch {
    return [];
  }
}
