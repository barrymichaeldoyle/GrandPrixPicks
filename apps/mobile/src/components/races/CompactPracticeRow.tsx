import { practiceGapOrLap } from '@grandprixpicks/shared/practice';
import type { TextStyle } from 'react-native';

import { useTypography } from '../../theme/typography';
import { Text, View } from '../../tw';
import { DriverBadge } from '../ui/DriverBadge';

type PracticeEntry = {
  position: number;
  code: string;
  displayName: string;
  driverNumber?: number;
  team?: string | null;
  bestLapSeconds?: number;
  gapToLeaderSeconds?: number;
};

/**
 * One line of a practice classification, matching web's `CompactPracticeRow`.
 *
 * Three columns in the same proportions web uses: a fixed position gutter, the
 * driver chip sized to itself, and the one figure pushed to the right edge so a
 * column of gaps lines up and can be compared down the page. Position and
 * figure are both mono with tabular figures, for the same reason.
 *
 * The driver is a chip rather than a full name. Mobile used to print
 * `displayName` here, which reads fine on its own but does not match the
 * timing-sheet the rest of the product uses, and drops the team colour
 * entirely.
 */
export function CompactPracticeRow({
  entry,
  size = 'md',
  fill = 'sunken',
}: {
  entry: PracticeEntry;
  size?: 'sm' | 'md';
  fill?: 'elevated' | 'sunken';
}) {
  const { numeralFontFamily } = useTypography();
  const mono: TextStyle = {
    fontVariant: ['tabular-nums'],
    ...(numeralFontFamily ? { fontFamily: numeralFontFamily } : null),
  };

  return (
    <View className="flex-row items-center gap-2 py-1.5">
      <Text className="text-muted w-7 text-xs font-semibold" style={mono}>
        P{entry.position}
      </Text>
      <DriverBadge
        code={entry.code}
        displayName={entry.displayName}
        fill={fill}
        number={entry.driverNumber}
        size={size}
        team={entry.team}
      />
      <Text
        className="text-foreground flex-1 text-right text-xs font-semibold"
        numberOfLines={1}
        style={mono}
      >
        {practiceGapOrLap(entry)}
      </Text>
    </View>
  );
}
