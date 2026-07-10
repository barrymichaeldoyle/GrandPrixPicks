import {
  useAuth,
  useClerk,
  useSignIn,
  useSignUp,
  useSSO,
} from '@clerk/clerk-expo';
import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import { useEffect, useRef, useState } from 'react';
import type { TextInput as RNTextInput } from 'react-native';
import { Platform } from 'react-native';
import { Path, Svg } from 'react-native-svg';

import { captureAnalyticsEvent } from '../../lib/analytics';
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

type Mode = 'signIn' | 'signUp';
type Screen = 'auth' | 'verify';

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
  const { startSSOFlow } = useSSO();
  const clerk = useClerk();
  const { isLoaded: authLoaded, isSignedIn, sessionId } = useAuth();
  const { signIn, isLoaded: signInLoaded } = useSignIn();
  const { signUp, isLoaded: signUpLoaded } = useSignUp();

  const [mode, setMode] = useState<Mode>('signIn');
  const [screen, setScreen] = useState<Screen>('auth');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const passwordRef = useRef<RNTextInput>(null);
  const codeRef = useRef<RNTextInput>(null);

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
    setError(null);
    const method = strategy === 'oauth_apple' ? 'apple' : 'google';
    captureAnalyticsEvent('auth_started', { method });
    try {
      const { createdSessionId, signIn: ssoSignIn } = await startSSOFlow({
        strategy,
        redirectUrl: AuthSession.makeRedirectUri(),
      });
      if (createdSessionId) {
        await clerk.setActive({ session: createdSessionId });
        captureAnalyticsEvent('auth_completed', { method });
        return;
      }
      // No session was created but the flow didn't throw — most commonly the
      // user dismissed the browser, or signIn returned with a non-complete
      // status (e.g. needs 2FA, requires more info). Surface a clear message
      // instead of leaving the user confused.
      const status = ssoSignIn?.status ?? null;
      if (status && status !== 'complete') {
        setError(`Sign-in needs more steps (status: ${status}).`);
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
    }
  }

  // ── Email sign-in ──────────────────────────────────────────────────────────

  async function handleSignIn() {
    if (!signInLoaded || !signIn) {
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
      return;
    }
    setError(null);
    setLoading(true);
    captureAnalyticsEvent('auth_started', { method: 'email_sign_up' });
    try {
      await signUp.create({ emailAddress: email.trim(), password });
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

  async function handleVerify() {
    if (!signUpLoaded || !signUp) {
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

  const isSignUp = mode === 'signUp';
  const canSubmit = !!email && !!password && !loading;

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className="flex-1 bg-page"
    >
      <ScrollView
        contentContainerClassName="grow"
        keyboardShouldPersistTaps="handled"
      >
        {/* Hero */}
        <View className="flex-1 items-center justify-center gap-3 px-6 py-10">
          <View className="mb-1">
            <AppLogo />
          </View>
          <Text
            className="text-foreground text-4xl font-bold"
            style={titleFontFamily ? { fontFamily: titleFontFamily } : null}
          >
            GrandPrixPicks
          </Text>
          <Text className="text-muted text-center text-base leading-[22px]">
            Predict the top 5 finishers every race weekend.
          </Text>
        </View>

        {/* Actions */}
        <View className="gap-3 border-t border-border px-6 pt-7 pb-12">
          {screen === 'verify' ? (
            /* ── Verification code ── */
            <>
              <Text className="text-foreground text-center text-xl font-bold">
                Check your email
              </Text>
              <Text className="text-muted text-center text-sm leading-5">
                We sent a 6-digit code to {email}. Enter it below to confirm
                your account.
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
                onSubmitEditing={() => void handleVerify()}
                placeholder="000000"
                placeholderTextColor={colors.textMuted}
                ref={codeRef}
                returnKeyType="done"
                textContentType="oneTimeCode"
                value={code}
              />
              <Pressable
                className={`h-[50px] items-center justify-center rounded-lg bg-button-accent ${
                  code.length < 6 || loading ? 'opacity-40' : ''
                }`}
                disabled={code.length < 6 || loading}
                onPress={() => void handleVerify()}
              >
                <Text className="text-foreground text-[15px] font-bold">
                  {loading ? 'Verifying…' : 'Verify email'}
                </Text>
              </Pressable>
              <Pressable
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
          ) : (
            /* ── Sign in / Sign up ── */
            <>
              {/* Mode toggle */}
              <View className="mb-1 flex-row border-b border-border">
                <Pressable
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

              {/* OAuth */}
              {Platform.OS === 'ios' ? (
                <Pressable
                  className="h-[50px] flex-row items-center justify-center gap-3 rounded-lg bg-black active:opacity-80"
                  onPress={() => void handleSSO('oauth_apple')}
                >
                  <AppleLogo />
                  <Text className="text-[17px] font-semibold text-white">
                    {isSignUp ? 'Sign up with Apple' : 'Sign in with Apple'}
                  </Text>
                </Pressable>
              ) : null}
              <Pressable
                className="h-[50px] flex-row items-center justify-center gap-3 rounded-lg bg-white active:opacity-80"
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
              <TextInput
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
              <Pressable
                className={`h-[50px] items-center justify-center rounded-lg bg-button-accent ${
                  !canSubmit ? 'opacity-40' : ''
                }`}
                disabled={!canSubmit}
                onPress={() =>
                  void (isSignUp ? handleSignUp() : handleSignIn())
                }
              >
                <Text className="text-foreground text-[15px] font-bold">
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

              {/* Terms & Privacy */}
              <Text className="text-muted -mb-2 text-center text-xs">
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

// Logo matching the web favicon exactly
function AppLogo() {
  return (
    <Svg height={36} viewBox="0 0 24 24" width={36}>
      <Path
        d="M4 22V4a1 1 0 0 1 .4-.8A6 6 0 0 1 8 2c3 0 5 2 7.333 2q2 0 3.067-.8A1 1 0 0 1 20 4v10a1 1 0 0 1-.4.8A6 6 0 0 1 16 16c-3 0-5-2-8-2a6 6 0 0 0-4 1.528"
        fill="none"
        stroke="#2dd4bf"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
    </Svg>
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
