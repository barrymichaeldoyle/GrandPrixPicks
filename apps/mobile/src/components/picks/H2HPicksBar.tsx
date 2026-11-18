import { teamCode } from '@grandprixpicks/shared/teamCode';
import {
  displayTeamName,
  getTeamColor,
  getTeamFill,
} from '../../lib/teamColors';
import { Pressable, Text, View } from '../../tw';
import type { DimensionValue } from 'react-native';

// `displayName` is what VoiceOver reads: a code like "LEC" is spoken as a word.
type H2HDriver = {
  _id: string;
  code: string;
  displayName?: string | null;
};

export type H2HBarMatchup = {
  _id: string;
  team: string;
  driver1: H2HDriver;
  driver2: H2HDriver;
};

export function H2HPicksBar({
  matchups,
  selections,
  activeIndex = -1,
  inferredMatchupIds,
  onSelectIndex,
}: {
  matchups: ReadonlyArray<H2HBarMatchup>;
  selections: Record<string, string | undefined>;
  /** Cell currently being asked about in the duel sequence, or -1. */
  activeIndex?: number;
  /** Calls filled in from the Top 5: quieter than a tapped call. Same as web. */
  inferredMatchupIds?: ReadonlySet<string>;
  onSelectIndex?: (index: number) => void;
}) {
  const interactive = onSelectIndex !== undefined;
  const columns = Math.min(matchups.length, 6);

  return (
    <View className="mt-2 flex-row flex-wrap gap-1">
      {matchups.map((matchup, index) => {
        const selectedId = selections[matchup._id];
        const picked = [matchup.driver1, matchup.driver2].find(
          (driver) => driver._id === selectedId,
        );
        const inferred = Boolean(
          picked && inferredMatchupIds?.has(matchup._id),
        );
        const label = `Battle ${index + 1} of ${matchups.length}, ${displayTeamName(
          matchup.team,
        )}. ${
          picked
            ? `${picked.displayName ?? picked.code} picked${inferred ? ' from your Top 5' : ''}`
            : 'Not called yet'
        }.`;
        const isActive = index === activeIndex;
        // A decided duel wears the team's colour, as a Top 5 pick does, and
        // that includes one decided by the Top 5 itself: left unfilled, the
        // picks a player made first read as the ones still to make. The cell
        // being edited keeps the accent edge. Same rule as web.
        const teamFill = picked && !isActive ? getTeamFill(matchup.team) : null;
        const className = `relative h-9 min-w-0 flex-row items-center justify-center overflow-hidden rounded-sm border pr-1 pl-2 ${
          isActive
            ? 'border-accent bg-surface-elevated'
            : picked
              ? ''
              : 'border-dashed border-border bg-page'
        }`;
        const fillStyle = teamFill
          ? { backgroundColor: teamFill.fill, borderColor: teamFill.fill }
          : null;
        const content = (
          <>
            {teamFill ? null : (
              <View
                className="absolute top-0 bottom-0 left-0 w-[3px]"
                style={{ backgroundColor: getTeamColor(matchup.team) }}
              />
            )}
            <Text
              className={`text-xs leading-none ${
                teamFill
                  ? 'font-semibold'
                  : picked
                    ? 'text-foreground'
                    : 'text-muted'
              }`}
              numberOfLines={1}
              style={teamFill ? { color: teamFill.ink } : undefined}
            >
              {picked ? picked.code : teamCode(matchup.team)}
            </Text>
          </>
        );
        const widthPercent = `${100 / columns - 1.2}%` as DimensionValue;

        if (!interactive) {
          return (
            <View
              accessibilityLabel={label}
              className={className}
              key={matchup._id}
              style={[{ width: widthPercent }, fillStyle]}
            >
              {content}
            </View>
          );
        }

        return (
          <Pressable
            accessibilityLabel={label}
            accessibilityRole="button"
            accessibilityState={{ selected: isActive }}
            className={className}
            key={matchup._id}
            onPress={() => onSelectIndex(index)}
            style={[{ width: widthPercent }, fillStyle]}
          >
            {content}
          </Pressable>
        );
      })}
    </View>
  );
}
