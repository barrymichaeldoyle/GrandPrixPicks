import {
  isClerkAPIResponseError,
  useAuth,
  useClerk,
  useSSO,
} from '@clerk/expo';
import { useSignInWithApple } from '@clerk/expo/apple';
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
import type {
  ScrollView as RNScrollView,
  TextInput as RNTextInput,
} from 'react-native';
import { Platform } from 'react-native';

import { BrandMark } from '../../components/ui/BrandMark';
import { captureAnalyticsEvent } from '../../lib/analytics';
import type { RootStackParamList } from '../../navigation/types';
import { useTypography } from '../../theme/typography';
import {
  KeyboardAvoidingView,
  Pressable,
  ScrollView,
  Text,
  View,
} from '../../tw';
import { siteUrl } from '../../lib/siteUrl';
import {
  NOT_READY_MESSAGE,
  clerkMessage,
  isAlreadySignedInError,
  needsUsernameOnly,
  unfinishedAuthMessage,
} from './signInMessages';
import {
  AppleLogo,
  AuthField,
  FormError,
  GoogleLogo,
  PrimaryButton,
  TextLink,
} from './SignInParts';
import { CodeStep, NewPasswordStep, UsernameStep } from './SignInSteps';

WebBrowser.maybeCompleteAuthSession();

type Mode = 'signIn' | 'signUp';
type Screen = 'auth' | 'verify' | 'resetCode' | 'newPassword' | 'username';

type PendingSignUp = NonNullable<ReturnType<typeof useSignUp>['signUp']>;

