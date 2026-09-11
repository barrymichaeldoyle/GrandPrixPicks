import { Ionicons } from '@expo/vector-icons';
import type { SessionType } from '@grandprixpicks/shared/sessions';
import { Dimensions } from 'react-native';

import { api, type ConvexId } from '../../integrations/convex/api';
import { useQuery } from '../../integrations/convex/query';
import { loadingRowsFor } from '../../lib/h2hLoadingRows';
import { displayTeamName, getTeamColor } from '../../lib/teamColors';
import { colors } from '../../theme/tokens';
import { Modal, Pressable, ScrollView, Text, View } from '../../tw';

type DriverChipProps = {
  code: string;
  team?: string | null;
  picked: boolean;
};

function DriverChip({ code, team, picked }: DriverChipProps) {
  return (
    <View
      className={`relative h-6 min-w-9 items-center justify-center overflow-hidden rounded-sm border border-border bg-surface-elevated pr-1.5 pl-2 ${
        picked ? '' : 'opacity-30'
      }`}
    >
      <View
        className="absolute top-0 bottom-0 left-0 w-[3px]"
        style={{ backgroundColor: getTeamColor(team) }}
      />
      <Text className="text-foreground text-xs leading-none font-medium uppercase">
        {code}
      </Text>
    </View>
  );
}

function TeamCell({ team }: { team: string }) {
  return (
    <View className="min-w-0 flex-1 flex-row items-center gap-1.5">
      <View
        className="h-[5px] w-[5px] rounded-full"
        style={{ backgroundColor: getTeamColor(team) }}
      />
      <Text
        className="text-muted min-w-0 flex-1 text-xs leading-none"
        numberOfLines={1}
      >
        {displayTeamName(team)}
      </Text>
    </View>
  );
}

export function H2HPicksDialog({
  userId,
  raceId,
  sessionType,
  displayName,
  teamOrder,
  onClose,
}: {
  userId: ConvexId<'users'>;
  raceId: ConvexId<'races'>;
  sessionType: SessionType;
  displayName: string;
  teamOrder?: readonly string[];
  onClose: () => void;
}) {
  const picks = useQuery(api.h2h.getH2HPicksForFeedItem, {
    userId,
    raceId,
    sessionType,
  });
  const maxHeight = Dimensions.get('window').height * 0.7;

  return (
    <Modal animationType="fade" onRequestClose={onClose} transparent visible>
      <Pressable
        accessibilityRole="button"
        className="flex-1 items-center justify-center bg-black/50 px-4"
        onPress={onClose}
      >
        <Pressable
          accessibilityRole="none"
          className="w-full max-w-sm overflow-hidden rounded-sm border border-border bg-surface"
          onPress={(event) => event.stopPropagation()}
        >
          <View className="flex-row items-start justify-between px-4 pt-4 pb-2">
            <View className="min-w-0 flex-1 pr-3">
              <Text className="text-foreground font-semibold">
                Head to Head
              </Text>
              <Text className="text-muted text-xs">{`${displayName}'s picks`}</Text>
            </View>
            <Pressable
              accessibilityLabel="Close"
              accessibilityRole="button"
              className="p-0.5"
              hitSlop={8}
              onPress={onClose}
            >
              <Ionicons color={colors.textMuted} name="close" size={16} />
            </Pressable>
          </View>
          <View className="border-t border-border" />
          <ScrollView style={{ maxHeight }}>
            {picks === undefined ? (
              loadingRowsFor(teamOrder).map((duel) => (
                <View
                  className="h-9 flex-row items-center gap-2 px-4"
                  key={`${duel.team}-${duel.driver1Code}-${duel.driver2Code}`}
                >
                  <TeamCell team={duel.team} />
                  <View className="opacity-30">
                    <DriverChip
                      code={duel.driver1Code}
                      picked
                      team={duel.team}
                    />
                  </View>
                  <Text className="text-muted/40 shrink-0 text-xs leading-none">
                    vs
                  </Text>
                  <View className="opacity-30">
                    <DriverChip
                      code={duel.driver2Code}
                      picked
                      team={duel.team}
                    />
                  </View>
                  <View className="w-4 shrink-0 items-center">
                    <View className="h-4 w-4 rounded-full bg-surface-muted" />
                  </View>
                </View>
              ))
            ) : !picks || picks.length === 0 ? (
              <Text className="text-muted px-4 py-3 text-sm">
                No H2H picks for this session.
              </Text>
            ) : (
              picks.map((pick) => {
                const d1Picked = pick.predictedWinnerId === pick.driver1._id;
                return (
                  <View
                    className="h-9 flex-row items-center gap-2 px-4"
                    key={pick.matchupId}
                  >
                    <TeamCell team={pick.team} />
                    <DriverChip
                      code={pick.driver1.code}
                      picked={d1Picked}
                      team={pick.driver1.team}
                    />
                    <Text className="text-muted/40 shrink-0 text-xs leading-none">
                      vs
                    </Text>
                    <DriverChip
                      code={pick.driver2.code}
                      picked={!d1Picked}
                      team={pick.driver2.team}
                    />
                    <View className="w-4 shrink-0 items-center">
                      {pick.hasResult ? (
                        <Ionicons
                          color={pick.correct ? colors.success : colors.error}
                          name={pick.correct ? 'checkmark' : 'close'}
                          size={16}
                        />
                      ) : null}
                    </View>
                  </View>
                );
              })
            )}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
