import { describe, expect, it } from 'vitest';

import {
  clerkMessage,
  isAlreadySignedInError,
  needsUsernameOnly,
  unfinishedAuthMessage,
} from './signInMessages';

describe('needsUsernameOnly', () => {
  it('asks for a username when that is all the sign-up lacks', () => {
    expect(
      needsUsernameOnly({
        status: 'missing_requirements',
        missingFields: ['username'],
      }),
    ).toBe(true);
  });

  it('leaves other missing fields to the web', () => {
    expect(
      needsUsernameOnly({
        status: 'missing_requirements',
        missingFields: ['username', 'phone_number'],
      }),
    ).toBe(false);
    expect(
      needsUsernameOnly({ status: 'missing_requirements', missingFields: [] }),
    ).toBe(false);
    expect(
      needsUsernameOnly({ status: 'complete', missingFields: ['username'] }),
    ).toBe(false);
    expect(needsUsernameOnly(null)).toBe(false);
  });
});

describe('unfinishedAuthMessage', () => {
  it('never shows a raw Clerk status', () => {
    for (const status of ['needs_identifier', 'abandoned', null, undefined]) {
      expect(unfinishedAuthMessage(status)).toBe(
        'Sign-in did not complete. Try again.',
      );
    }
  });

  it('sends a password reset to "Forgot password?"', () => {
    expect(unfinishedAuthMessage('needs_new_password')).toContain(
      'Forgot password?',
    );
  });
});

describe('clerkMessage', () => {
  it('prefers the long message, then the short, then the fallback', () => {
    expect(
      clerkMessage(
        { errors: [{ longMessage: 'Long', message: 'Short' }] },
        'Fallback',
      ),
    ).toBe('Long');
    expect(clerkMessage({ errors: [{ message: 'Short' }] }, 'Fallback')).toBe(
      'Short',
    );
    expect(clerkMessage({}, 'Fallback')).toBe('Fallback');
  });
});

describe('isAlreadySignedInError', () => {
  it('matches by code or by message', () => {
    expect(
      isAlreadySignedInError({ errors: [{ code: 'session_exists' }] }),
    ).toBe(true);
    expect(
      isAlreadySignedInError({ message: "You're already signed in." }),
    ).toBe(true);
    expect(
      isAlreadySignedInError({ errors: [{ code: 'form_password' }] }),
    ).toBe(false);
  });
});