export function SignInScreen() {
  const { titleFontFamily } = useTypography();
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const { startSSOFlow } = useSSO();
  const { startAppleAuthenticationFlow } = useSignInWithApple();
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
  // A first-time Apple or Google sign-up that Clerk created but cannot finish
  // until it has a username, which this instance requires. Without this step
  // the sheet closed, nothing happened, and every retry did the same.
  const [pendingSignUp, setPendingSignUp] = useState<PendingSignUp | null>(
    null,
  );

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

  const emailRef = useRef<RNTextInput>(null);
  const passwordRef = useRef<RNTextInput>(null);
  const scrollRef = useRef<RNScrollView>(null);

  // The form sits at the bottom of the sheet, so the keyboard covered every
  // field below the one focused (and the submit button). Scroll to the end
  // once the keyboard has shrunk the view.
  function revealForm() {
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 250);
  }
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

  /**
   * Native Sign in with Apple on iOS: the system sheet, Face ID, no browser.
   * The web OAuth flow it replaces opened appleid.apple.com in a browser
   * session and asked for the Apple ID password, which App Review treats as a
   * worse experience than the platform sheet (and which a reviewer notices).
   * Android has no native Apple sheet, so it keeps the browser flow.
   */
  async function handleApple() {
    if (Platform.OS !== 'ios') {
      await handleSSO('oauth_apple');
      return;
    }
    if (!authReady) {
      setError(NOT_READY_MESSAGE);
      return;
    }
    setError(null);
    captureAnalyticsEvent('auth_started', { method: 'apple' });
    setLoading(true);
    try {
      const {
        createdSessionId,
        setActive,
        signUp: appleSignUp,
      } = await startAppleAuthenticationFlow();
      if (createdSessionId) {
        await (setActive ?? clerk.setActive)({ session: createdSessionId });
        captureAnalyticsEvent('auth_completed', { method: 'apple' });
      } else if (needsUsernameOnly(appleSignUp)) {
        askForUsername(appleSignUp!);
      } else if (appleSignUp?.status === 'missing_requirements') {
        setError(unfinishedAuthMessage(appleSignUp.status));
      }
      // Otherwise no session and no throw is a cancelled sheet: say nothing.
    } catch (err) {
      if (isAlreadySignedInError(err)) {
        await clearStuckSession();
        setError('Cleared a stale session. Please try signing in again.');
        return;
      }
      // Clerk rejected Apple's token, which is what happens until the iOS
      // app is registered under Native applications in the Clerk dashboard
      // (bundle ID + team ID). Fall back to the browser flow rather than
      // leave Apple sign-in broken.
      if (isClerkAPIResponseError(err)) {
        console.warn('[auth] native Apple rejected, using browser flow', err);
        setLoading(false);
        await handleSSO('oauth_apple');
        return;
      }
      console.warn('[auth] native Apple flow failed', err);
      captureAnalyticsEvent('auth_failed', { method: 'apple' });
      // expo-apple-authentication's errors carry a code and a Swift file
      // path in the message; neither belongs on screen. "Unknown" is also what
      // iOS returns when the device has no Apple Account and the player
      // closes the prompt to add one.
      const code =
        err && typeof err === 'object' && 'code' in err ? err.code : null;
      setError(
        typeof code === 'string' && code.startsWith('ERR_REQUEST')
          ? 'Apple sign-in did not complete. Try again.'
          : clerkMessage(err, 'Apple sign-in failed'),
      );
    } finally {
      setLoading(false);
    }
  }

  function askForUsername(signUpToFinish: PendingSignUp) {
    setPendingSignUp(signUpToFinish);
    setUsername('');
    setError(null);
    setScreen('username');
  }

  async function handleChooseUsername() {
    if (!pendingSignUp) {
      setScreen('auth');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const result = await pendingSignUp.update({ username: username.trim() });
      if (result.status === 'complete' && result.createdSessionId) {
        await clerk.setActive({ session: result.createdSessionId });
        captureAnalyticsEvent('auth_completed', { method: 'social_sign_up' });
        setPendingSignUp(null);
      } else {
        setError(unfinishedAuthMessage(result.status));
      }
    } catch (err) {
      setError(clerkMessage(err, 'That username could not be saved'));
    } finally {
      setLoading(false);
    }
  }

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
        signUp: ssoSignUp,
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
      if (needsUsernameOnly(ssoSignUp)) {
        askForUsername(ssoSignUp!);
        return;
      }
      if (ssoSignUp?.status === 'missing_requirements') {
        setError(unfinishedAuthMessage(ssoSignUp.status));
        return;
      }
      const status = ssoSignIn?.status ?? null;
      if (status && status !== 'complete') {
        captureAnalyticsEvent('auth_failed', { method });
        setError(unfinishedAuthMessage(status));
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
      } else {
        captureAnalyticsEvent('auth_failed', { method: 'email_sign_in' });
        setError(unfinishedAuthMessage(result.status));
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
      } else {
        captureAnalyticsEvent('auth_failed', { method: 'email_sign_up' });
        setError(unfinishedAuthMessage(result.status));
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
        ref={scrollRef}
      >
        {/* Hero.
            Natural height, never `flex-1`. As a flex child it was the only
            thing absorbing slack, so every difference between the two modes
            landed on it: sign-up adds a username field (+62) and drops the
            "Forgot password?" row (-29), and the hero silently gave up 33px,
            moving the brand mark, the title and everything under them on each
            toggle. Anchored here, and with the form below anchored at both
            ends, only the fields on either side of the username row move. */}
        {/* A way out that can be seen. The sheet is dismissable by swipe,
            but a guest who reached it from a Follow button or a Save did not
            ask to sign in, and a full-height sheet with no control reads as a
            wall. Same control as the pick editors. */}
        <View className="flex-row justify-end px-4 pt-2">
          <Pressable
            accessibilityLabel="Close"
            accessibilityRole="button"
            className="min-h-11 justify-center px-3"
            hitSlop={8}
            onPress={() => {
              if (navigation.canGoBack()) {
                navigation.goBack();
                return;
              }
              navigation.navigate('Tabs');
            }}
          >
            <Text className="text-accent">Close</Text>
          </Pressable>
        </View>
        <View className="items-center justify-center gap-3 px-6 pt-4 pb-10">
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
            <CodeStep
              code={code}
              email={email}
              error={error}
              inputRef={codeRef}
              loading={loading}
              onBack={() => {
                setScreen('auth');
                setCode('');
                setError(null);
              }}
              onChangeCode={(value) => {
                setCode(value);
                setError(null);
              }}
              onResend={
                screen === 'resetCode'
                  ? () => void handleForgotPassword()
                  : undefined
              }
              onSubmit={() =>
                void (screen === 'verify' ? handleVerify() : handleResetCode())
              }
              submitLabel={screen === 'verify' ? 'Verify email' : 'Continue'}
            />
          ) : screen === 'username' ? (
            <UsernameStep
              error={error}
              loading={loading}
              onChangeUsername={(value) => {
                setUsername(value);
                setError(null);
              }}
              onSubmit={() => void handleChooseUsername()}
              username={username}
            />
          ) : screen === 'newPassword' ? (
            <NewPasswordStep
              confirmPassword={confirmPassword}
              confirmRef={confirmPasswordRef}
              error={error}
              loading={loading}
              onChangeConfirmPassword={(value) => {
                setConfirmPassword(value);
                setError(null);
              }}
              onChangePassword={(value) => {
                setPassword(value);
                setError(null);
              }}
              onSubmit={() => void handleResetPassword()}
              password={password}
            />
          ) : (
            /* ── Sign in / Sign up ── */
            <>
              {/* Mode toggle */}
              <View
                accessibilityRole="tablist"
                className="mb-1 flex-row border-b border-border"
              >
                <Pressable
                  accessibilityRole="tab"
                  accessibilityState={{ selected: mode === 'signIn' }}
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
                  accessibilityRole="tab"
                  accessibilityState={{ selected: mode === 'signUp' }}
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
                  onPress={() => void handleApple()}
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
                <AuthField
                  accessibilityLabel="Username"
                  autoCapitalize="none"
                  autoComplete="username-new"
                  autoCorrect={false}
                  onChangeText={(value) => {
                    setUsername(value);
                    setError(null);
                  }}
                  onFocus={revealForm}
                  onSubmitEditing={() => emailRef.current?.focus()}
                  submitBehavior="submit"
                  placeholder="Username"
                  returnKeyType="next"
                  value={username}
                />
              ) : null}
              <AuthField
                accessibilityLabel="Email"
                autoCapitalize="none"
                autoComplete="email"
                autoCorrect={false}
                spellCheck={false}
                keyboardType="email-address"
                onChangeText={(v) => {
                  setEmail(v);
                  setError(null);
                }}
                onFocus={revealForm}
                onSubmitEditing={() => {
                  passwordRef.current?.focus();
                }}
                inputRef={emailRef}
                placeholder="Email"
                returnKeyType="next"
                // Keep the keyboard up while focus moves to the password.
                submitBehavior="submit"
                value={email}
              />
              <AuthField
                accessibilityLabel="Password"
                autoComplete={isSignUp ? 'new-password' : 'password'}
                onChangeText={(v) => {
                  setPassword(v);
                  setError(null);
                }}
                onFocus={revealForm}
                onSubmitEditing={() => {
                  void (isSignUp ? handleSignUp() : handleSignIn());
                }}
                inputRef={passwordRef}
                placeholder="Password"
                returnKeyType="go"
                secureTextEntry
                value={password}
              />
              {!isSignUp ? (
                <TextLink
                  align="right"
                  disabled={loading}
                  label="Forgot password?"
                  onPress={() => void handleForgotPassword()}
                />
              ) : null}
              <PrimaryButton
                enabled={canSubmit}
                label={
                  loading
                    ? isSignUp
                      ? 'Creating account…'
                      : 'Signing in…'
                    : isSignUp
                      ? 'Create account'
                      : 'Sign in'
                }
                onPress={() =>
                  void (isSignUp ? handleSignUp() : handleSignIn())
                }
              />

              <FormError message={error} />

              {isSignUp ? <View nativeID="clerk-captcha" /> : null}

              {/* Terms & Privacy, held at the bottom edge. */}
              <Text className="text-muted mt-auto -mb-2 pt-3 text-center text-xs">
                By continuing you agree to our
              </Text>
              <Text className="text-muted text-center text-xs">
                <Text
                  className="text-xs text-accent-hover underline"
                  onPress={() =>
                    void WebBrowser.openBrowserAsync(siteUrl('/terms'))
                  }
                >
                  Terms of Service
                </Text>
                {' and '}
                <Text
                  className="text-xs text-accent-hover underline"
                  onPress={() =>
                    void WebBrowser.openBrowserAsync(siteUrl('/privacy'))
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
