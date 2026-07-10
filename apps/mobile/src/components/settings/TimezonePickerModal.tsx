import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';

import { colors } from '../../theme/tokens';
import { FlatList, Modal, Pressable, Text, TextInput, View } from '../../tw';

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
      <View className="flex-1 bg-page px-4 pt-4">
        <View className="flex-row items-center justify-between pb-3">
          <Text className="text-foreground text-[17px] font-bold">
            Choose timezone
          </Text>
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
          className="text-foreground mb-3 rounded-md border border-border bg-surface-elevated px-3 py-2.5 text-[15px]"
          value={filter}
        />

        <Pressable
          className="mb-3 flex-row items-center gap-3 rounded-md border border-accent bg-accent-muted px-3.5 py-3"
          onPress={() => {
            onSelect(null);
            onClose();
          }}
        >
          <Ionicons
            color={colors.accent}
            name="phone-portrait-outline"
            size={18}
          />
          <View className="flex-1 gap-0.5">
            <Text className="text-foreground text-[15px] font-semibold">
              Use device timezone
            </Text>
            <Text className="text-muted text-[11px] font-semibold">
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
                className={`flex-row items-center gap-3 border-b border-border px-1.5 py-3 ${
                  isSelected ? 'rounded-md bg-surface' : ''
                }`}
                onPress={() => {
                  onSelect(item);
                  onClose();
                }}
              >
                <View className="flex-1 gap-0.5">
                  <Text className="text-foreground text-[15px] font-semibold">
                    {item.replace(/_/g, ' ')}
                  </Text>
                  <Text className="text-muted text-[11px] font-semibold">
                    {getOffset(item)}
                  </Text>
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
