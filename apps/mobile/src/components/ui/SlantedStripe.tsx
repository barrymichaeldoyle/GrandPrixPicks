import { View } from '../../tw';
import { colors } from '../../theme/tokens';
export function SlantedStripe({
  color = colors.accent,
  reverse = false,
}: {
  color?: string;
  reverse?: boolean;
}) {
  return (
    <View
      pointerEvents="none"
      accessible={false}
      style={{
        position: 'absolute',
        top: -16,
        bottom: -16,
        width: 4,
        right: reverse ? undefined : 12,
        left: reverse ? 12 : undefined,
        backgroundColor: color,
        transform: [{ skewX: '-15deg' }],
      }}
    />
  );
}
