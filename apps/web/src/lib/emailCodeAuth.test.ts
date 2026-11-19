import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  EmailCodeError,
  publishClerk,
  resetClerkBridgeForTests,
  sendEmailCode,
  verifyEmailCode,
  whenClerkReady,
  type HeadlessClerk,
} from './emailCodeAuth';

function clerkError(code: string) {
  return { errors: [{ code, message: code }] };
}

function fakeClerk(overrides: {
  signUpCreate?: () => Promise<unknown>;
  signInFactors?: { strategy: string; emailAddressId?: string }[];
  verifyStatus?: string;
  verifyError?: unknown;
}) {
  const setActive = vi.fn(async () => undefined);
  const prepareEmail = vi.fn(async () => ({}));
  const prepareFirstFactor = vi.fn(async () => ({}));
  const signUp = {
    status: null,
    createdSessionId: null,
    create: vi.fn(
      overrides.signUpCreate ??
        (async () => ({ prepareEmailAddressVerification: prepareEmail })),
    ),
    prepareEmailAddressVerification: prepareEmail,
    attemptEmailAddressVerification: vi.fn(async () => {
      if (overrides.verifyError) {
        throw overrides.verifyError;
      }
      return {
        status: overrides.verifyStatus ?? 'complete',
        createdSessionId: 'sess_new',
      };
    }),
  };
  const signIn = {
    status: null,
    createdSessionId: null,
    supportedFirstFactors: null,
    create: vi.fn(async () => ({
      supportedFirstFactors: overrides.signInFactors ?? [
        { strategy: 'email_code', emailAddressId: 'idn_1' },
      ],
      prepareFirstFactor,
    })),
    prepareFirstFactor,
    attemptFirstFactor: vi.fn(async () => ({
      status: 'complete',
      createdSessionId: 'sess_existing',
    })),
  };
  const clerk = {
    loaded: true,
    client: { signUp, signIn },
    setActive,
  } as unknown as HeadlessClerk;
  return { clerk, signUp, signIn, setActive, prepareEmail, prepareFirstFactor };
}

afterEach(() => {
  resetClerkBridgeForTests();
});

describe('sendEmailCode', () => {
  it('starts a sign-up for a new email', async () => {
    const { clerk, prepareEmail } = fakeClerk({});
    await expect(sendEmailCode(clerk, 'new@example.com')).resolves.toBe(
      'sign_up',
    );
    expect(prepareEmail).toHaveBeenCalledWith({ strategy: 'email_code' });
  });

  it('signs in on the same email when the account already exists', async () => {
    const { clerk, prepareFirstFactor } = fakeClerk({
      signUpCreate: async () => {
        throw clerkError('form_identifier_exists');
      },
    });
    await expect(sendEmailCode(clerk, 'old@example.com')).resolves.toBe(
      'sign_in',
    );
    expect(prepareFirstFactor).toHaveBeenCalledWith({
      strategy: 'email_code',
      emailAddressId: 'idn_1',
    });
  });

  it('sends an account with no email code to the modal', async () => {
    const { clerk } = fakeClerk({
      signUpCreate: async () => {
        throw clerkError('form_identifier_exists');
      },
      signInFactors: [{ strategy: 'oauth_google' }],
    });
    const error = await sendEmailCode(clerk, 'old@example.com').catch(
      (caught: unknown) => caught,
    );
    expect(error).toBeInstanceOf(EmailCodeError);
    expect((error as EmailCodeError).needsModal).toBe(true);
  });

  it('names a malformed email plainly', async () => {
    const { clerk } = fakeClerk({
      signUpCreate: async () => {
        throw clerkError('form_param_format_invalid');
      },
    });
    await expect(sendEmailCode(clerk, 'nope')).rejects.toThrow(
      'Enter a valid email address.',
    );
  });
});

describe('verifyEmailCode', () => {
  it('activates the new session on a right code', async () => {
    const { clerk, setActive } = fakeClerk({});
    await verifyEmailCode(clerk, 'sign_up', '123456');
    expect(setActive).toHaveBeenCalledWith({ session: 'sess_new' });
  });

  it('activates an existing account on sign-in', async () => {
    const { clerk, setActive } = fakeClerk({});
    await verifyEmailCode(clerk, 'sign_in', '123456');
    expect(setActive).toHaveBeenCalledWith({ session: 'sess_existing' });
  });

  it('says a wrong code is wrong', async () => {
    const { clerk, setActive } = fakeClerk({
      verifyError: clerkError('form_code_incorrect'),
    });
    await expect(verifyEmailCode(clerk, 'sign_up', '000000')).rejects.toThrow(
      'That code isn’t right. Check it and try again.',
    );
    expect(setActive).not.toHaveBeenCalled();
  });

  it('hands an unfinished sign-up to the modal', async () => {
    const { clerk, setActive } = fakeClerk({
      verifyStatus: 'missing_requirements',
    });
    const error = await verifyEmailCode(clerk, 'sign_up', '123456').catch(
      (caught: unknown) => caught,
    );
    expect((error as EmailCodeError).needsModal).toBe(true);
    expect(setActive).not.toHaveBeenCalled();
  });
});

describe('whenClerkReady', () => {
  it('resolves once the overlay publishes the instance', async () => {
    const { clerk } = fakeClerk({});
    const ready = whenClerkReady(1_000);
    publishClerk(clerk);
    await expect(ready).resolves.toBe(clerk);
  });

  it('gives up after the timeout', async () => {
    vi.useFakeTimers();
    const ready = whenClerkReady(50);
    vi.advanceTimersByTime(60);
    await expect(ready).resolves.toBeNull();
    vi.useRealTimers();
  });
});
