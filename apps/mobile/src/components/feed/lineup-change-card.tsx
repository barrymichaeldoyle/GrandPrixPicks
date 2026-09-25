import { getTeamColor } from '../../lib/teamColors';
import { Text, View } from '../../tw';
import { Card } from '../ui/Card';
import { NationalityFlag } from '../ui/FlagImage';
import { formatRelativeTime } from './helpers';
import type { FeedEvent } from './types';

/** A driver-seat change, with its own frame only outside a news run. */
export function LineupChangeCard({
  event,
  grouped = false,
}: {
  event: FeedEvent;
  grouped?: boolean;
}) {
  const moves = event.seatMoves ?? [];
  const content = (
    <>
      <View className="gap-0.5">
        {grouped ? null : (
          <Text className="text-xs font-medium text-accent">Grid change</Text>
        )}
        <Text className="text-foreground text-sm font-bold">
          {event.raceName
            ? `New line-up from the ${event.raceName}`
            : 'The line-up has changed'}
        </Text>
        <Text className="text-muted text-xs">
          {formatRelativeTime(event.createdAt)}
        </Text>
      </View>

      <View className="gap-1.5 pt-1">
        {moves.map((move) => (
          <View
            key={`${move.team}-${move.inDriverCode}`}
            className="flex-row items-center gap-2.5"
          >
            <View
              className="h-8 w-[3px] rounded-full"
              style={{ backgroundColor: getTeamColor(move.team) }}
            />
            <View className="flex-1 gap-0.5">
              <Text className="text-muted text-xs">{move.team}</Text>
              <View className="flex-row flex-wrap items-center gap-1.5">
                {move.outDriverName ? (
                  <>
                    {move.outNationality ? (
                      <NationalityFlag code={move.outNationality} />
                    ) : null}
                    <Text className="text-muted text-sm line-through">
                      {move.outDriverName}
                    </Text>
                    <Text className="text-muted text-sm">to</Text>
                  </>
                ) : null}
                {move.inNationality ? (
                  <NationalityFlag code={move.inNationality} />
                ) : null}
                <Text className="text-foreground text-sm font-bold">
                  {move.inDriverName}
                </Text>
              </View>
            </View>
          </View>
        ))}
      </View>

      {event.lineupNote ? (
        <Text className="text-muted text-sm leading-5">{event.lineupNote}</Text>
      ) : null}
    </>
  );

  return grouped ? (
    <View className="gap-3 px-3 py-2.5">{content}</View>
  ) : (
    <Card>{content}</Card>
  );
}
