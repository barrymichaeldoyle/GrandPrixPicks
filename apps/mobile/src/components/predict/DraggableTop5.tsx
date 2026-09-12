import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useLayoutEffect } from 'react';
import { View as RNView } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  type SharedValue,
} from 'react-native-reanimated';

import { compareDriversByTeam } from '@grandprixpicks/shared/teams';

import type { ConvexDoc } from '../../integrations/convex/api';
import { displayTeamName, getTeamColor } from '../../lib/teamColors';
import { colors } from '../../theme/tokens';
import { Pressable, Text, View } from '../../tw';
import { NationalityFlag } from '../ui/FlagImage';
import { Numeral } from '../ui/Numeral';

/**
 * As `listDrivers` returns them: the team for the round that was asked about,
 * and whether the driver is racing it. `racing` is optional so the mock roster
 * in the unconfigured-Convex dev shell still type-checks; absent means racing.
 */
type Driver = ConvexDoc<'drivers'> & {
  team?: string | null;
  racing?: boolean;
  familyName?: string;
  nationality?: string | null;
};

function isRacing(driver: Driver): boolean {
  return driver.racing !== false;
}

type DraggableTop5Props = {
  picks: string[];
  drivers: Driver[];
  onChange: (picks: string[]) => void;
  disabled?: boolean;
  /** Parent scroll should lock while a row is being dragged. */
  onDraggingChange?: (dragging: boolean) => void;
  /** Primary action (Save CTA), rendered between the picks and the pool. */
  action?: React.ReactNode;
};

const MAX_PICKS = 5;
const ROW_HEIGHT = 56;
/** Same spring the web picker uses for layout (`stiffness: 350, damping: 30`). */
const SPRING = { damping: 30, mass: 1, stiffness: 350 };
/** Matches web `@dnd-kit` PointerSensor `activationConstraint.distance`. */
const ACTIVATION_DISTANCE = 8;

type PickedItem = { driverId: string; driver: Driver; index: number };

function driverSurname(driver: Driver): string {
  return driver.familyName || driver.displayName.split(' ').slice(1).join(' ');
}

function arrayMove(items: string[], from: number, to: number): string[] {
  const next = [...items];
  const [moved] = next.splice(from, 1);
  if (moved === undefined) {
    return items;
  }
  next.splice(to, 0, moved);
  return next;
}

function TeamEdge({ team }: { team?: string | null }) {
  return (
    <View
      className="w-[3px] self-stretch"
      style={{ backgroundColor: getTeamColor(team) }}
    />
  );
}

function TeamDot({ team }: { team?: string | null }) {
  return (
    <View
      className="h-[5px] w-[5px] rounded-full"
      style={{ backgroundColor: getTeamColor(team) }}
    />
  );
}

function DriverPickBadge({ driver }: { driver: Driver }) {
  return (
    <View className="w-12 shrink-0 flex-row items-stretch border-r border-border">
      <TeamEdge team={driver.team} />
      <View className="flex-1 items-center justify-center gap-0.5">
        {driver.number != null ? (
          <Numeral variant="small">{driver.number}</Numeral>
        ) : null}
        <Numeral tone="muted" variant="small">
          {driver.code}
        </Numeral>
      </View>
    </View>
  );
}

function hapticSelection() {
  void Haptics.selectionAsync();
}

