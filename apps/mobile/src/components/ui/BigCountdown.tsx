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
  const unitCount = 3;
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
      {!showDays ? (
        <TimeUnit label="sec" tileWidth={tileWidth} value={parts.seconds} />
      ) : null}
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
        {/*
          The one figure that genuinely cannot scale with the OS text setting.
          Three tiles have to fit across the narrowest phone, so `tileWidth` is
          derived from screen width and the digit is sized from the tile
          (`tileWidth * 0.55`) with `lineHeight` pinned to the tile height.
          Letting the glyph grow independently overflows a box that cannot grow
          back. It already renders at ~43px on a 390px screen, well clear of any
          legibility floor, so nothing is lost by holding it. The label below is
          the part that was too small, and that one does scale.
        */}
        <Text
          allowFontScaling={false}
          className="text-foreground font-black"
          style={[
            { fontSize, fontVariant: ['tabular-nums'], lineHeight: tileHeight },
            displayFontFamily ? { fontFamily: displayFontFamily } : null,
          ]}
        >
          {padded}
        </Text>
      </View>
      <Text
        className="text-muted text-xs font-medium"
        maxFontSizeMultiplier={1.5}
      >
        {label}
      </Text>
    </View>
  );
}
