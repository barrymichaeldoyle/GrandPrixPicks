import type { LockStatusViewModel } from '@grandprixpicks/shared/picks';
import type { StyleProp, TextStyle } from 'react-native';

import { Numeral } from './Numeral';

type CountdownTextProps = {
  lockStatus: LockStatusViewModel;
  style?: StyleProp<TextStyle>;
};

export function CountdownText({ lockStatus, style }: CountdownTextProps) {
  const tone = lockStatus.isLocked
    ? 'muted'
    : lockStatus.badgeTone === 'warning'
      ? 'warning'
      : 'gain';

  return (
    <Numeral style={style} tone={tone} variant="small">
      {lockStatus.label}
    </Numeral>
  );
}
