import { Ionicons } from '@expo/vector-icons';
import { useQuery } from 'convex/react';
import * as Haptics from 'expo-haptics';

import { api } from '../../integrations/convex/api';
import { useMobileConfig } from '../../providers/mobile-config';
import { colors } from '../../theme/tokens';
import { Pressable, Text, View } from '../../tw';

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
    <Pressable
      className="relative px-2 py-1"
      hitSlop={10}
      onPress={handlePress}
    >
      <Ionicons color={colors.text} name="notifications-outline" size={22} />
      {unreadCount > 0 ? (
        <View className="absolute -top-0.5 -right-1 h-4 min-w-4 items-center justify-center rounded-lg bg-accent px-1">
          <Text className="text-[10px] font-extrabold text-page">
            {unreadCount > 9 ? '9+' : unreadCount}
          </Text>
        </View>
      ) : null}
    </Pressable>
  );
}
