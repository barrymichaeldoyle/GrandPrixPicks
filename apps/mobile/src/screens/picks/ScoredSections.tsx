import { Ionicons } from '../../components/ui/Ionicons';
import type { SessionType } from '@grandprixpicks/shared/sessions';
import { buildScoreShareText } from '@grandprixpicks/shared/share';
import * as Haptics from 'expo-haptics';
import { Share } from 'react-native';
import { SessionResultsCard } from '../../components/races/SessionResultsCard';
import { captureAnalyticsEvent } from '../../lib/analytics';
import { colors } from '../../theme/tokens';
import { Pressable, Text, View } from '../../tw';
import { H2HReadonly, type Matchup } from './H2HSection';
import { SectionHeader } from './PicksChrome';
import type { RaceDoc } from './picksShared';

/* Scored-session results and the weekend points strip. */

type ResultsCardProps = React.ComponentProps<typeof SessionResultsCard>;

export function WeekendPointsStrip({
  race,
  scoresBySession,
  h2hTotal,
  isFinal,
}: {
  race: RaceDoc;
  scoresBySession: Record<string, { points: number } | null> | null;
  h2hTotal: number;
  /** Every weekend session has a published result. */
  isFinal: boolean;
}) {
  const top5Total = scoresBySession
    ? Object.values(scoresBySession).reduce(
        (sum, score) => sum + (score?.points ?? 0),
        0,
      )
    : 0;
  const totalPoints = top5Total + h2hTotal;

  async function handleShare() {
    void Haptics.selectionAsync();
    const result = await Share.share({
      message: buildScoreShareText({
        raceName: race.name,
        points: totalPoints,
        isFinal,
        accountHandle: '@GrandPrixPicks',
      }),
    });
    captureAnalyticsEvent('score_share_opened', {
      final: isFinal,
      completed: result.action === Share.sharedAction,
    });
  }

  return (
    <View className="flex-row items-center gap-1.5">
      <View className="flex-1 flex-row items-baseline gap-1.5">
        <Text className="text-muted text-xs font-medium">Weekend so far</Text>
        <Text className="text-sm font-semibold text-accent-hover">
          {totalPoints} pts
        </Text>
      </View>
      <Pressable
        accessibilityRole="button"
        className="flex-row items-center gap-1 rounded-sm border border-border px-2.5 py-1 active:opacity-70"
        hitSlop={6}
        onPress={() => void handleShare()}
      >
        <Ionicons color={colors.accent} name="share-outline" size={13} />
        <Text className="text-xs font-bold text-accent">Share</Text>
      </Pressable>
    </View>
  );
}

export function ScoredSessionSection({
  session,
  actual,
  myScore,
  h2hScore,
  matchups,
  h2hPicks,
}: {
  session: SessionType;
  actual: ResultsCardProps['actual'];
  myScore: {
    points: number;
    enrichedBreakdown: NonNullable<ResultsCardProps['pickBreakdown']>;
  } | null;
  h2hScore: {
    points: number;
    correctPicks: number;
    totalPicks: number;
  } | null;
  matchups: ReadonlyArray<Matchup>;
  h2hPicks: Record<string, string>;
}) {
  return (
    <View className="gap-4">
      <View className="gap-2">
        <SectionHeader title="Results" />
        <SessionResultsCard
          actual={actual}
          pickBreakdown={myScore?.enrichedBreakdown}
          session={session}
          totalPoints={myScore?.points}
        />
      </View>
      {matchups.length > 0 ? (
        <View className="gap-2">
          <SectionHeader
            title="Head to Head"
            action={
              h2hScore ? (
                <Text className="text-xs">
                  <Text className="text-foreground font-semibold">
                    {h2hScore.correctPicks}/{h2hScore.totalPicks}
                  </Text>
                  <Text className="text-muted">
                    {' '}
                    correct · {h2hScore.points} pts
                  </Text>
                </Text>
              ) : null
            }
          />
          <H2HReadonly matchups={matchups} selections={h2hPicks} />
        </View>
      ) : null}
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Page header — flat, no card
// ─────────────────────────────────────────────────────────────────────────
