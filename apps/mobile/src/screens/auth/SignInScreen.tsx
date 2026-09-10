import { useAuth, useClerk, useSSO } from '@clerk/expo';
/*
 * `useSignIn` / `useSignUp` come from `@clerk/expo/legacy`.
 *
 * Clerk Core 3 replaced the default exports of these two hooks with a
 * signals API: `useSignIn()` now returns a `SignInSignalValue` with no
 * `isLoaded`, and the create/attempt calls resolve to `{ error }` instead of
 * a resource carrying `status` and `createdSessionId`. Every other Clerk
 * hook kept its shape across the major.
 *
 * The legacy entry point is Clerk's own supported path for exactly this, and
 * it keeps the custom email + SSO flows below behaving identically through
 * the upgrade. Moving them to the signals API is a separate piece of work,
 * worth doing deliberately rather than folding into a package rename.
 */
import { useSignIn, useSignUp } from '@clerk/expo/legacy';
import type { NavigationProp } from '@react-navigation/native';
import { useNavigation } from '@react-navigation/native';
import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import { useEffect, useRef, useState } from 'react';
import type { TextInput as RNTextInput } from 'react-native';
import { Platform } from 'react-native';
import { Path, Svg } from 'react-native-svg';

import { BrandMark } from '../../components/ui/BrandMark';
import { captureAnalyticsEvent } from '../../lib/analytics';
import type { RootStackParamList } from '../../navigation/types';
import { colors } from '../../theme/tokens';
import { useTypography } from '../../theme/typography';
import {
  KeyboardAvoidingView,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from '../../tw';

WebBrowser.maybeCompleteAuthSession();

const WEB_URL = 'https://grandprixpicks.com';

/** Shown when Clerk has not produced a client, so no button here can work. */
const NOT_READY_MESSAGE =
  'Sign-in is not ready yet. Check your connection and try again.';

/**
 * Primary button styling, with a disabled state that is a state rather than a
 * dimmed version of the enabled one.
 *
 * `opacity-40` over `bg-button-accent` turned chartreuse into a murky olive
 * and the white label into low-contrast grey — it read as a rendering fault,
 * not as "fill this in first". A flat surface with muted text is the system's
 * own vocabulary for an inert container and states the same thing legibly.
 */
function primaryButtonClass(enabled: boolean): string {
  return `h-[50px] items-center justify-center rounded-lg ${
    enabled
      ? 'bg-button-accent active:bg-accent-press'
      : 'border border-border bg-surface'
  }`;
}

function primaryButtonTextClass(enabled: boolean): string {
  return `text-[15px] font-bold ${
    enabled ? 'text-text-on-accent' : 'text-muted'
  }`;
}

type Mode = 'signIn' | 'signUp';
type Screen = 'auth' | 'verify' | 'resetCode' | 'newPassword';

function clerkMessage(err: unknown, fallback: string): string {
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

function isAlreadySignedInError(err: unknown): boolean {
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

export function SignInScreen() {
  const { titleFontFamily } = useTypography();
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const { startSSOFlow } = useSSO();
  const clerk = useClerk();
  const { isLoaded: authLoaded, isSignedIn, sessionId } = useAuth();
  const { signIn, isLoaded: signInLoaded } = useSignIn();
  const { signUp, isLoaded: signUpLoaded } = useSignUp();

  const [mode, setMode] = useState<Mode>('signIn');
  const [screen, setScreen] = useState<Screen>('auth');

  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Whether Clerk's sign-in/sign-up resources are usable yet.
   *
   * Every handler on this screen used to open with `if (!signInLoaded) return`
   * and Clerk's own `startSSOFlow` does the same internally, so when the client
   * resource never arrived, all five buttons swallowed the tap: no browser, no
   * spinner, no message, and no network request. A dead button is
   * indistinguishable from a broken app, so nothing here fails silently any
   * more — the controls go inert and say why, and a handler reached in that
   * state reports it.
   */
  const authReady = signInLoaded && signUpLoaded && !!signIn && !!signUp;

  const passwordRef = useRef<RNTextInput>(null);
  const confirmPasswordRef = useRef<RNTextInput>(null);
  const codeRef = useRef<RNTextInput>(null);

  // The sheet is a route, not a gate. Successful auth used to leave it up:
  // `setActive` flipped the session and every handler just `return`ed. Pop
  // the moment there is a session so a signed-in viewer cannot stay here.
  useEffect(() => {
    if (!isSignedIn) {
      return;
    }
    if (navigation.canGoBack()) {
      navigation.goBack();
      return;
    }
    navigation.navigate('Tabs');
  }, [isSignedIn, navigation]);

  // Recovery for the case where Clerk has a session resource on the device
  // but `setActive` never fired (e.g. OAuth flow returned a session and then
  // threw before activating it). Without this, the user sees "You're already
  // signed in" on every subsequent attempt because client.signIn is non-empty
  // while useAuth().isSignedIn is still false.
  useEffect(() => {
    if (!authLoaded || isSignedIn) {
      return;
    }
    const sessions = clerk.client?.sessions ?? [];
    const active = sessions.find((s) => s.status === 'active');
    if (active && clerk.setActive) {
      void clerk.setActive({ session: active.id }).catch(() => {
        // If activation fails, clear the stuck state so the user can retry.
        void clerk.signOut().catch(() => {});
      });
    }
  }, [authLoaded, isSignedIn, sessionId, clerk]);

  function switchMode(next: Mode) {
    setMode(next);
    setError(null);
    setPassword('');
    setConfirmPassword('');
  }

  async function clearStuckSession() {
    try {
      await clerk.signOut();
      setError(null);
    } catch (err) {
      setError(clerkMessage(err, 'Could not clear session'));
    }
  }

  // ── OAuth ──────────────────────────────────────────────────────────────────

  async function handleSSO(strategy: 'oauth_google' | 'oauth_apple') {
    if (!authReady) {
      setError(NOT_READY_MESSAGE);
      return;
    }
    setError(null);
    const method = strategy === 'oauth_apple' ? 'apple' : 'google';
    captureAnalyticsEvent('auth_started', { method });
    setLoading(true);
    try {
      const {
        createdSessionId,
        signIn: ssoSignIn,
        authSessionResult,
      } = await startSSOFlow({
        strategy,
        // `sso-callback` is Clerk's own default path, and the path matters:
        // a bare `grandprixpicks://` redirect collides with the deep-link
        // prefix React Navigation already claims in `navigation/linking.ts`.
        redirectUrl: AuthSession.makeRedirectUri({ path: 'sso-callback' }),
      });
      if (createdSessionId) {
        await clerk.setActive({ session: createdSessionId });
        captureAnalyticsEvent('auth_completed', { method });
        return;
      }
      // No session, and no throw. That is a dismissed browser, a sign-in that
      // needs more steps (2FA, more info), or Clerk's own internal `isLoaded`
      // guard bailing before it made a request. Only the dismissal is
      // silent-worthy; the rest have to say something.
      const status = ssoSignIn?.status ?? null;
      if (status && status !== 'complete') {
        setError(`Sign-in needs more steps (status: ${status}).`);
      } else if (authSessionResult?.type !== 'cancel') {
        captureAnalyticsEvent('auth_failed', { method });
        setError('Sign-in did not complete. Try again.');
      }
    } catch (err) {
      if (isAlreadySignedInError(err)) {
        // Clerk has a session on the device that never got activated. Clear
        // it so the next tap starts fresh.
        await clearStuckSession();
        setError('Cleared a stale session. Please try signing in again.');
        return;
      }
      // Log the full error so we can see what's actually going wrong.
      console.warn(`[auth] ${strategy} flow failed`, err);
      captureAnalyticsEvent('auth_failed', { method });
      setError(
        clerkMessage(
          err,
          strategy === 'oauth_google'
            ? 'Google sign-in failed'
            : 'Apple sign-in failed',
        ),
      );
    } finally {
      setLoading(false);
    }
  }

  // ── Email sign-in ──────────────────────────────────────────────────────────

  async function handleSignIn() {
    if (!signInLoaded || !signIn) {
      setError(NOT_READY_MESSAGE);
      return;
    }
    setError(null);
    setLoading(true);
    captureAnalyticsEvent('auth_started', { method: 'email_sign_in' });
    try {
      const result = await signIn.create({
        identifier: email.trim(),
        password,
      });
      if (result.status === 'complete') {
        await clerk.setActive({ session: result.createdSessionId });
        captureAnalyticsEvent('auth_completed', { method: 'email_sign_in' });
      }
    } catch (err) {
      captureAnalyticsEvent('auth_failed', { method: 'email_sign_in' });
      if (isAlreadySignedInError(err)) {
        await clearStuckSession();
        setError('Cleared a stale session. Please try signing in again.');
      } else {
        setError(clerkMessage(err, 'Sign-in failed'));
      }
    } finally {
      setLoading(false);
    }
  }

  // ── Email sign-up ──────────────────────────────────────────────────────────

  async function handleSignUp() {
    if (!signUpLoaded || !signUp) {
      setError(NOT_READY_MESSAGE);
      return;
    }
    setError(null);
    setLoading(true);
    captureAnalyticsEvent('auth_started', { method: 'email_sign_up' });
    try {
      await signUp.create({
        emailAddress: email.trim(),
        password,
        username: username.trim(),
      });
      await signUp.prepareEmailAddressVerification({ strategy: 'email_code' });
      setScreen('verify');
    } catch (err) {
      captureAnalyticsEvent('auth_failed', { method: 'email_sign_up' });
      if (isAlreadySignedInError(err)) {
        await clearStuckSession();
        setError('Cleared a stale session. Please try signing up again.');
      } else {
        setError(clerkMessage(err, 'Sign-up failed'));
      }
    } finally {
      setLoading(false);
    }
  }

  // ── Password reset ────────────────────────────────────────────────────────

  async function handleForgotPassword() {
    if (!signInLoaded || !signIn) {
      setError(NOT_READY_MESSAGE);
      return;
    }
    if (!email.trim()) {
      setError('Enter your email first.');
      return;
    }
    setError(null);
    setLoading(true);
    captureAnalyticsEvent('auth_started', { method: 'password_reset' });
    try {
      await signIn.create({
        identifier: email.trim(),
        strategy: 'reset_password_email_code',
      });
      setCode('');
      setPassword('');
      setConfirmPassword('');
      setScreen('resetCode');
    } catch (err) {
      captureAnalyticsEvent('auth_failed', { method: 'password_reset' });
      setError(clerkMessage(err, 'Could not send reset code'));
    } finally {
      setLoading(false);
    }
  }

  async function handleResetCode() {
    if (!signInLoaded || !signIn) {
      setError(NOT_READY_MESSAGE);
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const result = await signIn.attemptFirstFactor({
        strategy: 'reset_password_email_code',
        code,
      });
      if (result.status === 'needs_new_password') {
        setScreen('newPassword');
      } else {
        setError('Password reset could not continue. Request a new code.');
      }
    } catch (err) {
      setError(clerkMessage(err, 'Invalid code'));
    } finally {
      setLoading(false);
    }
  }

  async function handleResetPassword() {
    if (!signInLoaded || !signIn) {
      setError(NOT_READY_MESSAGE);
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const result = await signIn.resetPassword({ password });
      if (result.status === 'complete' && result.createdSessionId) {
        await clerk.setActive({ session: result.createdSessionId });
        captureAnalyticsEvent('auth_completed', { method: 'password_reset' });
      } else {
        setError('Password was reset. Sign in with your new password.');
        setScreen('auth');
      }
    } catch (err) {
      captureAnalyticsEvent('auth_failed', { method: 'password_reset' });
      setError(clerkMessage(err, 'Could not reset password'));
    } finally {
      setLoading(false);
    }
  }

  async function handleVerify() {
    if (!signUpLoaded || !signUp) {
      setError(NOT_READY_MESSAGE);
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const result = await signUp.attemptEmailAddressVerification({ code });
      if (result.status === 'complete') {
        await clerk.setActive({ session: result.createdSessionId });
        captureAnalyticsEvent('auth_completed', { method: 'email_sign_up' });
      }
    } catch (err) {
      if (isAlreadySignedInError(err)) {
        await clearStuckSession();
        setError('Cleared a stale session. Please try signing up again.');
      } else {
        setError(clerkMessage(err, 'Invalid code'));
      }
    } finally {
      setLoading(false);
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  if (isSignedIn) {
    return <View className="flex-1 bg-page" />;
  }

  const isSignUp = mode === 'signUp';
  const canSubmit =
    authReady &&
    !!email &&
    !!password &&
    (!isSignUp || username.trim().length >= 4) &&
    !loading;

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className="flex-1 bg-page"
    >
      <ScrollView
        contentContainerClassName="grow"
        keyboardShouldPersistTaps="handled"
      >
        {/* Hero.
            Natural height, never `flex-1`. As a flex child it was the only
            thing absorbing slack, so every difference between the two modes
            landed on it: sign-up adds a username field (+62) and drops the
            "Forgot password?" row (-29), and the hero silently gave up 33px,
            moving the brand mark, the title and everything under them on each
            toggle. Anchored here, and with the form below anchored at both
            ends, only the fields on either side of the username row move. */}
        <View className="items-center justify-center gap-3 px-6 py-10">
          <View className="mb-1">
            <BrandMark />
          </View>
          <Text
            className="text-foreground text-4xl font-bold"
            style={titleFontFamily ? { fontFamily: titleFontFamily } : null}
          >
            Grand Prix Picks
          </Text>
          <Text className="text-muted text-center text-base leading-[22px]">
            Pick your Top 5. Choose who finishes ahead in each team.
          </Text>
        </View>

        {/* Actions. `flex-1` so the leftover height collects *inside* this
            block rather than above it, which keeps the tab row, both SSO
            buttons and the divider still across a mode switch. */}
        <View className="flex-1 gap-3 border-t border-border px-6 pt-7 pb-12">
          {screen === 'verify' || screen === 'resetCode' ? (
            /* ── Verification code ── */
            <>
              <Text className="text-foreground text-center text-xl font-bold">
                Check your email
              </Text>
              <Text className="text-muted text-center text-sm leading-5">
                We sent a 6-digit code to {email}.
              </Text>
              <TextInput
                autoComplete="one-time-code"
                className="text-foreground h-[50px] rounded-md border border-border bg-surface px-3.5 text-center text-2xl tracking-[8px]"
                keyboardType="number-pad"
                maxLength={6}
                onChangeText={(v) => {
                  setCode(v);
                  setError(null);
                }}
                onSubmitEditing={() =>
                  void (screen === 'verify'
                    ? handleVerify()
                    : handleResetCode())
                }
                placeholder="000000"
                placeholderTextColor={colors.textMuted}
                ref={codeRef}
                returnKeyType="done"
                textContentType="oneTimeCode"
                value={code}
              />
              <Pressable
                accessibilityRole="button"
                className={primaryButtonClass(code.length === 6 && !loading)}
                disabled={code.length < 6 || loading}
                onPress={() =>
                  void (screen === 'verify'
                    ? handleVerify()
                    : handleResetCode())
                }
              >
                <Text
                  className={primaryButtonTextClass(
                    code.length === 6 && !loading,
                  )}
                >
                  {loading
                    ? 'Verifying…'
                    : screen === 'verify'
                      ? 'Verify email'
                      : 'Continue'}
                </Text>
              </Pressable>
              {screen === 'resetCode' ? (
                <Pressable
                  accessibilityRole="button"
                  disabled={loading}
                  onPress={() => void handleForgotPassword()}
                >
                  <Text className="text-center text-[13px] text-accent-hover">
                    Resend code
                  </Text>
                </Pressable>
              ) : null}
              <Pressable
                accessibilityRole="button"
                onPress={() => {
                  setScreen('auth');
                  setCode('');
                  setError(null);
                }}
              >
                <Text className="text-center text-[13px] text-accent-hover">
                  ← Back
                </Text>
              </Pressable>
              {error ? (
                <Text className="text-center text-[13px] text-error">
                  {error}
                </Text>
              ) : null}
            </>
          ) : screen === 'newPassword' ? (
            <>
              <Text className="text-foreground text-center text-xl font-bold">
                Set a new password
              </Text>
              <TextInput
                accessibilityLabel="New password"
                autoComplete="new-password"
                className="text-foreground h-[50px] rounded-md border border-border bg-surface px-3.5 text-[15px]"
                onChangeText={(value) => {
                  setPassword(value);
                  setError(null);
                }}
                onSubmitEditing={() => confirmPasswordRef.current?.focus()}
                placeholder="New password"
                placeholderTextColor={colors.textMuted}
                returnKeyType="next"
                secureTextEntry
                value={password}
              />
              <TextInput
                accessibilityLabel="Confirm new password"
                autoComplete="new-password"
                className="text-foreground h-[50px] rounded-md border border-border bg-surface px-3.5 text-[15px]"
                onChangeText={(value) => {
                  setConfirmPassword(value);
                  setError(null);
                }}
                onSubmitEditing={() => void handleResetPassword()}
                placeholder="Confirm new password"
                placeholderTextColor={colors.textMuted}
                ref={confirmPasswordRef}
                returnKeyType="go"
                secureTextEntry
                value={confirmPassword}
              />
              <Pressable
                accessibilityRole="button"
                className={primaryButtonClass(
                  Boolean(password && confirmPassword) && !loading,
                )}
                disabled={!password || !confirmPassword || loading}
                onPress={() => void handleResetPassword()}
              >
                <Text
                  className={primaryButtonTextClass(
                    Boolean(password && confirmPassword) && !loading,
                  )}
                >
                  {loading ? 'Saving…' : 'Save password'}
                </Text>
              </Pressable>
              {error ? (
                <Text className="text-center text-[13px] text-error">
                  {error}
                </Text>
              ) : null}
            </>
          ) : (
            /* ── Sign in / Sign up ── */
            <>
              {/* Mode toggle */}
              <View className="mb-1 flex-row border-b border-border">
                <Pressable
                  accessibilityRole="button"
                  className={`flex-1 items-center border-b-2 py-2.5 ${
                    mode === 'signIn' ? 'border-accent' : 'border-transparent'
                  }`}
                  onPress={() => {
                    switchMode('signIn');
                  }}
                >
                  <Text
                    className={`text-[13px] font-bold ${
                      mode === 'signIn' ? 'text-foreground' : 'text-muted'
                    }`}
                  >
                    Sign in
                  </Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  className={`flex-1 items-center border-b-2 py-2.5 ${
                    mode === 'signUp' ? 'border-accent' : 'border-transparent'
                  }`}
                  onPress={() => {
                    switchMode('signUp');
                  }}
                >
                  <Text
                    className={`text-[13px] font-bold ${
                      mode === 'signUp' ? 'text-foreground' : 'text-muted'
                    }`}
                  >
                    Sign up
                  </Text>
                </Pressable>
              </View>

              {!authReady ? (
                <Text className="text-muted pb-1 text-center text-[13px]">
                  {NOT_READY_MESSAGE}
                </Text>
              ) : null}

              {/* OAuth */}
              {Platform.OS === 'ios' ? (
                <Pressable
                  accessibilityLabel={
                    isSignUp ? 'Sign up with Apple' : 'Sign in with Apple'
                  }
                  accessibilityRole="button"
                  className={`h-[50px] flex-row items-center justify-center gap-3 rounded-lg bg-black ${
                    authReady ? 'active:opacity-80' : 'opacity-50'
                  }`}
                  disabled={!authReady || loading}
                  onPress={() => void handleSSO('oauth_apple')}
                >
                  <AppleLogo />
                  <Text className="text-[17px] font-semibold text-white">
                    {isSignUp ? 'Sign up with Apple' : 'Sign in with Apple'}
                  </Text>
                </Pressable>
              ) : null}
              <Pressable
                accessibilityLabel={
                  isSignUp ? 'Sign up with Google' : 'Sign in with Google'
                }
                accessibilityRole="button"
                className={`h-[50px] flex-row items-center justify-center gap-3 rounded-lg bg-white ${
                  authReady ? 'active:opacity-80' : 'opacity-50'
                }`}
                disabled={!authReady || loading}
                onPress={() => void handleSSO('oauth_google')}
              >
                <GoogleLogo />
                <Text className="text-[17px] font-semibold text-[#3c4043]">
                  {isSignUp ? 'Sign up with Google' : 'Sign in with Google'}
                </Text>
              </Pressable>

              {/* Divider */}
              <View className="my-1 flex-row items-center gap-2.5">
                <View className="h-px flex-1 bg-border" />
                <Text className="text-muted text-xs">or</Text>
                <View className="h-px flex-1 bg-border" />
              </View>

              {/* Email / password */}
              {isSignUp ? (
                <TextInput
                  accessibilityLabel="Username"
                  autoCapitalize="none"
                  autoComplete="username-new"
                  className="text-foreground h-[50px] rounded-md border border-border bg-surface px-3.5 text-[15px]"
                  onChangeText={(value) => {
                    setUsername(value);
                    setError(null);
                  }}
                  placeholder="Username"
                  placeholderTextColor={colors.textMuted}
                  returnKeyType="next"
                  value={username}
                />
              ) : null}
              <TextInput
                accessibilityLabel="Email"
                autoCapitalize="none"
                autoComplete="email"
                className="text-foreground h-[50px] rounded-md border border-border bg-surface px-3.5 text-[15px]"
                keyboardType="email-address"
                onChangeText={(v) => {
                  setEmail(v);
                  setError(null);
                }}
                onSubmitEditing={() => {
                  passwordRef.current?.focus();
                }}
                placeholder="Email"
                placeholderTextColor={colors.textMuted}
                returnKeyType="next"
                value={email}
              />
              <TextInput
                accessibilityLabel="Password"
                autoComplete={isSignUp ? 'new-password' : 'password'}
                className="text-foreground h-[50px] rounded-md border border-border bg-surface px-3.5 text-[15px]"
                onChangeText={(v) => {
                  setPassword(v);
                  setError(null);
                }}
                onSubmitEditing={() => {
                  void (isSignUp ? handleSignUp() : handleSignIn());
                }}
                placeholder="Password"
                placeholderTextColor={colors.textMuted}
                ref={passwordRef}
                returnKeyType="go"
                secureTextEntry
                value={password}
              />
              {!isSignUp ? (
                <Pressable
                  accessibilityRole="button"
                  disabled={loading}
                  onPress={() => void handleForgotPassword()}
                >
                  <Text className="text-right text-[13px] text-accent-hover">
                    Forgot password?
                  </Text>
                </Pressable>
              ) : null}
              <Pressable
                accessibilityRole="button"
                className={primaryButtonClass(canSubmit)}
                disabled={!canSubmit}
                onPress={() =>
                  void (isSignUp ? handleSignUp() : handleSignIn())
                }
              >
                <Text className={primaryButtonTextClass(canSubmit)}>
                  {loading
                    ? isSignUp
                      ? 'Creating account…'
                      : 'Signing in…'
                    : isSignUp
                      ? 'Create account'
                      : 'Sign in'}
                </Text>
              </Pressable>

              {error ? (
                <Text className="text-center text-[13px] text-error">
                  {error}
                </Text>
              ) : null}

              {isSignUp ? <View nativeID="clerk-captcha" /> : null}

              {/* Terms & Privacy, held at the bottom edge. */}
              <Text className="text-muted mt-auto -mb-2 pt-3 text-center text-xs">
                By continuing you agree to our
              </Text>
              <Text className="text-muted text-center text-xs">
                <Text
                  className="text-xs text-accent-hover underline"
                  onPress={() =>
                    void WebBrowser.openBrowserAsync(`${WEB_URL}/terms`)
                  }
                >
                  Terms of Service
                </Text>
                {' and '}
                <Text
                  className="text-xs text-accent-hover underline"
                  onPress={() =>
                    void WebBrowser.openBrowserAsync(`${WEB_URL}/privacy`)
                  }
                >
                  Privacy Policy
                </Text>
              </Text>
            </>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// Apple logo glyph (white on black, matches HIG "Sign in with Apple" mark).
function AppleLogo() {
  return (
    <Svg height={20} viewBox="0 0 24 24" width={20}>
      <Path
        d="M17.05 12.04c-.03-2.6 2.12-3.85 2.22-3.91-1.21-1.77-3.1-2.01-3.77-2.04-1.6-.16-3.13.94-3.95.94-.83 0-2.07-.92-3.41-.89-1.75.03-3.37 1.02-4.27 2.59-1.83 3.17-.47 7.85 1.31 10.41.87 1.26 1.91 2.66 3.27 2.61 1.32-.05 1.82-.85 3.42-.85 1.59 0 2.04.85 3.43.82 1.42-.02 2.31-1.27 3.17-2.54.99-1.46 1.4-2.88 1.42-2.96-.03-.01-2.72-1.05-2.75-4.14zM14.5 4.6c.72-.87 1.21-2.08 1.07-3.29-1.04.04-2.3.69-3.04 1.56-.66.77-1.25 2.01-1.09 3.2 1.16.09 2.34-.59 3.06-1.47z"
        fill="#ffffff"
      />
    </Svg>
  );
}

// Google "G" logo using official brand colours
function GoogleLogo() {
  return (
    <Svg height={20} viewBox="0 0 24 24" width={20}>
      <Path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        fill="#4285F4"
      />
      <Path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <Path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
        fill="#FBBC05"
      />
      <Path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </Svg>
  );
}
