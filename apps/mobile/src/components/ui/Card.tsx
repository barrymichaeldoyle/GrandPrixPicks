import type { ReactNode } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';

import { View } from '../../tw';

type CardProps = {
  children: ReactNode;
  elevated?: boolean;
  style?: StyleProp<ViewStyle>;
};

/**
 * A feed block. Flush to both walls with a hairline above and below, like the
 * session and news cards beside it and like web's phone layout (`max-md:-mx-4
 * border-x-0`): the stream reads as one joined sheet broken only by the
 * weekend chequer, not a stack of inset tiles with gaps between them.
 */
export function Card({ children, elevated = false, style }: CardProps) {
  return (
    <View
      className={`gap-3 border-y p-4 ${
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
