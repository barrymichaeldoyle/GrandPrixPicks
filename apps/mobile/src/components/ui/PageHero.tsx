import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { colors } from '../../theme/tokens';
import { useTypography } from '../../theme/typography';

type PageHeroProps = {
  title: string;
  subtitle?: string;
  /** Optional element rendered to the right of the title (e.g. action button). */
  action?: ReactNode;
  /** When true, shifts to a smaller subscreen-style title. */
  compact?: boolean;
};

export function PageHero({ title, subtitle, action, compact }: PageHeroProps) {
  const { titleFontFamily } = useTypography();

  return (
    <View style={[styles.container, compact ? styles.containerCompact : null]}>
      <View style={styles.row}>
        <Text
          numberOfLines={2}
          style={[
            compact ? styles.titleCompact : styles.title,
            titleFontFamily ? { fontFamily: titleFontFamily } : null,
          ]}
        >
          {title}
        </Text>
        {action ? <View style={styles.action}>{action}</View> : null}
      </View>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  action: {
    alignSelf: 'center',
  },
  container: {
    gap: 4,
    paddingBottom: 12,
  },
  containerCompact: {
    paddingBottom: 8,
  },
  row: {
    alignItems: 'flex-end',
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-between',
  },
  subtitle: {
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 18,
  },
  title: {
    color: colors.text,
    flex: 1,
    fontSize: 32,
    fontWeight: '700',
    letterSpacing: 0.4,
    lineHeight: 38,
  },
  titleCompact: {
    color: colors.text,
    flex: 1,
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: 0.3,
    lineHeight: 28,
  },
});
