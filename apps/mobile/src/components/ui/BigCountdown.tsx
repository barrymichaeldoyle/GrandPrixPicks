import { getCountdownParts } from '@grandprixpicks/shared/dates';
import { StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import { useNow } from '../../lib/useNow';
import { colors, radii } from '../../theme/tokens';
import { useTypography } from '../../theme/typography';

type BigCountdownProps = {
  /** Timestamp (ms) the countdown is targeting. */
  targetAt: number;
};

// HomeHero outer paddings: 16 (screen) + 14–20 (card content) per side.
// Reserve the larger value so we never overflow on narrow phones.
const HERO_HORIZONTAL_INSET = (16 + 20) * 2;
const GAP = 8;
const MAX_TILE_WIDTH = 78;
const MIN_TILE_WIDTH = 48;

export function BigCountdown({ targetAt }: BigCountdownProps) {
  const now = useNow();
  const { width } = useWindowDimensions();
  const parts = getCountdownParts(targetAt - now);

  if (!parts) {
    return <Text style={styles.startingNow}>Starting now</Text>;
  }

  const showDays = parts.days > 0;
  const unitCount = showDays ? 4 : 3;
  const available = Math.max(0, width - HERO_HORIZONTAL_INSET);
  const tileWidth = Math.max(
    MIN_TILE_WIDTH,
    Math.min(MAX_TILE_WIDTH, (available - GAP * (unitCount - 1)) / unitCount),
  );

  return (
    <View style={[styles.row, { gap: GAP }]}>
      {showDays ? (
        <TimeUnit label="days" tileWidth={tileWidth} value={parts.days} />
      ) : null}
      <TimeUnit label="hrs" tileWidth={tileWidth} value={parts.hours} />
      <TimeUnit label="min" tileWidth={tileWidth} value={parts.minutes} />
      <TimeUnit label="sec" tileWidth={tileWidth} value={parts.seconds} />
    </View>
  );
}

function TimeUnit({
  label,
  tileWidth,
  value,
}: {
  label: string;
  tileWidth: number;
  value: number;
}) {
  const { displayFontFamily } = useTypography();
  const padded = String(value).padStart(2, '0');
  const tileHeight = Math.round(tileWidth * 1.15);
  const fontSize = Math.round(tileWidth * 0.55);

  return (
    <View style={styles.unit}>
      <View style={[styles.tile, { height: tileHeight, width: tileWidth }]}>
        <Text
          allowFontScaling={false}
          style={[
            styles.digitText,
            { fontSize, lineHeight: tileHeight },
            displayFontFamily ? { fontFamily: displayFontFamily } : null,
          ]}
        >
          {padded}
        </Text>
      </View>
      <Text style={styles.unitLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  digitText: {
    color: colors.text,
    fontVariant: ['tabular-nums'],
    fontWeight: '900',
    includeFontPadding: false,
  },
  row: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  startingNow: {
    color: colors.accentHover,
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'center',
  },
  tile: {
    alignItems: 'center',
    backgroundColor: 'rgba(20, 184, 166, 0.08)',
    borderColor: 'rgba(45, 212, 191, 0.22)',
    borderRadius: radii.md,
    borderWidth: 1,
    justifyContent: 'center',
  },
  unit: {
    alignItems: 'center',
    gap: 6,
  },
  unitLabel: {
    color: colors.textMuted,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
});
