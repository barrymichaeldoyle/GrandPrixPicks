import { colors } from '../../theme/tokens';
import { ActivityIndicator, View } from '../../tw';

export function LoadingScreen() {
  return (
    <View className="flex-1 items-center justify-center bg-page">
      <ActivityIndicator color={colors.accent} size="large" />
    </View>
  );
}