function PickedRow({
  item,
  index,
  count,
  disabled,
  dragIndex,
  hoverIndex,
  dragTranslation,
  onMoveUp,
  onMoveDown,
  onRemove,
  onReorder,
  onDraggingChange,
}: {
  item: PickedItem;
  index: number;
  count: number;
  disabled: boolean;
  dragIndex: SharedValue<number>;
  hoverIndex: SharedValue<number>;
  dragTranslation: SharedValue<number>;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onRemove: () => void;
  onReorder: (from: number, to: number) => void;
  onDraggingChange?: (dragging: boolean) => void;
}) {
  const notifyDragging = onDraggingChange;
  const animatedStyle = useAnimatedStyle(() => {
    const from = dragIndex.value;
    if (from === index) {
      return {
        zIndex: 10,
        opacity: 0.6,
        transform: [{ translateY: dragTranslation.value }],
      };
    }
    let shift = 0;
    const to = hoverIndex.value;
    if (from >= 0 && to >= 0 && from !== to) {
      if (from < to && index > from && index <= to) {
        shift = -ROW_HEIGHT;
      } else if (from > to && index >= to && index < from) {
        shift = ROW_HEIGHT;
      }
    }
    return {
      zIndex: 0,
      opacity: 1,
      transform: [{ translateY: withSpring(shift, SPRING) }],
    };
  });

  const pan = Gesture.Pan()
    .enabled(!disabled && count > 1)
    .maxPointers(1)
    .minDistance(ACTIVATION_DISTANCE)
    .onBegin(() => {
      if (notifyDragging) {
        runOnJS(notifyDragging)(true);
      }
    })
    .onStart(() => {
      // Reanimated shared values are mutable by design.
      // oxlint-disable-next-line react/immutability
      dragIndex.value = index;
      // oxlint-disable-next-line react/immutability
      hoverIndex.value = index;
      // oxlint-disable-next-line react/immutability
      dragTranslation.value = 0;
      runOnJS(hapticSelection)();
    })
    .onUpdate((event) => {
      // oxlint-disable-next-line react/immutability
      dragTranslation.value = event.translationY;
      const next = Math.round(index + event.translationY / ROW_HEIGHT);
      const clamped = Math.max(0, Math.min(count - 1, next));
      if (clamped !== hoverIndex.value) {
        // oxlint-disable-next-line react/immutability
        hoverIndex.value = clamped;
        runOnJS(hapticSelection)();
      }
    })
    .onEnd(() => {
      const from = dragIndex.value;
      const to = hoverIndex.value;
      // oxlint-disable-next-line react/immutability
      dragTranslation.value = (to - from) * ROW_HEIGHT;
      runOnJS(onReorder)(from, to);
    })
    .onFinalize(() => {
      if (notifyDragging) {
        runOnJS(notifyDragging)(false);
      }
    });

  const handle = (
    <>
      <DriverPickBadge driver={item.driver} />
      <View className="min-w-0 flex-1 justify-center gap-0.5 px-2.5">
        <View className="flex-row items-center gap-2">
          {item.driver.nationality ? (
            <NationalityFlag code={item.driver.nationality} />
          ) : null}
          <Text
            className="text-foreground min-w-0 flex-1 text-[13px] font-medium"
            numberOfLines={1}
          >
            {item.driver.displayName}
          </Text>
        </View>
        {item.driver.racing === false ? (
          <Text className="text-xs text-error" numberOfLines={1}>
            Not racing this round
          </Text>
        ) : item.driver.team ? (
          <View className="flex-row items-center gap-1.5">
            <TeamDot team={item.driver.team} />
            <Text
              className="text-muted min-w-0 flex-1 text-xs"
              numberOfLines={1}
            >
              {displayTeamName(item.driver.team)}
            </Text>
          </View>
        ) : null}
      </View>
    </>
  );

  return (
    <Animated.View
      collapsable={false}
      style={[{ height: ROW_HEIGHT }, animatedStyle]}
    >
      <View className="h-14 flex-row items-stretch border-b border-border bg-surface-muted">
        {disabled || count <= 1 ? (
          <View className="min-w-0 flex-1 flex-row items-stretch">
            {handle}
          </View>
        ) : (
          <GestureDetector gesture={pan}>
            <RNView
              accessibilityLabel="Drag to reorder"
              accessibilityRole="button"
              collapsable={false}
              style={{
                alignItems: 'stretch',
                alignSelf: 'stretch',
                flex: 1,
                flexDirection: 'row',
                minWidth: 0,
              }}
            >
              {handle}
            </RNView>
          </GestureDetector>
        )}
        {!disabled ? (
          <View className="flex-row items-center gap-0.5 border-l border-border px-1.5">
            <View>
              <Pressable
                accessibilityLabel={`Move ${item.driver.displayName} up`}
                accessibilityRole="button"
                accessibilityState={{ disabled: index === 0 }}
                className="h-6 w-6 items-center justify-center"
                disabled={index === 0}
                onPress={onMoveUp}
                style={{ opacity: index === 0 ? 0.3 : 1 }}
              >
                <Ionicons color={colors.accent} name="chevron-up" size={14} />
              </Pressable>
              <Pressable
                accessibilityLabel={`Move ${item.driver.displayName} down`}
                accessibilityRole="button"
                accessibilityState={{ disabled: index >= count - 1 }}
                className="h-6 w-6 items-center justify-center"
                disabled={index >= count - 1}
                onPress={onMoveDown}
                style={{ opacity: index >= count - 1 ? 0.3 : 1 }}
              >
                <Ionicons color={colors.accent} name="chevron-down" size={14} />
              </Pressable>
            </View>
            <Pressable
              accessibilityLabel={`Remove ${item.driver.displayName} from your picks`}
              accessibilityRole="button"
              className="h-6 w-6 items-center justify-center"
              onPress={onRemove}
            >
              <Ionicons color={colors.error} name="close" size={16} />
            </Pressable>
          </View>
        ) : null}
      </View>
    </Animated.View>
  );
}

