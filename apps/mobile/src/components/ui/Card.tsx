import type { ReactNode } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';

import { View } from '../../tw';

type CardProps = {
  children: ReactNode;
  elevated?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function Card({ children, elevated = false, style }: CardProps) {
  return (
    <View
      className={`gap-3 rounded-xl border p-4 ${
        elevated
          ? 'border-border-strong bg-surface-elevated'
          : 'border-border bg-surface'
      }`}
      style={style}
    >
      {children}
    </View>
  );
}
