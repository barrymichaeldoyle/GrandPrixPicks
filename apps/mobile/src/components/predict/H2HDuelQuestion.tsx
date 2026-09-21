import { Ionicons } from '@expo/vector-icons';
import type { ReactNode } from 'react';
import { useEffect, useRef, useState } from 'react';
import type { LayoutChangeEvent } from 'react-native';
import Animated, {
  Easing,
  useAnimatedProps,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Rect } from 'react-native-svg';

import { displayTeamName, getTeamColor } from '../../lib/teamColors';
import { colors } from '../../theme/tokens';
import { useTypography } from '../../theme/typography';
import { AnimatedView, Pressable, Text, View } from '../../tw';
import { DriverBadge } from '../ui/DriverBadge';
import { NationalityFlag } from '../ui/FlagImage';

export type H2HDuelDriver = {
  _id: string;
  code: string;
  displayName?: string | null;
  number?: number | null;
  team?: string | null;
  nationality?: string | null;
};

export type H2HDuelMatchup = {
  _id: string;
  team: string;
  driver1: H2HDuelDriver;
  driver2: H2HDuelDriver;
};

/**
 * How long an answered duel holds before the surface that asked it moves on.
 * Same beat as web's `DUEL_CONFIRM_HOLD_MS`: the pick animation takes about
 * 500ms, and closing under it made the decision end in a blink.
 */
export const DUEL_CONFIRM_HOLD_MS = 620;

const AnimatedRect = Animated.createAnimatedComponent(Rect);

/**
 * One team-mate battle, asked the same way everywhere it is asked. Mirrors
 * web's `H2HDuelQuestion`, so a duel reads the same on both platforms.
 *
 * - `inline` — one step of the eleven-battle sequence: drivers side by side.
 * - `takeover` — a single battle owning the screen (reopened from a saved
 *   card): the drivers stack at full width, the biggest tap target we have.
 */
export function H2HDuelQuestion({
  matchup,
  selectedDriverId,
  topFivePositions,
  onPick,
  variant = 'inline',
  showTeam = false,
  status,
  disabled = false,
}: {
  matchup: H2HDuelMatchup;
  selectedDriverId?: string;
  /** Top 5 slot (1-5) per driver, so the duel shows what you already called. */
  topFivePositions?: Record<string, number | undefined>;
  onPick: (driverId: string) => void;
  variant?: 'inline' | 'takeover';
  /** Name the team above the question, when the surrounding title does not. */
  showTeam?: boolean;
  /** The invitation to tap, and what happened when you did. */
  status?: ReactNode;
  disabled?: boolean;
}) {
  const isTakeover = variant === 'takeover';

  function renderPanel(driver: H2HDuelDriver) {
    return (
      <BouncingDuelPanel
        key={driver._id}
        className={isTakeover ? 'max-h-72 flex-1' : 'flex-1'}
      >
        <DuelDriverButton
          disabled={disabled}
          driver={driver}
          onPress={() => onPick(driver._id)}
          selected={selectedDriverId === driver._id}
          size={isTakeover ? 'lg' : 'md'}
          teamFallback={matchup.team}
          topFivePosition={topFivePositions?.[driver._id]}
        />
      </BouncingDuelPanel>
    );
  }

  return (
    <View className={isTakeover ? 'flex-1' : ''}>
      {/* The question stays put between battles; only the panels bounce. */}
      <View className="mb-4 items-center">
        {showTeam ? (
          <View className="flex-row items-center gap-2">
            <View
              className="h-[5px] w-[5px] rounded-full"
              style={{ backgroundColor: getTeamColor(matchup.team) }}
            />
            <Text className="text-muted text-xs font-semibold tracking-wider uppercase">
              {displayTeamName(matchup.team)}
            </Text>
          </View>
        ) : null}
        <Text
          accessibilityRole="header"
          className={`text-foreground text-xl font-medium ${showTeam ? 'mt-2' : ''}`}
        >
          Who finishes ahead?
        </Text>
      </View>

      {isTakeover ? (
        <View className="flex-1 justify-center gap-2">
          {renderPanel(matchup.driver1)}
          <View className="flex-row items-center gap-3" aria-hidden>
            <View className="h-px flex-1 bg-border" />
            <VersusLabel />
            <View className="h-px flex-1 bg-border" />
          </View>
          {renderPanel(matchup.driver2)}
        </View>
      ) : (
        <View className="flex-row items-stretch gap-2">
          {renderPanel(matchup.driver1)}
          <View className="w-8 items-center justify-center" aria-hidden>
            <VersusLabel />
          </View>
          {renderPanel(matchup.driver2)}
        </View>
      )}

      {status !== undefined ? (
        <View
          accessibilityLiveRegion="polite"
          className="mt-3 min-h-5 flex-row items-center justify-center"
        >
          {typeof status === 'string' ? (
            <Text className="text-muted text-center text-sm">{status}</Text>
          ) : (
            status
          )}
        </View>
      ) : null}
    </View>
  );
}