function EmptySlot() {
  return (
    <View className="h-14 justify-center border-b border-dashed border-border bg-surface px-3 last:border-b-0">
      <Text className="text-muted text-sm">Select a driver</Text>
    </View>
  );
}

function PoolDriverCard({
  driver,
  pickedPosition,
  poolFull,
  disabled,
  onPress,
}: {
  driver: Driver;
  pickedPosition: number | null;
  poolFull: boolean;
  disabled: boolean;
  onPress: () => void;
}) {
  const picked = pickedPosition !== null;
  const isDisabled = disabled || (!picked && poolFull);
  const surname = driverSurname(driver);

  return (
    <Pressable
      accessibilityRole="button"
      className={`min-h-11 flex-row overflow-hidden rounded-sm border ${
        picked
          ? 'border-accent/40 bg-accent-muted/15'
          : 'border-border bg-surface-elevated'
      }`}
      disabled={isDisabled && !picked}
      onPress={onPress}
      style={{ opacity: !picked && isDisabled ? 0.4 : 1 }}
    >
      <TeamEdge team={driver.team} />
      <View className="min-w-0 flex-1 justify-center gap-0.5 py-2.5 pr-2 pl-2.5">
        {picked ? (
          <Numeral
            style={{ position: 'absolute', top: 4, right: 6 }}
            tone="accent"
            variant="small"
          >
            {`P${pickedPosition}`}
          </Numeral>
        ) : null}
        <Numeral tone={picked ? 'muted' : 'default'} variant="small">
          {driver.code}
        </Numeral>
        {surname ? (
          <Text className="text-muted text-xs" numberOfLines={1}>
            {surname}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}

/**
 * The pool arrives from `listDrivers` in championship order already, computed
 * from this season's results. This exists for the mock roster the
 * unconfigured-Convex dev shell renders, which has no server to sort it, and
 * it shares the web comparator so the two cannot drift.
 */
function sortDrivers(drivers: Driver[]): Driver[] {
  return [...drivers].sort((a, b) => compareDriversByTeam(a, b));
}

function TimingRail() {
  return (
    <View className="border-r border-border bg-surface-muted">
      {[1, 2, 3, 4, 5].map((n) => (
        <View
          className="w-10 items-center justify-center border-b border-border last:border-b-0"
          key={n}
          style={{ height: ROW_HEIGHT }}
        >
          <Numeral tone="accent" variant="small">
            {`P${n}`}
          </Numeral>
        </View>
      ))}
    </View>
  );
}

export function DraggableTop5({
  picks,
  drivers,
  onChange,
  disabled = false,
  onDraggingChange,
  action,
}: DraggableTop5Props) {
  // The pool only offers drivers in a car this round; the lookup keeps
  // everyone, so a saved pick naming a driver who has since lost their seat
  // still renders in its slot instead of leaving four picks where five were
  // saved.
  const sortedDrivers = sortDrivers(drivers.filter(isRacing));
  const driverMap = new Map<string, Driver>(
    drivers.map((d) => [d._id as string, d]),
  );
  const pickSet = new Set(picks);
  const poolFull = picks.length >= MAX_PICKS;

  const pickedItems: PickedItem[] = picks
    .map((id, index) => {
      const driver = driverMap.get(id);
      return driver ? { driverId: id, driver, index } : null;
    })
    .filter((item): item is PickedItem => item !== null);

  const emptyCount = MAX_PICKS - pickedItems.length;
  const dragIndex = useSharedValue(-1);
  const hoverIndex = useSharedValue(-1);
  const dragTranslation = useSharedValue(0);

  useLayoutEffect(() => {
    // Reanimated shared values are mutable by design; the React rule cannot
    // distinguish them from ordinary values returned by hooks.
    // oxlint-disable-next-line react/immutability
    dragIndex.value = -1;
    // oxlint-disable-next-line react/immutability
    hoverIndex.value = -1;
    // oxlint-disable-next-line react/immutability
    dragTranslation.value = 0;
  }, [dragIndex, dragTranslation, hoverIndex, picks]);

  function handlePoolTap(driverId: string) {
    if (pickSet.has(driverId)) {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      onChange(picks.filter((id) => id !== driverId));
    } else if (!poolFull) {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      onChange([...picks, driverId]);
    }
  }

  function handleMove(index: number, direction: 'up' | 'down') {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= picks.length) {
      return;
    }
    void Haptics.selectionAsync();
    const next = [...picks];
    [next[index], next[targetIndex]] = [next[targetIndex]!, next[index]!];
    onChange(next);
  }

  function handleRemove(index: number) {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onChange(picks.filter((_, i) => i !== index));
  }

  function handleReorder(from: number, to: number) {
    if (from < 0 || to < 0 || from === to) {
      // oxlint-disable-next-line react/immutability
      dragIndex.value = -1;
      // oxlint-disable-next-line react/immutability
      hoverIndex.value = -1;
      // oxlint-disable-next-line react/immutability
      dragTranslation.value = 0;
      return;
    }
    onChange(arrayMove(picks, from, to));
  }

  return (
    <View className="gap-3.5">
      <View className="overflow-hidden rounded-xl border border-border bg-surface">
        <View className="flex-row">
          <TimingRail />
          <View className="min-w-0 flex-1">
            {pickedItems.map((item, index) => (
              <PickedRow
                count={pickedItems.length}
                disabled={disabled}
                dragIndex={dragIndex}
                dragTranslation={dragTranslation}
                hoverIndex={hoverIndex}
                index={index}
                item={item}
                key={item.driverId}
                onDraggingChange={onDraggingChange}
                onMoveDown={() => handleMove(index, 'down')}
                onMoveUp={() => handleMove(index, 'up')}
                onRemove={() => handleRemove(index)}
                onReorder={handleReorder}
              />
            ))}
            {Array.from({ length: emptyCount }).map((_, i) => (
              <EmptySlot key={`empty-${pickedItems.length + i}`} />
            ))}
          </View>
        </View>
      </View>

      {/* The primary action sits above the pool so a completed list never
          buries Save beneath a grid of already-dimmed drivers. */}
      {action ?? null}

      {!disabled ? (
        <View className="gap-2.5">
          <Text className="text-muted text-xs">
            {poolFull
              ? 'Drag a row to reorder'
              : `${MAX_PICKS - picks.length} remaining. Tap to add`}
          </Text>
          <View className="-mx-[3px] flex-row flex-wrap">
            {sortedDrivers.map((driver) => {
              const pickIndex = picks.indexOf(driver._id);
              return (
                <View className="w-1/4 p-[3px]" key={driver._id}>
                  <PoolDriverCard
                    disabled={disabled}
                    driver={driver}
                    onPress={() => handlePoolTap(driver._id)}
                    pickedPosition={pickIndex === -1 ? null : pickIndex + 1}
                    poolFull={poolFull}
                  />
                </View>
              );
            })}
          </View>
        </View>
      ) : (
        <View className="flex-row items-center gap-1.5 py-1">
          <Ionicons
            color={colors.textMuted}
            name="lock-closed-outline"
            size={14}
          />
          <Text className="text-muted text-xs">
            Session locked. Picks are read-only.
          </Text>
        </View>
      )}
    </View>
  );
}
