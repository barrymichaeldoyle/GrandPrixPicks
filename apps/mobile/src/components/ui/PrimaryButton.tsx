import { Ionicons } from '@expo/vector-icons';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

import { colors } from '../../theme/tokens';
import { Pressable, Text, View } from '../../tw';

type PrimaryButtonProps = {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  /** Trailing Ionicons glyph; defaults to the web CTA's forward arrow. */
  icon?: React.ComponentProps<typeof Ionicons>['name'] | null;
};

/**
 * The web primary CTA: teal gradient pill with a trailing arrow.
 */
export function PrimaryButton({
  label,
  onPress,
  disabled = false,
  icon = 'arrow-forward',
}: PrimaryButtonProps) {
  return (
    <Pressable
      className={`overflow-hidden rounded-xl ${
        disabled ? 'opacity-40' : 'active:opacity-90'
      }`}
      disabled={disabled}
      onPress={onPress}
    >
      <View className="absolute inset-0">
        <Svg
          height="100%"
          preserveAspectRatio="none"
          viewBox="0 0 100 100"
          width="100%"
        >
          <Defs>
            <LinearGradient id="primary-cta" x1="0" x2="1" y1="0" y2="0">
              <Stop offset="0%" stopColor={colors.buttonAccent} />
              <Stop offset="100%" stopColor={colors.accent} />
            </LinearGradient>
          </Defs>
          <Rect fill="url(#primary-cta)" height="100" width="100" x="0" y="0" />
        </Svg>
      </View>
      <View className="flex-row items-center justify-center gap-2 py-3.5">
        <Text className="text-sm font-bold text-white">{label}</Text>
        {icon ? <Ionicons color="#ffffff" name={icon} size={15} /> : null}
      </View>
    </Pressable>
  );
}
