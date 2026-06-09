import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import {
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { colors, radii } from '../../theme/tokens';

const COMMON_TIMEZONES = [
  'UTC',
  'Europe/London',
  'Europe/Paris',
  'Europe/Berlin',
  'Europe/Amsterdam',
  'Europe/Madrid',
  'Europe/Rome',
  'Europe/Stockholm',
  'Europe/Vienna',
  'Europe/Warsaw',
  'Europe/Istanbul',
  'Europe/Moscow',
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'America/Toronto',
  'America/Vancouver',
  'America/Mexico_City',
  'America/Sao_Paulo',
  'America/Buenos_Aires',
  'Asia/Dubai',
  'Asia/Kolkata',
  'Asia/Singapore',
  'Asia/Hong_Kong',
  'Asia/Shanghai',
  'Asia/Tokyo',
  'Asia/Seoul',
  'Australia/Sydney',
  'Australia/Melbourne',
  'Australia/Perth',
  'Pacific/Auckland',
  'Africa/Johannesburg',
  'Africa/Cairo',
];

function getOffset(tz: string): string {
  try {
    const parts = new Intl.DateTimeFormat('en-GB', {
      timeZone: tz,
      timeZoneName: 'shortOffset',
    }).formatToParts(new Date());
    return parts.find((p) => p.type === 'timeZoneName')?.value ?? '';
  } catch {
    return '';
  }
}

type TimezonePickerModalProps = {
  visible: boolean;
  currentValue?: string;
  onClose: () => void;
  onSelect: (timezone: string | null) => void;
};

export function TimezonePickerModal({
  visible,
  currentValue,
  onClose,
  onSelect,
}: TimezonePickerModalProps) {
  const [filter, setFilter] = useState('');

  const q = filter.trim().toLowerCase();
  const filtered = !q
    ? COMMON_TIMEZONES
    : COMMON_TIMEZONES.filter(
        (tz) =>
          tz.toLowerCase().includes(q) ||
          getOffset(tz).toLowerCase().includes(q),
      );

  return (
    <Modal
      animationType="slide"
      onRequestClose={onClose}
      presentationStyle="formSheet"
      visible={visible}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Choose timezone</Text>
          <Pressable hitSlop={10} onPress={onClose}>
            <Ionicons color={colors.text} name="close" size={22} />
          </Pressable>
        </View>

        <TextInput
          autoCapitalize="none"
          autoCorrect={false}
          onChangeText={setFilter}
          placeholder="Search timezones…"
          placeholderTextColor={colors.textMuted}
          style={styles.search}
          value={filter}
        />

        <Pressable
          onPress={() => {
            onSelect(null);
            onClose();
          }}
          style={styles.deviceRow}
        >
          <Ionicons
            color={colors.accent}
            name="phone-portrait-outline"
            size={18}
          />
          <View style={styles.deviceRowText}>
            <Text style={styles.rowLabel}>Use device timezone</Text>
            <Text style={styles.rowOffset}>
              {Intl.DateTimeFormat().resolvedOptions().timeZone}
            </Text>
          </View>
          {!currentValue ? (
            <Ionicons color={colors.accent} name="checkmark" size={18} />
          ) : null}
        </Pressable>

        <FlatList
          data={filtered}
          keyExtractor={(tz) => tz}
          renderItem={({ item }) => {
            const isSelected = item === currentValue;
            return (
              <Pressable
                onPress={() => {
                  onSelect(item);
                  onClose();
                }}
                style={[styles.row, isSelected ? styles.rowSelected : null]}
              >
                <View style={styles.rowText}>
                  <Text style={styles.rowLabel}>{item.replace(/_/g, ' ')}</Text>
                  <Text style={styles.rowOffset}>{getOffset(item)}</Text>
                </View>
                {isSelected ? (
                  <Ionicons color={colors.accent} name="checkmark" size={18} />
                ) : null}
              </Pressable>
            );
          }}
          showsVerticalScrollIndicator={false}
        />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.page,
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  deviceRow: {
    alignItems: 'center',
    backgroundColor: colors.accentMuted,
    borderColor: colors.accent,
    borderRadius: radii.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  deviceRowText: {
    flex: 1,
    gap: 2,
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingBottom: 12,
  },
  row: {
    alignItems: 'center',
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 6,
    paddingVertical: 12,
  },
  rowLabel: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '600',
  },
  rowOffset: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '600',
  },
  rowSelected: {
    backgroundColor: colors.surface,
    borderRadius: radii.md,
  },
  rowText: {
    flex: 1,
    gap: 2,
  },
  search: {
    backgroundColor: colors.surfaceElevated,
    borderColor: colors.border,
    borderRadius: radii.md,
    borderWidth: 1,
    color: colors.text,
    fontSize: 15,
    marginBottom: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  title: {
    color: colors.text,
    fontSize: 17,
    fontWeight: '700',
  },
});
