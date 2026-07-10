import { getCountdownParts } from '@grandprixpicks/shared/dates';
import { useWindowDimensions } from 'react-native';

import { useNow } from '../../lib/useNow';
import { useTypography } from '../../theme/typography';
import { Text, View } from '../../tw';

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
    return (
      <Text className="text-center text-[22px] font-bold text-accent-hover">
        Starting now
      </Text>
    );
  }

  const showDays = parts.days > 0;
  const unitCount = showDays ? 4 : 3;
  const available = Math.max(0, width - HERO_HORIZONTAL_INSET);
  const tileWidth = Math.max(
    MIN_TILE_WIDTH,
    Math.min(MAX_TILE_WIDTH, (available - GAP * (unitCount - 1)) / unitCount),
  );

  return (
    <View className="flex-row items-center justify-center" style={{ gap: GAP }}>
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
    <View className="items-center gap-1.5">
      <View
        className="items-center justify-center rounded-md border border-accent-hover/20 bg-accent/10"
        style={{ height: tileHeight, width: tileWidth }}
      >
        <Text
          allowFontScaling={false}
          className="text-foreground font-black"
          style={[
            { fontSize, lineHeight: tileHeight },
            displayFontFamily ? { fontFamily: displayFontFamily } : null,
          ]}
        >
          {padded}
        </Text>
      </View>
      <Text className="text-muted text-[10px] font-bold uppercase">
        {label}
      </Text>
    </View>
  );
}
