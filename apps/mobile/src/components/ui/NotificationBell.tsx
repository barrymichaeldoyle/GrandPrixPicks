import { Ionicons } from '@expo/vector-icons';
import { useQuery } from 'convex/react';
import * as Haptics from 'expo-haptics';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { api } from '../../integrations/convex/api';
import { useMobileConfig } from '../../providers/mobile-config';
import { colors } from '../../theme/tokens';

type NotificationBellProps = {
  onPress: () => void;
};

export function NotificationBell({ onPress }: NotificationBellProps) {
  const { convexEnabled } = useMobileConfig();
  const result = useQuery(
    api.inAppNotifications.getMyNotifications,
    convexEnabled ? {} : 'skip',
  );

  const unreadCount = result?.unreadCount ?? 0;

  function handlePress() {
    void Haptics.selectionAsync();
    onPress();
  }

  return (
    <Pressable hitSlop={10} onPress={handlePress} style={styles.button}>
      <Ionicons color={colors.text} name="notifications-outline" size={22} />
      {unreadCount > 0 ? (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>
            {unreadCount > 9 ? '9+' : unreadCount}
          </Text>
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignItems: 'center',
    backgroundColor: colors.accent,
    borderRadius: 8,
    height: 16,
    justifyContent: 'center',
    minWidth: 16,
    paddingHorizontal: 4,
    position: 'absolute',
    right: -4,
    top: -2,
  },
  badgeText: {
    color: '#0f172a',
    fontSize: 10,
    fontVariant: ['tabular-nums'],
    fontWeight: '800',
  },
  button: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    position: 'relative',
  },
});
