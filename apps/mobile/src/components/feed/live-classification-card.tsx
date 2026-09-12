import { api } from '../../integrations/convex/api';
import { useQuery } from '../../integrations/convex/query';
import { Text, View } from '../../tw';
import { Card } from '../ui/Card';

const labels: Record<string, string> = {
  fp1: 'Free Practice 1',
  fp2: 'Free Practice 2',
  fp3: 'Free Practice 3',
  quali: 'Qualifying',
  sprint_quali: 'Sprint Qualifying',
  sprint: 'Sprint',
  race: 'Race',
};
type LiveEntry = {
  driverNumber: number;
  position: number;
  code: string;
  displayName: string;
  bestLapSeconds: number | null;
};

export function LiveClassificationCard() {
  const live = useQuery(api.liveClassification.current, {});
  if (!live?.entries.length) {
    return null;
  }
  const entries = live.entries as LiveEntry[];
  return (
    <View className="mx-4 mt-3">
      <Card>
        <View className="flex-row items-center justify-between">
          <View>
            <Text className="text-foreground text-sm font-semibold">
              {live.raceName}
            </Text>
            <Text className="text-muted text-xs">
              {labels[live.sessionType]} as it stands
            </Text>
          </View>
          <Text className="text-xs font-semibold text-accent">Live</Text>
        </View>
        <View>
          {entries.slice(0, 6).map((entry, index) => (
            <View
              className={`flex-row items-center gap-2 py-1.5 ${index ? 'border-t border-border' : ''}`}
              key={entry.driverNumber}
            >
              <Text className="text-muted w-8 text-xs">P{entry.position}</Text>
              <Text className="text-foreground w-11 text-sm font-semibold">
                {entry.code}
              </Text>
              <Text className="text-muted flex-1 text-sm" numberOfLines={1}>
                {entry.displayName}
              </Text>
              <Text className="text-muted text-xs">
                {entry.bestLapSeconds == null
                  ? ''
                  : entry.bestLapSeconds.toFixed(3)}
              </Text>
            </View>
          ))}
        </View>
        <Text className="text-muted text-xs">
          Live timing can change, including after the flag.
        </Text>
      </Card>
    </View>
  );
}