function VersusLabel() {
  const { numeralFontFamily } = useTypography();
  return (
    <Text
      className="text-muted text-xs font-semibold"
      style={numeralFontFamily ? { fontFamily: numeralFontFamily } : null}
    >
      VS
    </Text>
  );
}

/**
 * The two driver panels are what change between battles, so they are what
 * bounce in (web: opacity 0, scale 0.96, y 6 → spring). Keyed by driver by the
 * caller, so a new battle remounts and replays it.
 */
function BouncingDuelPanel({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  const reduceMotion = useReducedMotion();
  const progress = useSharedValue(reduceMotion ? 1 : 0);

  useEffect(() => {
    if (!reduceMotion) {
      progress.set(
        withSpring(1, {
          stiffness: 520,
          damping: 32,
          mass: 0.8,
        }),
      );
    }
  }, [progress, reduceMotion]);

  const style = useAnimatedStyle(() => ({
    opacity: Math.min(1, progress.value * 1.4),
    transform: [
      { translateY: (1 - progress.value) * 6 },
      { scale: 0.96 + progress.value * 0.04 },
    ],
  }));

  return (
    <AnimatedView className={className} style={style}>
      {children}
    </AnimatedView>
  );
}

/**
 * One side of a duel. Not exported, for the same reason as on web: every
 * surface that asks a duel goes through `H2HDuelQuestion`.
 */
function DuelDriverButton({
  driver,
  teamFallback,
  selected,
  topFivePosition,
  onPress,
  size,
  disabled,
}: {
  driver: H2HDuelDriver;
  teamFallback: string;
  selected: boolean;
  topFivePosition?: number;
  onPress: () => void;
  size: 'md' | 'lg';
  disabled: boolean;
}) {
  const { numeralFontFamily } = useTypography();
  const reduceMotion = useReducedMotion();
  const isLarge = size === 'lg';
  const team = driver.team ?? teamFallback;
  const monoStyle = numeralFontFamily
    ? { fontFamily: numeralFontFamily }
    : null;
  const name = driver.displayName ?? driver.code;

  const [box, setBox] = useState<{ width: number; height: number } | null>(
    null,
  );
  const bloom = useSharedValue(0);
  const lap = useSharedValue(1);
  const lapOpacity = useSharedValue(0);
  const check = useSharedValue(selected ? 1 : 0);
  const wasSelectedRef = useRef(selected);

  // The reward for a pick, as on web: the panel lights up, an accent line runs
  // the whole way round and closes on itself, then the check lands.
  useEffect(() => {
    const justPicked = selected && !wasSelectedRef.current;
    wasSelectedRef.current = selected;
    if (!selected) {
      check.set(0);
      return;
    }
    if (!justPicked || reduceMotion) {
      check.set(1);
      return;
    }
    bloom.set(0.22);
    bloom.set(
      withTiming(0, {
        duration: 400,
        easing: Easing.out(Easing.quad),
      }),
    );
    lap.set(1);
    lap.set(
      withTiming(0, {
        duration: 460,
        easing: Easing.bezier(0.33, 1, 0.68, 1),
      }),
    );
    lapOpacity.set(1);
    lapOpacity.set(withDelay(460, withTiming(0, { duration: 220 })));
    check.set(0.4);
    check.set(withDelay(300, withSpring(1, { stiffness: 620, damping: 18 })));
  }, [bloom, check, lap, lapOpacity, reduceMotion, selected]);

  const bloomStyle = useAnimatedStyle(() => ({ opacity: bloom.value }));
  const checkStyle = useAnimatedStyle(() => ({
    transform: [{ scale: check.value === 0 ? 1 : check.value }],
  }));
  const perimeter = box ? 2 * (box.width + box.height) : 0;
  const lapProps = useAnimatedProps(() => ({
    strokeDashoffset: lap.value * perimeter,
    strokeOpacity: lapOpacity.value,
  }));

  return (
    <Pressable
      accessibilityLabel={`Pick ${name}${topFivePosition ? `, your P${topFivePosition}` : ''}`}
      accessibilityRole="button"
      accessibilityState={{ selected, disabled }}
      className={`relative items-center justify-center gap-3 overflow-hidden rounded-lg border px-2 pt-9 pb-7 ${
        isLarge ? 'h-full min-h-40' : 'min-h-36'
      } ${
        selected
          ? 'border-accent bg-accent-muted'
          : 'border-border bg-page active:bg-surface-elevated'
      }`}
      disabled={disabled}
      onLayout={(event: LayoutChangeEvent) => {
        const { width, height } = event.nativeEvent.layout;
        setBox({ width, height });
      }}
      onPress={onPress}
    >
      {/* Team colour confined to the 3px left bar, as everywhere else. */}
      <View
        className="absolute top-0 bottom-0 left-0 w-[3px]"
        style={{ backgroundColor: getTeamColor(team) }}
      />
      <Animated.View
        pointerEvents="none"
        style={[
          {
            position: 'absolute',
            top: 0,
            right: 0,
            bottom: 0,
            left: 0,
            backgroundColor: colors.accent,
          },
          bloomStyle,
        ]}
      />
      {box && !reduceMotion ? (
        <Svg
          height={box.height}
          pointerEvents="none"
          style={{ position: 'absolute', top: 0, left: 0 }}
          width={box.width}
        >
          <AnimatedRect
            animatedProps={lapProps}
            fill="none"
            height={box.height}
            rx={8}
            stroke={colors.accent}
            strokeDasharray={[perimeter, perimeter]}
            strokeOpacity={0}
            strokeWidth={4}
            width={box.width}
            x={0}
            y={0}
          />
        </Svg>
      ) : null}

      {/* If you already put this driver in your Top 5, say so here. */}
      {topFivePosition ? (
        <View className="absolute top-2 left-2 rounded-sm border border-accent/40 px-1 py-0.5">
          <Text className="text-xs leading-none text-accent" style={monoStyle}>
            YOUR P{topFivePosition}
          </Text>
        </View>
      ) : null}

      {/* Code and team only: given identity the chip becomes its own button
          (the driver card), and it would swallow the tap meant to pick. */}
      <DriverBadge code={driver.code} size="md" team={team} />
      <View className="min-w-0 items-center">
        <Text
          className={`text-foreground text-center leading-tight font-medium ${
            isLarge ? 'text-2xl' : 'text-base'
          }`}
          numberOfLines={2}
        >
          {name}
        </Text>
        {driver.nationality || driver.number != null ? (
          <View className="mt-1 flex-row items-center justify-center gap-1.5">
            {driver.nationality ? (
              <NationalityFlag code={driver.nationality} />
            ) : null}
            {driver.number != null ? (
              <Text
                className={`text-muted ${isLarge ? 'text-base' : 'text-sm'}`}
                style={monoStyle}
              >
                #{driver.number}
              </Text>
            ) : null}
          </View>
        ) : null}
      </View>

      <AnimatedView
        className={`absolute right-2 bottom-2 h-5 w-5 items-center justify-center rounded-full border ${
          selected ? 'border-accent bg-accent' : 'border-border'
        }`}
        style={checkStyle}
      >
        {selected ? (
          <Ionicons color={colors.textOnAccent} name="checkmark" size={13} />
        ) : null}
      </AnimatedView>
    </Pressable>
  );
}
