/**
 * Email-and-code sign-in without Clerk's modal, for the save on the landing
 * page (`components/EmailSaveDialog.tsx`).
 *
 * The modal was where landing visitors left: four of four who tapped "Sign in
 * to save" in November 2026 closed it within ten seconds. Since 2026-11-19 the
 * production instance asks a new player for nothing but a confirmed email
 * (password and username became optional), so the whole flow fits in two
 * fields: an email, then the six-digit code sent to it. One flow covers both
 * cases: an email Clerk already knows signs in, a new one signs up.
 *
 * Clerk-free on purpose. The landing route must never import `@clerk/*`
 * (`lint:clerk-free`), so the instance arrives through {@link publishClerk}
 * from `ClerkSignInOverlay`, which mounts beside the page on demand, and is
 * described here by the few members this file uses.
 */

type ClerkErrorLike = {
  errors?: { code?: string; message?: string; longMessage?: string }[];
};

type EmailFactor = { strategy: string; emailAddressId?: string };

type SignUpLike = {
  status: string | null;
  createdSessionId: string | null;
  missingFields?: string[];
  create: (params: { emailAddress: string }) => Promise<SignUpLike>;
  prepareEmailAddressVerification: (params: {
    strategy: 'email_code';
  }) => Promise<SignUpLike>;
  attemptEmailAddressVerification: (params: {
    code: string;
  }) => Promise<SignUpLike>;
};

type SignInLike = {
  status: string | null;
  createdSessionId: string | null;
  supportedFirstFactors: EmailFactor[] | null;
  create: (params: { identifier: string }) => Promise<SignInLike>;
  prepareFirstFactor: (params: {
    strategy: 'email_code';
    emailAddressId: string;
  }) => Promise<SignInLike>;
  attemptFirstFactor: (params: {
    strategy: 'email_code';
    code: string;
  }) => Promise<SignInLike>;
};

export type HeadlessClerk = {
  loaded: boolean;
  client?: { signUp: SignUpLike; signIn: SignInLike } | null;
  setActive: (params: { session: string }) => Promise<void>;
};

let published: HeadlessClerk | null = null;
const waiters = new Set<(clerk: HeadlessClerk) => void>();

/** Called by the overlay once Clerk has loaded. */
export function publishClerk(clerk: HeadlessClerk) {
  published = clerk;
  for (const resolve of waiters) {
    resolve(clerk);
  }
  waiters.clear();
}

/** The loaded instance, or null if it is not here within `timeoutMs`. */
export function whenClerkReady(
  timeoutMs = 10_000,
): Promise<HeadlessClerk | null> {
  if (published) {
    return Promise.resolve(published);
  }
  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      waiters.delete(done);
      resolve(null);
    }, timeoutMs);
    function done(clerk: HeadlessClerk) {
      clearTimeout(timer);
      resolve(clerk);
    }
    waiters.add(done);
  });
}

export function resetClerkBridgeForTests() {
  published = null;
  waiters.clear();
}

export type EmailCodeFlow = 'sign_in' | 'sign_up';

export class EmailCodeError extends Error {
  constructor(
    message: string,
    /** Something only Clerk's own modal can finish (a second factor, a ban). */
    readonly needsModal = false,
  ) {
    super(message);
  }
}

function errorCode(error: unknown): string | undefined {
  return (error as ClerkErrorLike | null)?.errors?.[0]?.code;
}

function errorMessage(error: unknown, fallback: string): string {
  const first = (error as ClerkErrorLike | null)?.errors?.[0];
  return first?.longMessage ?? first?.message ?? fallback;
}

const INVALID_EMAIL = new Set([
  'form_param_format_invalid',
  'form_param_nil',
  'form_email_address_blocked',
]);

/**
 * Sends a code to `email`. A new address starts a sign-up; one Clerk already
 * holds starts a sign-in on the same address.
 */
export async function sendEmailCode(
  clerk: HeadlessClerk,
  email: string,
): Promise<EmailCodeFlow> {
  const client = clerk.client;
  if (!client) {
    throw new EmailCodeError('Sign-in isn’t ready. Try again.');
  }
  try {
    const signUp = await client.signUp.create({ emailAddress: email });
    await signUp.prepareEmailAddressVerification({ strategy: 'email_code' });
    return 'sign_up';
  } catch (error) {
    const code = errorCode(error);
    if (code !== 'form_identifier_exists') {
      if (code && INVALID_EMAIL.has(code)) {
        throw new EmailCodeError('Enter a valid email address.');
      }
      throw new EmailCodeError(
        errorMessage(error, 'The code wasn’t sent. Try again.'),
        code === 'captcha_invalid' || code === 'captcha_unavailable',
      );
    }
  }

  try {
    const signIn = await client.signIn.create({ identifier: email });
    const factor = signIn.supportedFirstFactors?.find(
      (candidate) => candidate.strategy === 'email_code',
    );
    if (!factor?.emailAddressId) {
      throw new EmailCodeError('This account signs in another way.', true);
    }
    await signIn.prepareFirstFactor({
      strategy: 'email_code',
      emailAddressId: factor.emailAddressId,
    });
    return 'sign_in';
  } catch (error) {
    if (error instanceof EmailCodeError) {
      throw error;
    }
    throw new EmailCodeError(
      errorMessage(error, 'The code wasn’t sent. Try again.'),
    );
  }
}

const WRONG_CODE = new Set([
  'form_code_incorrect',
  'verification_failed',
  'form_param_format_invalid',
]);

/** Checks the code and, when it is right, signs the visitor in. */
export async function verifyEmailCode(
  clerk: HeadlessClerk,
  flow: EmailCodeFlow,
  code: string,
): Promise<void> {
  const client = clerk.client;
  if (!client) {
    throw new EmailCodeError('Sign-in isn’t ready. Try again.');
  }
  let status: string | null;
  let sessionId: string | null;
  try {
    if (flow === 'sign_up') {
      const signUp = await client.signUp.attemptEmailAddressVerification({
        code,
      });
      status = signUp.status;
      sessionId = signUp.createdSessionId;
    } else {
      const signIn = await client.signIn.attemptFirstFactor({
        strategy: 'email_code',
        code,
      });
      status = signIn.status;
      sessionId = signIn.createdSessionId;
    }
  } catch (error) {
    const errCode = errorCode(error);
    if (errCode === 'verification_expired') {
      throw new EmailCodeError('That code has expired. Send a new one.');
    }
    if (errCode && WRONG_CODE.has(errCode)) {
      throw new EmailCodeError(
        'That code isn’t right. Check it and try again.',
      );
    }
    throw new EmailCodeError(
      errorMessage(error, 'That didn’t work. Try again.'),
    );
  }

  if (status !== 'complete' || !sessionId) {
    // A second factor, or a sign-up field the instance still requires. The
    // modal knows how to finish both; this form does not try to.
    throw new EmailCodeError('One more step to finish signing in.', true);
  }
  await clerk.setActive({ session: sessionId });
}
