import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import DraggableFlatList, {
  type RenderItemParams,
  ScaleDecorator,
} from 'react-native-draggable-flatlist';

import { teamStandingsIndex } from '@grandprixpicks/shared/teams';

import type { ConvexDoc } from '../../integrations/convex/api';
import { getTeamColor } from '../../lib/teamColors';
import { colors, radii } from '../../theme/tokens';
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
    <View style={[styles.slot, isActive ? styles.slotActive : null]}>
      <Pressable
        delayLongPress={120}
        disabled={disabled}
        onLongPress={() => {
          void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          drag();
        }}
        style={[styles.slotBadge, { backgroundColor: teamColor }]}
      >
        <View style={styles.slotBadgePill}>
          {item.driver.number != null ? (
            <Text style={styles.slotBadgeNumber}>{item.driver.number}</Text>
          ) : null}
          <Text style={styles.slotBadgeCode}>{item.driver.code}</Text>
        </View>
      </Pressable>
      <Pressable
        delayLongPress={120}
        disabled={disabled}
        onLongPress={() => {
          void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          drag();
        }}
        style={styles.slotBody}
      >
        <Text numberOfLines={1} style={styles.slotName}>
          {item.driver.displayName}
        </Text>
        {item.driver.team ? (
          <Text numberOfLines={1} style={styles.slotTeam}>
            {item.driver.team}
          </Text>
        ) : null}
      </Pressable>
      {!disabled ? (
        <View style={styles.slotActions}>
          <Pressable
            disabled={!canMoveUp}
            onPress={onMoveUp}
            style={[styles.iconBtn, !canMoveUp ? styles.iconBtnDisabled : null]}
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
            style={[
              styles.iconBtn,
              !canMoveDown ? styles.iconBtnDisabled : null,
            ]}
          >
            <Ionicons
              color={canMoveDown ? colors.text : colors.textMuted}
              name="chevron-down"
              size={14}
            />
          </Pressable>
          <Pressable onPress={onRemove} style={styles.iconBtn}>
            <Ionicons color={colors.textMuted} name="close" size={14} />
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

function EmptySlot({ position }: { position: number }) {
  return (
    <View style={[styles.slot, styles.slotEmpty]}>
      <View style={[styles.slotBadge, { backgroundColor: colors.surfaceMuted }]}>
        <Numeral style={styles.slotEmptyPosition} tone="muted" variant="large">
          {`P${position}`}
        </Numeral>
      </View>
      <View style={styles.slotBody}>
        <Text style={styles.slotPlaceholder}>Pick #{position}</Text>
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
      disabled={isDisabled && !inPicks}
      onPress={onPress}
      style={[
        styles.poolCard,
        { backgroundColor: teamColor },
        inPicks ? styles.poolCardSelected : null,
        isDisabled && !inPicks ? styles.poolCardDisabled : null,
      ]}
    >
      <View style={styles.poolPill}>
        {driver.number != null ? (
          <Text style={styles.poolNumber}>{driver.number}</Text>
        ) : null}
        <Text style={styles.poolCode}>{driver.code}</Text>
      </View>
      {inPicks ? (
        <View style={styles.poolCheck}>
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

  function renderItem({ item, drag, isActive, getIndex }: RenderItemParams<PickedItem>) {
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
    <View style={styles.container}>
      <View style={styles.slots}>
        {pickedItems.length > 0 ? (
          <DraggableFlatList
            activationDistance={8}
            containerStyle={styles.dragList}
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
          <EmptySlot
            key={`empty-${i}`}
            position={pickedItems.length + i + 1}
          />
        ))}
      </View>

      {!disabled ? (
        <View style={styles.pool}>
          <Text style={styles.poolHeader}>
            {poolFull
              ? 'Tap a pick to remove · long-press a row to reorder'
              : `${MAX_PICKS - picks.length} remaining — tap to add`}
          </Text>
          <FlatList
            columnWrapperStyle={styles.poolRow}
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
        <View style={styles.lockedNote}>
          <Ionicons
            color={colors.textMuted}
            name="lock-closed-outline"
            size={14}
          />
          <Text style={styles.lockedNoteText}>
            Session locked — picks are read-only
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 14,
  },
  dragList: {
    flexGrow: 0,
  },
  iconBtn: {
    alignItems: 'center',
    backgroundColor: colors.surfaceMuted,
    borderRadius: 8,
    height: 28,
    justifyContent: 'center',
    width: 28,
  },
  iconBtnDisabled: {
    opacity: 0.3,
  },
  lockedNote: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
    paddingVertical: 4,
  },
  lockedNoteText: {
    color: colors.textMuted,
    fontSize: 12,
  },
  pool: {
    gap: 10,
  },
  poolCard: {
    alignItems: 'center',
    borderRadius: radii.md,
    flex: 1,
    height: 56,
    justifyContent: 'center',
    margin: 3,
  },
  poolCardDisabled: {
    opacity: 0.35,
  },
  poolCardSelected: {
    opacity: 0.4,
  },
  poolCheck: {
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: 999,
    height: 16,
    justifyContent: 'center',
    position: 'absolute',
    right: 4,
    top: 4,
    width: 16,
  },
  poolCode: {
    color: '#fff',
    fontFamily: undefined,
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  poolHeader: {
    color: colors.textMuted,
    fontSize: 12,
  },
  poolNumber: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
    opacity: 0.85,
  },
  poolPill: {
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.35)',
    borderRadius: 6,
    flexDirection: 'row',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  poolRow: {
    gap: 0,
  },
  slot: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
    paddingVertical: 6,
  },
  slotActions: {
    flexDirection: 'row',
    gap: 4,
  },
  slotActive: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: radii.md,
    paddingHorizontal: 6,
  },
  slotBadge: {
    alignItems: 'center',
    borderRadius: radii.md,
    height: 44,
    justifyContent: 'center',
    width: 52,
  },
  slotBadgeCode: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  slotBadgeNumber: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '800',
    lineHeight: 16,
  },
  slotBadgePill: {
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.35)',
    borderRadius: 6,
    gap: 1,
    paddingHorizontal: 6,
    paddingVertical: 3,
  },
  slotBody: {
    flex: 1,
    gap: 2,
  },
  slotEmpty: {
    opacity: 0.55,
  },
  slotEmptyPosition: {
    fontSize: 14,
  },
  slotName: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '700',
  },
  slotPlaceholder: {
    color: colors.textMuted,
    fontSize: 13,
  },
  slots: {
    gap: 4,
  },
  slotTeam: {
    color: colors.textMuted,
    fontSize: 11,
  },
});
