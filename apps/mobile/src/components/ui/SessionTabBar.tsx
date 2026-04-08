import type { SessionType } from '@grandprixpicks/shared/sessions';
import { SESSION_LABELS_SHORT } from '@grandprixpicks/shared/sessions';
import { ScrollView, StyleSheet } from 'react-native';

import { Chip } from './Chip';

type SessionTabBarProps = {
  sessions: readonly SessionType[];
  selected: SessionType;
  onSelect: (session: SessionType) => void;
  disabled?: boolean;
};

export function SessionTabBar({
  sessions,
  selected,
  onSelect,
  disabled = false,
}: SessionTabBarProps) {
  return (
    <ScrollView
      contentContainerStyle={styles.content}
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.container}
    >
      {sessions.map((session) => (
        <Chip
          key={session}
          active={session === selected}
          disabled={disabled}
          label={SESSION_LABELS_SHORT[session]}
          onPress={() => onSelect(session)}
        />
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 0,
  },
  content: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 4,
  },
});
