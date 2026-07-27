import type { SessionType } from '@grandprixpicks/shared/sessions';
import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';

import { captureAnalyticsEvent } from '../../lib/analytics';
import { colors } from '../../theme/tokens';
import { Modal, Pressable, ScrollView, Text, View } from '../../tw';

type PracticeSession = 'fp1' | 'fp2' | 'fp3';
type ResultTab = PracticeSession | 'sprint_quali' | 'sprint' | 'quali';

export type PracticeResult = {
  sessionType: PracticeSession;
  entries: Array<{
    driverNumber: number;
    code: string;
    displayName: string;
    position: number;
    bestLapSeconds?: number;
    gapToLeaderSeconds?: number;
    lapCount?: number;
    isReserve: boolean;
  }>;
};

type CompetitiveEntry = {
  position: number;
  code: string;
  displayName: string;
};

const LABELS: Record<ResultTab, string> = {
  fp1: 'FP1',
  fp2: 'FP2',
  fp3: 'FP3',
  sprint_quali: 'Sprint Quali',
  sprint: 'Sprint',
  quali: 'Quali',
};

function competitiveSessions(
  predictionSession: SessionType,
  hasSprint: boolean,
): Array<'sprint_quali' | 'sprint' | 'quali'> {
  if (!hasSprint) {
    return predictionSession === 'race' ? ['quali'] : [];
  }
  if (predictionSession === 'sprint') {
    return ['sprint_quali'];
  }
  if (predictionSession === 'quali') {
    return ['sprint_quali', 'sprint'];
  }
  if (predictionSession === 'race') {
    return ['sprint_quali', 'sprint', 'quali'];
  }
  return [];
}

function lap(seconds?: number) {
  if (seconds === undefined) {
    return '—';
  }
  return `${Math.floor(seconds / 60)}:${(seconds % 60)
    .toFixed(3)
    .padStart(6, '0')}`;
}

export function PracticeResultsSheet({
  visible,
  onClose,
  practice,
  competitive,
  predictionSession,
  hasSprint,
  raceSlug,
}: {
  visible: boolean;
  onClose: () => void;
  practice: PracticeResult[];
  competitive: Partial<Record<SessionType, CompetitiveEntry[]>>;
  predictionSession: SessionType;
  hasSprint: boolean;
  raceSlug: string;
}) {
  const practiceTabs = (['fp1', 'fp2', 'fp3'] as const).filter((type) =>
    practice.some((result) => result.sessionType === type),
  );
  const competitionTabs = competitiveSessions(
    predictionSession,
    hasSprint,
  ).filter((type) => (competitive[type]?.length ?? 0) > 0);
  const tabs: ResultTab[] = [...practiceTabs, ...competitionTabs];
  const [selected, setSelected] = useState<ResultTab>(tabs[0] ?? 'fp1');
  const active = tabs.includes(selected) ? selected : (tabs[0] ?? 'fp1');

  useEffect(() => {
    if (visible) {
      captureAnalyticsEvent('session_results_modal_opened', {
        race_slug: raceSlug,
        prediction_session: predictionSession,
        platform: 'mobile',
      });
    }
  }, [predictionSession, raceSlug, visible]);

  const practiceResult = practice.find(
    (result) => result.sessionType === active,
  );
  const competitionResult =
    active === 'fp1' || active === 'fp2' || active === 'fp3'
      ? undefined
      : competitive[active];
  const entries: Array<
    CompetitiveEntry & {
      bestLapSeconds?: number;
      lapCount?: number;
      isReserve?: boolean;
    }
  > = practiceResult?.entries ?? competitionResult ?? [];

  return (
    <Modal
      animationType="slide"
      onRequestClose={onClose}
      presentationStyle="pageSheet"
      visible={visible}
    >
      <View className="flex-1 bg-page">
        <View className="flex-row items-center justify-between border-b border-border px-4 py-4">
          <View>
            <Text className="text-muted text-[10px] font-extrabold uppercase">
              Form guide
            </Text>
            <Text className="text-foreground text-xl font-bold">
              Session Results
            </Text>
          </View>
          <Pressable
            accessibilityLabel="Close session results"
            accessibilityRole="button"
            hitSlop={10}
            onPress={onClose}
          >
            <Ionicons color={colors.text} name="close" size={26} />
          </Pressable>
        </View>
        <ScrollView
          horizontal
          className="max-h-14 border-b border-border"
          contentContainerClassName="gap-2 px-4 py-2"
          showsHorizontalScrollIndicator={false}
        >
          {tabs.map((tab) => (
            <Pressable
              accessibilityRole="tab"
              accessibilityState={{ selected: tab === active }}
              className={`rounded-full px-4 py-2 ${
                tab === active ? 'bg-button-accent' : 'bg-surface'
              }`}
              key={tab}
              onPress={() => {
                setSelected(tab);
                captureAnalyticsEvent('session_results_tab_selected', {
                  session_type: tab,
                  platform: 'mobile',
                });
              }}
            >
              <Text className="text-foreground text-xs font-bold">
                {LABELS[tab]}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
        <ScrollView
          className="flex-1"
          contentContainerClassName="px-4 pb-10"
          contentInsetAdjustmentBehavior="automatic"
        >
          {entries.map((entry, index) => (
            <View key={`${active}-${entry.code}`}>
              {index > 0 ? <View className="h-px bg-border" /> : null}
              <View className="flex-row items-center gap-3 py-3">
                <Text className="text-muted w-8 text-xs font-extrabold">
                  P{entry.position}
                </Text>
                <View className="flex-1">
                  <View className="flex-row items-center gap-1.5">
                    <Text className="text-foreground text-sm font-extrabold">
                      {entry.code}
                    </Text>
                    {entry.isReserve ? (
                      <Text className="text-[9px] font-bold text-accent">
                        RESERVE
                      </Text>
                    ) : null}
                  </View>
                  <Text className="text-muted text-[11px]">
                    {entry.displayName}
                  </Text>
                </View>
                {practiceResult ? (
                  <View className="items-end">
                    <Text className="text-foreground text-xs font-bold">
                      {lap(entry.bestLapSeconds)}
                    </Text>
                    <Text className="text-muted text-[10px]">
                      {entry.lapCount === undefined
                        ? '—'
                        : `${entry.lapCount} laps`}
                    </Text>
                  </View>
                ) : null}
              </View>
            </View>
          ))}
        </ScrollView>
      </View>
    </Modal>
  );
}
