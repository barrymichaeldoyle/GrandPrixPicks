/** Shown when Clerk has not produced a client, so no button here can work. */
export const NOT_READY_MESSAGE =
  'Sign-in is not ready yet. Check your connection and try again.';

/**
 * What to tell a player whose sign-in or sign-up came back unfinished.
 *
 * Clerk answers some attempts with a status instead of a session: a second
 * factor, a new-device check, a field the account still needs. The handlers
 * used to act on `complete` and ignore everything else, so the spinner stopped
 * and the form just sat there; the Google path printed Clerk's raw status.
 * Each status gets a sentence and, where the app cannot finish it, a place
 * that can.
 */
export function unfinishedAuthMessage(
  status: string | null | undefined,
): string {
  switch (status) {
    case 'needs_second_factor':
    case 'needs_client_trust':
      return 'This account needs an extra verification step the app cannot do yet. Sign in once at grandprixpicks.com, then try again here.';
    case 'needs_new_password':
      return 'This account needs a new password. Use "Forgot password?" to set one.';
    case 'missing_requirements':
      return 'Your account needs a few more details. Finish signing up at grandprixpicks.com, then sign in here.';
    default:
      return 'Sign-in did not complete. Try again.';
  }
}

/** A social sign-up that only lacks the username, which the screen can ask for. */
export function needsUsernameOnly(
  signUp:
    | { status: string | null; missingFields: readonly string[] }
    | null
    | undefined,
): boolean {
  return (
    signUp?.status === 'missing_requirements' &&
    signUp.missingFields.length > 0 &&
    signUp.missingFields.every((field) => field === 'username')
  );
}

export function clerkMessage(err: unknown, fallback: string): string {
  const e = err as {
    errors?: Array<{ longMessage?: string; message?: string; code?: string }>;
    message?: string;
  };
  return (
    e.errors?.[0]?.longMessage ??
    e.errors?.[0]?.message ??
    e.message ??
    fallback
  );
}

export function isAlreadySignedInError(err: unknown): boolean {
  const e = err as {
    errors?: Array<{ code?: string; message?: string }>;
    message?: string;
  };
  const code = e.errors?.[0]?.code ?? '';
  const message = (e.errors?.[0]?.message ?? e.message ?? '').toLowerCase();
  return (
    code === 'session_exists' ||
    code === 'identifier_already_signed_in' ||
    message.includes("you're already signed in") ||
    message.includes('already signed in')
  );
}
