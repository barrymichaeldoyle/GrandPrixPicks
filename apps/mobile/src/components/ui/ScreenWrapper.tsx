import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors } from '../../theme/tokens';

type ScreenWrapperProps = {
  children: ReactNode;
  scroll?: boolean;
  padTop?: boolean;
};

export function ScreenWrapper({
  children,
  scroll = false,
  padTop = true,
}: ScreenWrapperProps) {
  const insets = useSafeAreaInsets();

  const style = [
    styles.base,
    { paddingBottom: insets.bottom + 16 },
    padTop ? styles.padTop : null,
  ];

  if (scroll) {
    return (
      <ScrollView
        contentContainerStyle={style}
        showsVerticalScrollIndicator={false}
        style={styles.scroll}
      >
        {children}
      </ScrollView>
    );
  }

  return <View style={style}>{children}</View>;
}

const styles = StyleSheet.create({
  base: {
    backgroundColor: colors.page,
    flex: 1,
    paddingHorizontal: 16,
  },
  padTop: {
    paddingTop: 8,
  },
  scroll: {
    backgroundColor: colors.page,
    flex: 1,
  },
});
