import type { LockStatusViewModel } from '@grandprixpicks/shared/picks';
import type { StyleProp, TextStyle } from 'react-native';

import { formatCountdown } from '../../lib/lockTime';
import { Numeral } from './Numeral';

type CountdownTextProps = {
  lockStatus: LockStatusViewModel;
  msRemaining: number;
  style?: StyleProp<TextStyle>;
};

/** Time left before a lock, toned to match the `LockBadge` beside it. */
export function CountdownText({
  lockStatus,
  msRemaining,
  style,
}: CountdownTextProps) {
  const tone = lockStatus.isLocked
    ? 'muted'
    : lockStatus.badgeTone === 'warning'
      ? 'warning'
      : 'gain';

  return (
    <Numeral style={style} tone={tone} variant="small">
      {formatCountdown(msRemaining)}
    </Numeral>
  );
}
