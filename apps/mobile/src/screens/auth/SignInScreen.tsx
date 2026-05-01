import { useOAuth, useSignIn, useSignUp } from '@clerk/clerk-expo';
import * as AppleAuthentication from 'expo-apple-authentication';
import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import { useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Path, Svg } from 'react-native-svg';

import { colors, radii } from '../../theme/tokens';
import { useTypography } from '../../theme/typography';

WebBrowser.maybeCompleteAuthSession();

const WEB_URL = 'https://grandprixpicks.com';

type Mode = 'signIn' | 'signUp';
type Screen = 'auth' | 'verify';

function clerkMessage(err: unknown, fallback: string): string {
  const e = err as {
    errors?: Array<{ longMessage?: string; message?: string }>;
  };
  return e.errors?.[0]?.longMessage ?? e.errors?.[0]?.message ?? fallback;
}

export function SignInScreen() {
  const { titleFontFamily } = useTypography();
  const { startOAuthFlow: startGoogleFlow } = useOAuth({
    strategy: 'oauth_google',
  });
  const { startOAuthFlow: startAppleFlow } = useOAuth({
    strategy: 'oauth_apple',
  });
  const {
    signIn,
    setActive: setSignInActive,
    isLoaded: signInLoaded,
  } = useSignIn();
  const {
    signUp,
    setActive: setSignUpActive,
    isLoaded: signUpLoaded,
  } = useSignUp();

  const [mode, setMode] = useState<Mode>('signIn');
  const [screen, setScreen] = useState<Screen>('auth');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const passwordRef = useRef<TextInput>(null);
  const codeRef = useRef<TextInput>(null);

  function switchMode(next: Mode) {
    setMode(next);
    setError(null);
    setPassword('');
  }

  // ── OAuth ──────────────────────────────────────────────────────────────────

  async function handleGoogle() {
    try {
      setError(null);
      const { createdSessionId, setActive } = await startGoogleFlow({
        redirectUrl: AuthSession.makeRedirectUri(),
      });
      if (createdSessionId && setActive) {
        await setActive({ session: createdSessionId });
      }
    } catch (err) {
      setError(clerkMessage(err, 'Google sign-in failed'));
    }
  }

  async function handleApple() {
    try {
      setError(null);
      const { createdSessionId, setActive } = await startAppleFlow({
        redirectUrl: AuthSession.makeRedirectUri(),
      });
      if (createdSessionId && setActive) {
        await setActive({ session: createdSessionId });
      }
    } catch (err) {
      setError(clerkMessage(err, 'Apple sign-in failed'));
    }
  }

  // ── Email sign-in ──────────────────────────────────────────────────────────

  async function handleSignIn() {
    if (!signInLoaded || !signIn) {
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const result = await signIn.create({
        identifier: email.trim(),
        password,
      });
      if (result.status === 'complete' && setSignInActive) {
        await setSignInActive({ session: result.createdSessionId });
      }
    } catch (err) {
      setError(clerkMessage(err, 'Sign-in failed'));
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
    try {
      await signUp.create({ emailAddress: email.trim(), password });
      await signUp.prepareEmailAddressVerification({ strategy: 'email_code' });
      setScreen('verify');
    } catch (err) {
      setError(clerkMessage(err, 'Sign-up failed'));
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
      if (result.status === 'complete' && setSignUpActive) {
        await setSignUpActive({ session: result.createdSessionId });
      }
    } catch (err) {
      setError(clerkMessage(err, 'Invalid code'));
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
      style={styles.screen}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* Hero */}
        <View style={styles.hero}>
          <View style={styles.logoMark}>
            <AppLogo />
          </View>
          <Text
            style={[
              styles.title,
              titleFontFamily ? { fontFamily: titleFontFamily } : null,
            ]}
          >
            GrandPrixPicks
          </Text>
          <Text style={styles.subtitle}>
            Predict the top 5 finishers every race weekend.
          </Text>
        </View>

        {/* Actions */}
        <View style={styles.actions}>
          {screen === 'verify' ? (
            /* ── Verification code ── */
            <>
              <Text style={styles.verifyHeading}>Check your email</Text>
              <Text style={styles.verifyBody}>
                We sent a 6-digit code to {email}. Enter it below to confirm
                your account.
              </Text>
              <TextInput
                autoComplete="one-time-code"
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
                style={[styles.input, styles.inputCode]}
                textContentType="oneTimeCode"
                value={code}
              />
              <Pressable
                disabled={code.length < 6 || loading}
                onPress={() => void handleVerify()}
                style={[
                  styles.submitButton,
                  code.length < 6 || loading
                    ? styles.submitButtonDisabled
                    : null,
                ]}
              >
                <Text style={styles.submitButtonText}>
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
                <Text style={styles.switchText}>← Back</Text>
              </Pressable>
              {error ? <Text style={styles.errorText}>{error}</Text> : null}
            </>
          ) : (
            /* ── Sign in / Sign up ── */
            <>
              {/* Mode toggle */}
              <View style={styles.toggle}>
                <Pressable
                  onPress={() => {
                    switchMode('signIn');
                  }}
                  style={[
                    styles.toggleTab,
                    mode === 'signIn' ? styles.toggleTabActive : null,
                  ]}
                >
                  <Text
                    style={[
                      styles.toggleText,
                      mode === 'signIn' ? styles.toggleTextActive : null,
                    ]}
                  >
                    Sign in
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => {
                    switchMode('signUp');
                  }}
                  style={[
                    styles.toggleTab,
                    mode === 'signUp' ? styles.toggleTabActive : null,
                  ]}
                >
                  <Text
                    style={[
                      styles.toggleText,
                      mode === 'signUp' ? styles.toggleTextActive : null,
                    ]}
                  >
                    Sign up
                  </Text>
                </Pressable>
              </View>

              {/* OAuth */}
              {Platform.OS === 'ios' ? (
                <AppleAuthentication.AppleAuthenticationButton
                  buttonStyle={
                    AppleAuthentication.AppleAuthenticationButtonStyle.BLACK
                  }
                  buttonType={
                    isSignUp
                      ? AppleAuthentication.AppleAuthenticationButtonType
                          .SIGN_UP
                      : AppleAuthentication.AppleAuthenticationButtonType
                          .SIGN_IN
                  }
                  cornerRadius={radii.lg}
                  onPress={() => void handleApple()}
                  style={styles.appleButton}
                />
              ) : null}
              <Pressable
                onPress={() => void handleGoogle()}
                style={styles.googleButton}
              >
                <GoogleLogo />
                <Text style={styles.googleButtonText}>
                  {isSignUp ? 'Sign up with Google' : 'Sign in with Google'}
                </Text>
              </Pressable>

              {/* Divider */}
              <View style={styles.divider}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>or</Text>
                <View style={styles.dividerLine} />
              </View>

              {/* Email / password */}
              <TextInput
                autoCapitalize="none"
                autoComplete="email"
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
                style={styles.input}
                value={email}
              />
              <TextInput
                autoComplete={isSignUp ? 'new-password' : 'password'}
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
                style={styles.input}
                value={password}
              />
              <Pressable
                disabled={!canSubmit}
                onPress={() =>
                  void (isSignUp ? handleSignUp() : handleSignIn())
                }
                style={[
                  styles.submitButton,
                  !canSubmit ? styles.submitButtonDisabled : null,
                ]}
              >
                <Text style={styles.submitButtonText}>
                  {loading
                    ? isSignUp
                      ? 'Creating account…'
                      : 'Signing in…'
                    : isSignUp
                      ? 'Create account'
                      : 'Sign in'}
                </Text>
              </Pressable>

              {error ? <Text style={styles.errorText}>{error}</Text> : null}

              {/* Terms & Privacy */}
              <Text style={styles.legal}>By continuing you agree to our</Text>
              <Text style={styles.legal}>
                <Text
                  onPress={() =>
                    void WebBrowser.openBrowserAsync(`${WEB_URL}/terms`)
                  }
                  style={styles.legalLink}
                >
                  Terms of Service
                </Text>
                {' and '}
                <Text
                  onPress={() =>
                    void WebBrowser.openBrowserAsync(`${WEB_URL}/privacy`)
                  }
                  style={styles.legalLink}
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

const styles = StyleSheet.create({
  actions: {
    backgroundColor: colors.surface,
    borderTopColor: colors.border,
    borderTopWidth: 1,
    gap: 12,
    paddingBottom: 48,
    paddingHorizontal: 24,
    paddingTop: 24,
  },
  appleButton: {
    height: 50,
    width: '100%',
  },
  divider: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
    marginVertical: 4,
  },
  dividerLine: {
    backgroundColor: colors.border,
    flex: 1,
    height: 1,
  },
  dividerText: {
    color: colors.textMuted,
    fontSize: 12,
  },
  errorText: {
    color: colors.error,
    fontSize: 13,
    textAlign: 'center',
  },
  googleButton: {
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: radii.lg,
    flexDirection: 'row',
    gap: 12,
    height: 50,
    justifyContent: 'center',
  },
  googleButtonText: {
    color: '#3c4043',
    fontSize: 17,
    fontWeight: '600',
  },
  hero: {
    alignItems: 'center',
    flex: 1,
    gap: 12,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 40,
  },
  input: {
    backgroundColor: colors.page,
    borderColor: colors.border,
    borderRadius: radii.md,
    borderWidth: 1,
    color: colors.text,
    fontSize: 15,
    height: 50,
    paddingHorizontal: 14,
  },
  inputCode: {
    fontSize: 24,
    letterSpacing: 8,
    textAlign: 'center',
  },
  legal: {
    color: colors.textMuted,
    fontSize: 12,
    textAlign: 'center',
    marginBottom: -8,
  },
  legalLink: {
    color: colors.accentHover,
    fontSize: 12,
    textDecorationLine: 'underline',
  },
  logoMark: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radii.pill,
    borderWidth: 1,
    marginBottom: 8,
    padding: 16,
  },
  screen: {
    backgroundColor: colors.page,
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  submitButton: {
    alignItems: 'center',
    backgroundColor: colors.buttonAccent,
    borderRadius: radii.lg,
    height: 50,
    justifyContent: 'center',
  },
  submitButtonDisabled: {
    opacity: 0.4,
  },
  submitButtonText: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '700',
  },
  subtitle: {
    color: colors.textMuted,
    fontSize: 16,
    lineHeight: 22,
    textAlign: 'center',
  },
  switchText: {
    color: colors.accentHover,
    fontSize: 13,
    textAlign: 'center',
  },
  title: {
    color: colors.text,
    fontSize: 36,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  toggle: {
    backgroundColor: colors.page,
    borderRadius: radii.lg,
    flexDirection: 'row',
    padding: 4,
  },
  toggleTab: {
    alignItems: 'center',
    borderColor: 'transparent',
    borderRadius: radii.md,
    borderWidth: 1,
    flex: 1,
    paddingVertical: 8,
  },
  toggleTabActive: {
    backgroundColor: colors.buttonAccent,
    borderColor: colors.buttonAccent,
  },
  toggleText: {
    color: colors.textMuted,
    fontSize: 14,
    fontWeight: '600',
  },
  toggleTextActive: {
    color: colors.text,
  },
  verifyBody: {
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
  verifyHeading: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
  },
});
