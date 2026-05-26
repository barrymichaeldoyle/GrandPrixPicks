import { StyleSheet, Text, View } from 'react-native';

import { colors } from '../../theme/tokens';
import { Numeral, type NumeralVariant } from './Numeral';

/**
 * Delta — directional change indicator (▲ +3 / ▼ -1 / ─ 0). Used in
 * leaderboards, head-to-head scores, anywhere a value moved.
 */

type DeltaProps = {
  value: number;
  variant?: NumeralVariant;
  /** Hide the value, just show the arrow (useful in tight chips). */
  arrowOnly?: boolean;
};

export function Delta({
  value,
  variant = 'small',
  arrowOnly = false,
}: DeltaProps) {
  const tone = value > 0 ? 'gain' : value < 0 ? 'loss' : 'muted';
  const arrow = value > 0 ? '▲' : value < 0 ? '▼' : '─';
  const display = arrowOnly ? '' : Math.abs(value).toString();
  const color =
    value > 0
      ? colors.success
      : value < 0
        ? colors.error
        : colors.textMuted;

  return (
    <View style={styles.row}>
      <Text style={[styles.arrow, { color }]}>{arrow}</Text>
      {arrowOnly ? null : (
        <Numeral tone={tone} variant={variant}>
          {display}
        </Numeral>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  arrow: {
    fontSize: 10,
    fontWeight: '700',
    lineHeight: 12,
  },
  row: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 4,
  },
});
