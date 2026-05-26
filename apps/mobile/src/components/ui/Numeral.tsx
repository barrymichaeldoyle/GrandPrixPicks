import type { StyleProp, TextStyle } from 'react-native';
import { StyleSheet, Text } from 'react-native';

import { colors } from '../../theme/tokens';
import { useTypography } from '../../theme/typography';

/**
 * Numeral — broadcast-style typography for any numeric value in the app.
 * Uses Orbitron for emphasis variants, tabular figures everywhere so columns
 * align. Treat strings as "presentational numerals" too (e.g. "P1", "#3", "5 pts").
 */

export type NumeralVariant =
  | 'display' // hero countdowns, big scores
  | 'large' // position numbers (P1), rank (#1)
  | 'body' // inline figures in cards
  | 'small'; // chips, labels

export type NumeralTone =
  | 'default'
  | 'muted'
  | 'accent'
  | 'gain'
  | 'loss'
  | 'warning';

type NumeralProps = {
  children: string | number;
  variant?: NumeralVariant;
  tone?: NumeralTone;
  style?: StyleProp<TextStyle>;
};

export function Numeral({
  children,
  variant = 'body',
  tone = 'default',
  style,
}: NumeralProps) {
  const { numeralFontFamily, displayFontFamily } = useTypography();
  const fontFamily =
    variant === 'display'
      ? displayFontFamily
      : variant === 'large'
        ? numeralFontFamily
        : undefined;

  return (
    <Text
      allowFontScaling={false}
      style={[
        styles.base,
        styles[variant],
        { color: toneColors[tone] },
        fontFamily ? { fontFamily } : null,
        style,
      ]}
    >
      {children}
    </Text>
  );
}

const toneColors: Record<NumeralTone, string> = {
  default: colors.text,
  muted: colors.textMuted,
  accent: colors.accentHover,
  gain: colors.success,
  loss: colors.error,
  warning: colors.warning,
};

const styles = StyleSheet.create({
  base: {
    fontVariant: ['tabular-nums'],
  },
  display: {
    fontSize: 56,
    letterSpacing: -1,
    lineHeight: 64,
  },
  large: {
    fontSize: 22,
    letterSpacing: 0.4,
    lineHeight: 26,
  },
  body: {
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  small: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
});
