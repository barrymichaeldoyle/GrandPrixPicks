import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import DraggableFlatList, {
  type RenderItemParams,
  ScaleDecorator,
} from 'react-native-draggable-flatlist';

import { teamStandingsIndex } from '@grandprixpicks/shared/teams';

import type { ConvexDoc } from '../../integrations/convex/api';
import { getTeamColor } from '../../lib/teamColors';
import { colors } from '../../theme/tokens';
import { FlatList, Pressable, Text, View } from '../../tw';
import { Numeral } from '../ui/Numeral';

type Driver = ConvexDoc<'drivers'>;

type DraggableTop5Props = {
  picks: string[];
  drivers: Driver[];
  onChange: (picks: string[]) => void;
  disabled?: boolean;
};

const MAX_PICKS = 5;

type PickedItem = { driverId: string; driver: Driver; index: number };

function PickedRow({
  item,
  drag,
  isActive,
  canMoveUp,
  canMoveDown,
  disabled,
  onMoveUp,
  onMoveDown,
  onRemove,
}: {
  item: PickedItem;
  drag: () => void;
  isActive: boolean;
  canMoveUp: boolean;
  canMoveDown: boolean;
  disabled: boolean;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onRemove: () => void;
}) {
  const teamColor = getTeamColor(item.driver.team);

  return (
    <View
      className={`flex-row items-center gap-2.5 py-1.5 ${
        isActive ? 'rounded-md bg-surface-elevated px-1.5' : ''
      }`}
    >
      <Pressable
        delayLongPress={120}
        disabled={disabled}
        onLongPress={() => {
          void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          drag();
        }}
        className="h-11 w-[52px] items-center justify-center rounded-md"
        style={{ backgroundColor: teamColor }}
      >
        <View className="items-center gap-px rounded-md bg-black/35 px-1.5 py-[3px]">
          {item.driver.number != null ? (
            <Text className="text-sm leading-4 font-extrabold text-white">
              {item.driver.number}
            </Text>
          ) : null}
          <Text className="text-[11px] font-extrabold text-white">
            {item.driver.code}
          </Text>
        </View>
      </Pressable>
      <Pressable
        delayLongPress={120}
        disabled={disabled}
        onLongPress={() => {
          void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          drag();
        }}
        className="flex-1 gap-0.5"
      >
        <Text
          className="text-foreground text-[13px] font-bold"
          numberOfLines={1}
        >
          {item.driver.displayName}
        </Text>
        {item.driver.team ? (
          <Text className="text-muted text-[11px]" numberOfLines={1}>
            {item.driver.team}
          </Text>
        ) : null}
      </Pressable>
      {!disabled ? (
        <View className="flex-row gap-1">
          <Pressable
            disabled={!canMoveUp}
            onPress={onMoveUp}
            className={`h-7 w-7 items-center justify-center rounded-lg bg-surface-muted ${
              canMoveUp ? '' : 'opacity-30'
            }`}
          >
            <Ionicons
              color={canMoveUp ? colors.text : colors.textMuted}
              name="chevron-up"
              size={14}
            />
          </Pressable>
          <Pressable
            disabled={!canMoveDown}
            onPress={onMoveDown}
            className={`h-7 w-7 items-center justify-center rounded-lg bg-surface-muted ${
              canMoveDown ? '' : 'opacity-30'
            }`}
          >
            <Ionicons
              color={canMoveDown ? colors.text : colors.textMuted}
              name="chevron-down"
              size={14}
            />
          </Pressable>
          <Pressable
            className="h-7 w-7 items-center justify-center rounded-lg bg-surface-muted"
            onPress={onRemove}
          >
            <Ionicons color={colors.textMuted} name="close" size={14} />
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

function EmptySlot({ position }: { position: number }) {
  return (
    <View className="flex-row items-center gap-2.5 py-1.5 opacity-55">
      <View className="h-11 w-[52px] items-center justify-center rounded-md bg-surface-muted">
        <Numeral style={{ fontSize: 14 }} tone="muted" variant="large">
          {`P${position}`}
        </Numeral>
      </View>
      <View className="flex-1 gap-0.5">
        <Text className="text-muted text-[13px]">Pick #{position}</Text>
      </View>
    </View>
  );
}

function PoolDriverCard({
  driver,
  inPicks,
  poolFull,
  disabled,
  onPress,
}: {
  driver: Driver;
  inPicks: boolean;
  poolFull: boolean;
  disabled: boolean;
  onPress: () => void;
}) {
  const teamColor = getTeamColor(driver.team);
  const isDisabled = disabled || (!inPicks && poolFull);

  return (
    <Pressable
      className={`m-[3px] h-14 flex-1 items-center justify-center rounded-md ${
        inPicks ? 'opacity-40' : isDisabled ? 'opacity-35' : ''
      }`}
      disabled={isDisabled && !inPicks}
      onPress={onPress}
      style={{ backgroundColor: teamColor }}
    >
      <View className="flex-row items-center gap-1 rounded-md bg-black/35 px-2 py-1">
        {driver.number != null ? (
          <Text className="text-[11px] font-bold text-white opacity-85">
            {driver.number}
          </Text>
        ) : null}
        <Text className="text-[13px] font-extrabold text-white">
          {driver.code}
        </Text>
      </View>
      {inPicks ? (
        <View className="absolute top-1 right-1 h-4 w-4 items-center justify-center rounded-full bg-black/55">
          <Ionicons color="#fff" name="checkmark" size={10} />
        </View>
      ) : null}
    </Pressable>
  );
}

function sortDrivers(drivers: Driver[]): Driver[] {
  return [...drivers].sort((a, b) => {
    const teamA = teamStandingsIndex(a.team);
    const teamB = teamStandingsIndex(b.team);
    if (teamA !== teamB) {
      return teamA - teamB;
    }
    const numA = a.number ?? 999;
    const numB = b.number ?? 999;
    if (numA !== numB) {
      return numA - numB;
    }
    return a.displayName.localeCompare(b.displayName);
  });
}

export function DraggableTop5({
  picks,
  drivers,
  onChange,
  disabled = false,
}: DraggableTop5Props) {
  const sortedDrivers = sortDrivers(drivers);
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
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const next = [...picks];
    [next[index], next[targetIndex]] = [next[targetIndex]!, next[index]!];
    onChange(next);
  }

  function handleRemove(index: number) {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onChange(picks.filter((_, i) => i !== index));
  }

  function renderItem({
    item,
    drag,
    isActive,
    getIndex,
  }: RenderItemParams<PickedItem>) {
    const index = getIndex() ?? item.index;
    return (
      <ScaleDecorator>
        <PickedRow
          canMoveDown={index < pickedItems.length - 1}
          canMoveUp={index > 0}
          disabled={disabled}
          drag={drag}
          isActive={isActive}
          item={item}
          onMoveDown={() => handleMove(index, 'down')}
          onMoveUp={() => handleMove(index, 'up')}
          onRemove={() => handleRemove(index)}
        />
      </ScaleDecorator>
    );
  }

  return (
    <View className="gap-3.5">
      <View className="gap-1">
        {pickedItems.length > 0 ? (
          <DraggableFlatList
            activationDistance={8}
            containerStyle={{ flexGrow: 0 }}
            data={pickedItems}
            keyExtractor={(item) => item.driverId}
            onDragEnd={({ data }) => {
              void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              onChange(data.map((item) => item.driverId));
            }}
            renderItem={renderItem}
            scrollEnabled={false}
          />
        ) : null}
        {Array.from({ length: emptyCount }).map((_, i) => (
          <EmptySlot key={`empty-${i}`} position={pickedItems.length + i + 1} />
        ))}
      </View>

      {!disabled ? (
        <View className="gap-2.5">
          <Text className="text-muted text-xs">
            {poolFull
              ? 'Tap a pick to remove · long-press a row to reorder'
              : `${MAX_PICKS - picks.length} remaining. Tap to add`}
          </Text>
          <FlatList
            columnWrapperClassName="gap-0"
            data={sortedDrivers}
            keyExtractor={(d) => d._id}
            numColumns={4}
            renderItem={({ item }) => (
              <PoolDriverCard
                disabled={disabled}
                driver={item}
                inPicks={pickSet.has(item._id)}
                onPress={() => handlePoolTap(item._id)}
                poolFull={poolFull}
              />
            )}
            scrollEnabled={false}
          />
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
