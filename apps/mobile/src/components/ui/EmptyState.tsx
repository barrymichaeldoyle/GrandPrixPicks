import { Ionicons } from '@expo/vector-icons';
import type { ReactNode } from 'react';

import { colors } from '../../theme/tokens';
import { Text, View } from '../../tw';

type EmptyStateProps = {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  title: string;
  body?: string;
  action?: ReactNode;
};

export function EmptyState({ icon, title, body, action }: EmptyStateProps) {
  return (
    <View className="flex-1 items-center justify-center gap-2.5 px-8">
      <Ionicons color={colors.textMuted} name={icon} size={40} />
      <Text className="text-foreground text-center text-[17px] font-bold">
        {title}
      </Text>
      {body ? (
        <Text className="text-muted text-center text-sm leading-5">{body}</Text>
      ) : null}
      {action ?? null}
    </View>
  );
}
