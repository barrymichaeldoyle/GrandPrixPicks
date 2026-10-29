import type { ComponentProps, RefObject } from 'react';
import type { TextInputInstance } from 'react-native';
import { Path, Svg } from 'react-native-svg';

import { colors } from '../../theme/tokens';
import { Pressable, Text, TextInput } from '../../tw';

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

export function PrimaryButton({
  enabled,
  label,
  onPress,
}: {
  enabled: boolean;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      className={primaryButtonClass(enabled)}
      disabled={!enabled}
      onPress={onPress}
    >
      <Text className={primaryButtonTextClass(enabled)}>{label}</Text>
    </Pressable>
  );
}

export function FormError({ message }: { message: string | null }) {
  return message ? (
    <Text className="text-center text-[13px] text-error">{message}</Text>
  ) : null;
}

export function TextLink({
  label,
  onPress,
  disabled,
  align = 'center',
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  align?: 'center' | 'right';
}) {
  return (
    <Pressable accessibilityRole="button" disabled={disabled} onPress={onPress}>
      <Text
        className={`${align === 'right' ? 'text-right' : 'text-center'} text-[13px] text-accent-hover`}
      >
        {label}
      </Text>
    </Pressable>
  );
}

/** The one-line field every step uses. */
export function AuthField({
  inputRef,
  ...props
}: ComponentProps<typeof TextInput> & {
  inputRef?: RefObject<TextInputInstance | null>;
}) {
  return (
    <TextInput
      className="text-foreground h-[50px] rounded-md border border-border bg-surface px-3.5 text-[15px]"
      placeholderTextColor={colors.textMuted}
      ref={inputRef}
      {...props}
    />
  );
}

// Apple logo glyph (white on black, matches HIG "Sign in with Apple" mark).
export function AppleLogo() {
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
export function GoogleLogo() {
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
