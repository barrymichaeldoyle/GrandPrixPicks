import type { RefObject } from 'react';
import type { TextInputInstance } from 'react-native';

import { colors } from '../../theme/tokens';
import { Text, TextInput } from '../../tw';
import { AuthField, FormError, PrimaryButton, TextLink } from './SignInParts';

/**
 * The steps the sign-in sheet shows after its first form: the emailed code,
 * the username a social sign-up still needs, and a new password. Each is
 * presentational; `SignInScreen` owns the state and the Clerk calls.
 */

function StepTitle({ children }: { children: string }) {
  return (
    <Text className="text-foreground text-center text-xl font-bold">
      {children}
    </Text>
  );
}

export function CodeStep({
  email,
  code,
  onChangeCode,
  onSubmit,
  submitLabel,
  onResend,
  onBack,
  loading,
  error,
  inputRef,
}: {
  email: string;
  code: string;
  onChangeCode: (code: string) => void;
  onSubmit: () => void;
  submitLabel: string;
  /** Only the password reset can send its code again. */
  onResend?: () => void;
  onBack: () => void;
  loading: boolean;
  error: string | null;
  inputRef: RefObject<TextInputInstance | null>;
}) {
  return (
    <>
      <StepTitle>Check your email</StepTitle>
      <Text className="text-muted text-center text-sm leading-5">
        We sent a 6-digit code to {email}.
      </Text>
      <TextInput
        autoComplete="one-time-code"
        className="text-foreground h-[50px] rounded-md border border-border bg-surface px-3.5 text-center text-2xl tracking-[8px]"
        keyboardType="number-pad"
        maxLength={6}
        onChangeText={onChangeCode}
        onSubmitEditing={onSubmit}
        placeholder="000000"
        placeholderTextColor={colors.textMuted}
        ref={inputRef}
        returnKeyType="done"
        textContentType="oneTimeCode"
        value={code}
      />
      <PrimaryButton
        enabled={code.length === 6 && !loading}
        label={loading ? 'Verifying…' : submitLabel}
        onPress={onSubmit}
      />
      {onResend ? (
        <TextLink disabled={loading} label="Resend code" onPress={onResend} />
      ) : null}
      <TextLink label="← Back" onPress={onBack} />
      <FormError message={error} />
    </>
  );
}

export function UsernameStep({
  username,
  onChangeUsername,
  onSubmit,
  loading,
  error,
}: {
  username: string;
  onChangeUsername: (username: string) => void;
  onSubmit: () => void;
  loading: boolean;
  error: string | null;
}) {
  return (
    <>
      <StepTitle>Choose a username</StepTitle>
      <AuthField
        accessibilityLabel="Username"
        autoCapitalize="none"
        autoComplete="username-new"
        autoCorrect={false}
        onChangeText={onChangeUsername}
        onSubmitEditing={onSubmit}
        placeholder="Username"
        returnKeyType="go"
        textContentType="username"
        value={username}
      />
      <PrimaryButton
        enabled={username.trim().length >= 4 && !loading}
        label={loading ? 'Saving…' : 'Continue'}
        onPress={onSubmit}
      />
      <FormError message={error} />
    </>
  );
}

export function NewPasswordStep({
  password,
  confirmPassword,
  onChangePassword,
  onChangeConfirmPassword,
  onSubmit,
  loading,
  error,
  confirmRef,
}: {
  password: string;
  confirmPassword: string;
  onChangePassword: (password: string) => void;
  onChangeConfirmPassword: (password: string) => void;
  onSubmit: () => void;
  loading: boolean;
  error: string | null;
  confirmRef: RefObject<TextInputInstance | null>;
}) {
  return (
    <>
      <StepTitle>Set a new password</StepTitle>
      <AuthField
        accessibilityLabel="New password"
        autoComplete="new-password"
        onChangeText={onChangePassword}
        onSubmitEditing={() => confirmRef.current?.focus()}
        placeholder="New password"
        returnKeyType="next"
        secureTextEntry
        value={password}
      />
      <AuthField
        accessibilityLabel="Confirm new password"
        autoComplete="new-password"
        inputRef={confirmRef}
        onChangeText={onChangeConfirmPassword}
        onSubmitEditing={onSubmit}
        placeholder="Confirm new password"
        returnKeyType="go"
        secureTextEntry
        value={confirmPassword}
      />
      <PrimaryButton
        enabled={Boolean(password && confirmPassword) && !loading}
        label={loading ? 'Saving…' : 'Save password'}
        onPress={onSubmit}
      />
      <FormError message={error} />
    </>
  );
}
