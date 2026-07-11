import type { ReactNode } from 'react';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

import { colors } from '../../theme/tokens';
import { useTypography } from '../../theme/typography';
import { Text, View } from '../../tw';

type PageHeroProps = {
  title: string;
  subtitle?: string;
  /** Small uppercase chip above the title (web's hero eyebrow pill). */
  eyebrow?: string;
  /** Optional element rendered to the right of the title (e.g. action button). */
  action?: ReactNode;
  /** When true, shifts to a smaller flat subscreen-style title (no panel). */
  compact?: boolean;
};

/**
 * The web page hero: a bordered panel with a soft teal glow, an eyebrow
 * pill, and an Orbitron display title. `compact` keeps the flat title
 * for subscreens.
 */
export function PageHero({
  title,
  subtitle,
  eyebrow,
  action,
  compact,
}: PageHeroProps) {
  const { titleFontFamily } = useTypography();

  if (compact) {
    return (
      <View className="gap-1 pb-2">
        <View className="flex-row items-end justify-between gap-3">
          <Text
            numberOfLines={2}
            className="text-foreground flex-1 text-2xl leading-7 font-bold"
            style={
              titleFontFamily ? { fontFamily: titleFontFamily } : undefined
            }
          >
            {title}
          </Text>
          {action ? <View className="self-center">{action}</View> : null}
        </View>
        {subtitle ? (
          <Text className="text-muted text-[13px] leading-[18px]">
            {subtitle}
          </Text>
        ) : null}
      </View>
    );
  }

  return (
    <View className="overflow-hidden rounded-2xl border border-border bg-surface">
      <View className="absolute inset-0">
        <Svg
          height="100%"
          preserveAspectRatio="none"
          viewBox="0 0 100 100"
          width="100%"
        >
          <Defs>
            <LinearGradient id="hero-glow" x1="0" x2="1" y1="0" y2="1">
              <Stop offset="0%" stopColor={colors.accent} stopOpacity="0.16" />
              <Stop offset="55%" stopColor={colors.accent} stopOpacity="0.04" />
              <Stop offset="100%" stopColor={colors.accent} stopOpacity="0" />
            </LinearGradient>
          </Defs>
          <Rect fill="url(#hero-glow)" height="100" width="100" x="0" y="0" />
        </Svg>
      </View>
      <View className="gap-1.5 p-4">
        {eyebrow ? (
          <View className="self-start rounded-full bg-surface-muted/80 px-3 py-1">
            <Text className="text-muted text-[10px] font-extrabold uppercase">
              {eyebrow}
            </Text>
          </View>
        ) : null}
        <View className="flex-row items-end justify-between gap-3">
          <Text
            numberOfLines={2}
            className="text-foreground flex-1 text-[30px] leading-9 font-bold"
            style={
              titleFontFamily ? { fontFamily: titleFontFamily } : undefined
            }
          >
            {title}
          </Text>
          {action ? <View className="self-center">{action}</View> : null}
        </View>
        {subtitle ? (
          <Text className="text-muted text-[13px] leading-[18px]">
            {subtitle}
          </Text>
        ) : null}
      </View>
    </View>
  );
}
