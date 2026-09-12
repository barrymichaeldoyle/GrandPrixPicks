import type { StyleProp, TextStyle } from 'react-native';

import { useTypography } from '../../theme/typography';
import { Text } from '../../tw';

/**
 * Numeral — broadcast-style typography for any numeric value in the app.
 * Uses IBM Plex Mono for emphasis variants, tabular figures everywhere so
 * columns align. Treat strings as "presentational numerals" too (e.g. "P1", "#3", "5 pts").
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
      className={`${variantClasses[variant]} ${toneClasses[tone]}`}
      maxFontSizeMultiplier={variantMaxScale[variant]}
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
  body: 'text-base font-semibold',
  small: 'text-sm font-bold',
};

/**
 * Figures scale with the OS text-size setting, but not without a ceiling.
 *
 * This component used to pass `allowFontScaling={false}`, which kept every
 * score, rank and points total in the app pinned at its authored size. That
 * solved a layout problem (numerals sit in fixed-width columns and chips, so
 * unbounded growth overflows them) by trading away the one accommodation the
 * audience is most likely to be using: turn up iOS Dynamic Type and the prose
 * grew while every number stayed put, which made the numbers *relatively*
 * smaller than before.
 *
 * A ceiling keeps both. The cap tightens as the authored size grows, because a
 * 12px chip label has far more headroom in its container than a 56px hero
 * figure does. `small` gets the most room: it is the densest type in the app
 * and the place the size complaint actually lands.
 */
const variantMaxScale: Record<NumeralVariant, number> = {
  display: 1.15,
  large: 1.3,
  body: 1.4,
  small: 1.6,
};
