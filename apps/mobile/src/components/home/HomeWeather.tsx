import { Ionicons } from '@expo/vector-icons';
import { Linking } from 'react-native';
import { api } from '../../integrations/convex/api';
import { useQuery } from '../../integrations/convex/query';
import { bucketWeatherNow, pickForecastHour } from '../../lib/weatherNow';
import { useMobileConfig } from '../../providers/mobile-config';
import { colors } from '../../theme/tokens';
import { Pressable, Text, View } from '../../tw';

export function HomeWeather({
  raceSlug,
  startAt,
  now,
}: {
  raceSlug: string;
  startAt: number;
  now: number;
}) {
  const { convexEnabled } = useMobileConfig();
  const weather = useQuery(
    api.weather.getByRaceSlug,
    convexEnabled ? { raceSlug, now: bucketWeatherNow(now) } : 'skip',
  );
  const hour = weather
    ? pickForecastHour(weather.forecast.hours, startAt)
    : undefined;
  if (!weather || !hour) {
    return null;
  }
  const rainy =
    hour.conditionCode.includes('rain') || hour.conditionCode.includes('sleet');
  const cloudy =
    hour.conditionCode.includes('cloud') || hour.conditionCode.includes('fog');
  return (
    <View className="items-center gap-1">
      <View className="flex-row flex-wrap items-center justify-center gap-2">
        <Ionicons
          name={
            rainy ? 'rainy-outline' : cloudy ? 'cloud-outline' : 'sunny-outline'
          }
          color={colors.textMuted}
          size={18}
        />
        <Text selectable className="text-foreground text-sm">
          {Math.round(hour.temperatureC)}°C
          {hour.precipitationProbability !== undefined
            ? ` · ${Math.round(hour.precipitationProbability)}% rain`
            : ''}
        </Text>
      </View>
      <Pressable
        accessibilityRole="link"
        accessibilityLabel={`Weather forecast by ${weather.attribution.name}`}
        onPress={() => void Linking.openURL(weather.attribution.url)}
        className="min-h-11 justify-center"
      >
        <Text className="text-muted text-xs">
          {weather.isStale ? 'Forecast delayed · ' : 'Forecast · '}
          {weather.attribution.name}
        </Text>
      </Pressable>
    </View>
  );
}
