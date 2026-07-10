import type { StyleProp, TextStyle } from 'react-native';

import { useTypography } from '../../theme/typography';
import { Text } from '../../tw';

/**
 * Numeral — broadcast-style typography for any numeric value in the app.
 * Uses Orbitron for emphasis variants, tabular figures everywhere so columns
 * align. Treat strings as "presentational numerals" too (e.g. "P1", "#3", "5 pts").
 */

type NumeralVariant =
  | 'display' // hero countdowns, big scores
  | 'large' // position numbers (P1), rank (#1)
  | 'body' // inline figures in cards
  | 'small'; // chips, labels

type NumeralTone = 'default' | 'muted' | 'accent' | 'gain' | 'loss' | 'warning';

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
      className={`${variantClasses[variant]} ${toneClasses[tone]}`}
      style={[fontFamily ? { fontFamily } : null, style]}
    >
      {children}
    </Text>
  );
}

const toneClasses: Record<NumeralTone, string> = {
  default: 'text-foreground',
  muted: 'text-muted',
  accent: 'text-accent-hover',
  gain: 'text-success',
  loss: 'text-error',
  warning: 'text-warning',
};

const variantClasses: Record<NumeralVariant, string> = {
  display: 'text-[56px] leading-[64px]',
  large: 'text-[22px] leading-[26px]',
  body: 'text-[15px] font-semibold',
  small: 'text-xs font-bold',
};
