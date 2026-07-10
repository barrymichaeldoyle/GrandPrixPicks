import type { ReactNode } from 'react';

import { useTypography } from '../../theme/typography';
import { Text, View } from '../../tw';

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
    <View className={`gap-1 ${compact ? 'pb-2' : 'pb-3'}`}>
      <View className="flex-row items-end justify-between gap-3">
        <Text
          numberOfLines={2}
          className={`text-foreground flex-1 font-bold ${
            compact ? 'text-2xl leading-7' : 'text-[32px] leading-[38px]'
          }`}
          style={titleFontFamily ? { fontFamily: titleFontFamily } : undefined}
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
