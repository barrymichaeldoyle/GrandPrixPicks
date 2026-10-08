import { Ionicons } from '../../components/ui/Ionicons';
import {
  SESSION_LABELS,
  SESSION_LABELS_SHORT,
  type SessionType,
} from '@grandprixpicks/shared/sessions';
import { FlagImage } from '../../components/ui/FlagImage';
import { useUserDateFormat } from '../../lib/dates';
import { formatCountdown, getLockStatusViewModel } from '../../lib/lockTime';
import { colors } from '../../theme/tokens';
import { useTypography } from '../../theme/typography';
import { Pressable, Text, View } from '../../tw';
import { getSessionLockAt, type RaceDoc } from './picksShared';

/* Header, cascade banner, session tabs and section headers around the pick editors. */

export function PageHeader({
  race,
  selectedSession,
  now,
}: {
  race: RaceDoc;
  selectedSession: SessionType;
  now: number;
}) {
  const { formatRaceDate } = useUserDateFormat();
  const { titleFontFamily } = useTypography();
  const lockAt = getSessionLockAt(race, selectedSession);
  const remaining =
    typeof lockAt === 'number' ? lockAt - now : Number.POSITIVE_INFINITY;
  const lockStatus = getLockStatusViewModel(remaining, now);
  const lockDisplay =
    typeof lockAt === 'number'
      ? formatRaceDate(new Date(lockAt).toISOString(), race.slug)
      : null;

  const countdownLabel = (() => {
    if (typeof lockAt !== 'number') {
      return null;
    }
    if (lockStatus.isLocked) {
      return `${SESSION_LABELS[selectedSession]} locked`;
    }
    if (lockStatus.urgency === 'closing_soon') {
      return `Closing soon: ${SESSION_LABELS[selectedSession]} locks in ${formatCountdown(remaining)}`;
    }
    return `${SESSION_LABELS[selectedSession]} locks in ${formatCountdown(remaining)}`;
  })();

  return (
    <View className="gap-1">
      <Text className="text-xs font-medium text-accent">
        Round {race.round} · {race.season}
      </Text>
      <View className="flex-row items-center gap-2.5">
        <FlagImage raceSlug={race.slug} />
        <Text
          className="text-foreground flex-1 text-[22px] leading-[28px] font-bold"
          numberOfLines={2}
          style={titleFontFamily ? { fontFamily: titleFontFamily } : undefined}
        >
          {race.name}
        </Text>
      </View>
      {countdownLabel ? (
        <View className="mt-0.5 gap-0.5">
          <Text
            className={`text-xs ${
              lockStatus.isLocked
                ? 'text-muted'
                : lockStatus.urgency === 'closing_soon'
                  ? 'font-bold text-warning'
                  : 'font-bold text-accent-hover'
            }`}
          >
            {countdownLabel}
          </Text>
          {lockDisplay ? (
            <Text className="text-muted text-xs">{lockDisplay.local}</Text>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

export function CascadeBanner({ hasSprint }: { hasSprint: boolean }) {
  return (
    <View className="flex-row items-start gap-2 py-0.5">
      <Ionicons color={colors.accent} name="flash" size={14} />
      <Text className="text-muted flex-1 text-xs leading-[17px]">
        First save covers{' '}
        {hasSprint
          ? 'Sprint Quali, Sprint, Quali, and Race'
          : 'Qualifying and Race'}
        . You can fine-tune any session before it starts.
      </Text>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Session tabs (underline, no borders)
// ─────────────────────────────────────────────────────────────────────────

type SessionLockEntry = {
  session: SessionType;
  lockAt: number | undefined | null;
  isLocked: boolean;
  hasResult: boolean;
};

export function SessionTabs({
  sessions,
  selected,
  lockState,
  predictionsBySession,
  onSelect,
}: {
  sessions: ReadonlyArray<SessionType>;
  selected: SessionType;
  lockState: ReadonlyArray<SessionLockEntry>;
  predictionsBySession: Record<SessionType, ReadonlyArray<string> | null>;
  onSelect: (session: SessionType) => void;
}) {
  return (
    <View
      accessibilityRole="tablist"
      className="flex-row gap-1 border-b border-border"
    >
      {sessions.map((session) => {
        const lock = lockState.find((s) => s.session === session);
        const active = session === selected;
        const isLocked = lock?.isLocked ?? false;
        const hasResult = lock?.hasResult ?? false;
        const hasPicks = predictionsBySession[session] !== null;
        return (
          <Pressable
            // The flag, lock and dot below carry the state; say it in words.
            accessibilityLabel={`${SESSION_LABELS[session]}, ${
              hasResult
                ? 'results published'
                : isLocked
                  ? 'locked'
                  : hasPicks
                    ? 'picks saved'
                    : 'no picks yet'
            }`}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            className="flex-1 items-center gap-1.5"
            key={session}
            onPress={() => onSelect(session)}
          >
            <View className="flex-row items-center gap-1.5 py-1">
              <Text
                className={`text-[13px] font-bold ${
                  active ? 'text-foreground' : 'text-muted'
                }`}
              >
                {SESSION_LABELS_SHORT[session]}
              </Text>
              {hasResult ? (
                <Ionicons color={colors.success} name="flag" size={10} />
              ) : isLocked ? (
                <Ionicons
                  color={colors.textMuted}
                  name="lock-closed"
                  size={10}
                />
              ) : (
                <View
                  className="h-1.5 w-1.5 rounded-full"
                  style={{
                    backgroundColor: hasPicks ? colors.success : colors.warning,
                  }}
                />
              )}
            </View>
            <View
              className={`h-0.5 w-[60%] ${
                active ? 'bg-accent' : 'bg-transparent'
              }`}
            />
          </Pressable>
        );
      })}
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Section eyebrow row (title + optional action)
// ─────────────────────────────────────────────────────────────────────────

export function SectionHeader({
  title,
  action,
}: {
  title: string;
  action?: React.ReactNode;
}) {
  return (
    <View className="flex-row items-center justify-between pb-0.5">
      <Text className="text-muted text-xs font-medium">{title}</Text>
      {action ?? null}
    </View>
  );
}

export function EditToggle({
  label = 'Edit',
  editing,
  onToggle,
}: {
  label?: string;
  editing: boolean;
  onToggle: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      className="flex-row items-center gap-1 active:opacity-70"
      hitSlop={8}
      onPress={onToggle}
    >
      <Ionicons
        color={colors.accent}
        name={editing ? 'close' : 'pencil'}
        size={12}
      />
      <Text className="text-xs font-bold text-accent">
        {editing ? 'Cancel' : label}
      </Text>
    </Pressable>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Top 5 section
// ─────────────────────────────────────────────────────────────────────────
