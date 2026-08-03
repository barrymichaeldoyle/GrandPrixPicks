/**
 * The one address a person can reach a human on.
 *
 * Shared rather than declared per app because both the web UI (support page,
 * legal pages) and the backend (where support requests are delivered, and the
 * reply-to on every outbound email) have to agree. A support address that
 * differs between the page telling you to use it and the inbox receiving it is
 * the kind of drift nobody notices until someone's message goes nowhere.
 *
 * The backend still allows a `SUPPORT_EMAIL` env override so a deployment can
 * point at somewhere else without a code change.
 */
export const SUPPORT_EMAIL = 'support@grandprixpicks.com';

/** `mailto:` for the same address, for VAPID subjects and plain links. */
export const SUPPORT_MAILTO = `mailto:${SUPPORT_EMAIL}`;
