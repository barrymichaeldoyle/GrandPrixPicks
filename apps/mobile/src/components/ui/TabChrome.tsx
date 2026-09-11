import type { ComponentProps, ReactNode } from 'react';
import Animated from 'react-native-reanimated';

import { TAB_CHROME_HEIGHT } from '../../lib/hideOnScroll';
import { useTypography } from '../../theme/typography';
import { Text, View } from '../../tw';
import { BrandMark } from './BrandMark';

type TabChromeProps = {
  /** Right-side action (e.g. Mark all read). Hides with the chrome. */
  action?: ReactNode;
} & ({ brand: true; title?: never } | { brand?: false; title: string });

/**
 * Compact identity bar for a tab root. Home uses the brand mark and wordmark;
 * the other tabs use the screen name — the tab bar already says which app
 * this is, and repeating Grand Prix Picks on Leaderboard stacked three labels
 * on the same fact.
 *
 * Always 44pt. Hide-on-scroll is the parent `CollapsingChrome` clipping this
 * via a negative margin, so the inner layout never squashes.
 */
export function TabChrome({ brand, title, action }: TabChromeProps) {
  const { titleFontFamily } = useTypography();

  return (
    <View
      accessibilityRole="header"
      className="flex-row items-center justify-between gap-3 border-b border-border bg-page px-4"
      style={{ height: TAB_CHROME_HEIGHT }}
    >
      {brand ? (
        <View
          accessibilityLabel="Grand Prix Picks"
          accessible
          className="min-w-0 flex-1 flex-row items-center gap-1.5"
        >
          <BrandMark size={20} />
          <Text
            className="text-foreground text-lg font-semibold tracking-[0.06em] uppercase"
            numberOfLines={1}
            style={
              titleFontFamily ? { fontFamily: titleFontFamily } : undefined
            }
          >
            Grand Prix Picks
          </Text>
        </View>
      ) : (
        <Text
          className="text-foreground min-w-0 flex-1 text-[17px] font-semibold"
          numberOfLines={1}
          style={titleFontFamily ? { fontFamily: titleFontFamily } : undefined}
        >
          {title}
        </Text>
      )}
      {action ? <View className="shrink-0">{action}</View> : null}
    </View>
  );
}

/**
 * Tab-root shell: the chrome is a sibling of the scroll view so hiding it
 * reclaims the space. Overflow clips the bar as it slides into the status
 * area; the SafeAreaView around the tab still keeps content below the notch.
 */
export function CollapsingChrome({
  children,
  headerStyle,
  chrome,
}: {
  children: ReactNode;
  headerStyle: ComponentProps<typeof Animated.View>['style'];
  chrome: ReactNode;
}) {
  return (
    <View className="flex-1 bg-page" style={{ overflow: 'hidden' }}>
      <Animated.View style={headerStyle}>{chrome}</Animated.View>
      {children}
    </View>
  );
}
