import { StyleSheet, Text, View } from 'react-native';

import { useNow } from '../../lib/useNow';
import { colors, radii } from '../../theme/tokens';
import { useTypography } from '../../theme/typography';

type BigCountdownProps = {
  /** Timestamp (ms) the countdown is targeting. */
  targetAt: number;
};

type Parts = {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
};

function getParts(target: number, now: number): Parts | null {
  const diff = target - now;
  if (diff <= 0) {
    return null;
  }
  return {
    days: Math.floor(diff / (1000 * 60 * 60 * 24)),
    hours: Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
    minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
    seconds: Math.floor((diff % (1000 * 60)) / 1000),
  };
}

/**
 * Hero-sized race countdown with split per-digit boxes. Matches the web
 * `BigCountdown` aesthetic — each digit gets its own Orbitron-styled tile,
 * dotted separators between units, uppercase label underneath.
 */
export function BigCountdown({ targetAt }: BigCountdownProps) {
  const now = useNow();
  const parts = getParts(targetAt, now);

  if (!parts) {
    return <Text style={styles.startingNow}>Starting now</Text>;
  }

  const showDays = parts.days > 0;

  return (
    <View style={styles.row}>
      {showDays ? (
        <>
          <TimeUnit label="days" value={parts.days} />
          <Separator />
        </>
      ) : null}
      <TimeUnit label="hrs" value={parts.hours} />
      <Separator />
      <TimeUnit label="min" value={parts.minutes} />
      <Separator />
      <TimeUnit label="sec" value={parts.seconds} />
    </View>
  );
}

function TimeUnit({ label, value }: { label: string; value: number }) {
  const { displayFontFamily } = useTypography();
  const padded = String(value).padStart(2, '0');
  const tens = padded[0];
  const ones = padded[1];

  const digitTextStyle = [
    styles.digitText,
    displayFontFamily ? { fontFamily: displayFontFamily } : null,
  ];

  return (
    <View style={styles.unit}>
      <View style={styles.digitGroup}>
        <View style={styles.digitBox}>
          <Text allowFontScaling={false} style={digitTextStyle}>
            {tens}
          </Text>
        </View>
        <View style={styles.digitBox}>
          <Text allowFontScaling={false} style={digitTextStyle}>
            {ones}
          </Text>
        </View>
      </View>
      <Text style={styles.unitLabel}>{label}</Text>
    </View>
  );
}

function Separator() {
  return (
    <View style={styles.separator}>
      <View style={styles.separatorDot} />
      <View style={styles.separatorDot} />
    </View>
  );
}

const DIGIT_WIDTH = 38;
const DIGIT_HEIGHT = 54;
const DIGIT_FONT = 38;

const styles = StyleSheet.create({
  digitBox: {
    alignItems: 'center',
    backgroundColor: 'rgba(20, 184, 166, 0.08)',
    borderColor: 'rgba(45, 212, 191, 0.18)',
    borderRadius: radii.md,
    borderWidth: 1,
    height: DIGIT_HEIGHT,
    justifyContent: 'center',
    width: DIGIT_WIDTH,
  },
  digitGroup: {
    flexDirection: 'row',
    gap: 4,
  },
  digitText: {
    color: colors.text,
    fontSize: DIGIT_FONT,
    fontVariant: ['tabular-nums'],
    fontWeight: '900',
    includeFontPadding: false,
    lineHeight: DIGIT_FONT,
  },
  row: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
    justifyContent: 'center',
  },
  separator: {
    alignSelf: 'center',
    gap: 4,
    // Pull up so dots align with digit middle instead of bottom-aligned with label
    marginBottom: 18,
  },
  separatorDot: {
    backgroundColor: colors.accent,
    borderRadius: 999,
    height: 4,
    width: 4,
  },
  startingNow: {
    color: colors.accentHover,
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'center',
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
