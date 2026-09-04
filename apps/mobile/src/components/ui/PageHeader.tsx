import type { ReactNode } from 'react';

import { useTypography } from '../../theme/typography';
import { Text, View } from '../../tw';

type PageHeaderProps = {
  title: string;
  subtitle?: string;
  /** Optional element rendered to the right of the title (e.g. action button). */
  action?: ReactNode;
};

/**
 * The header for every top-level screen: flat on the screen background, with
 * an Archivo display title and optional supporting copy. Mirrors web's
 * `PageHeader`.
 *
 * This replaced the old bordered `PageHero` panel and its teal glow. Keep it
 * flat — screens are rows and sections on the background, not cards stacked
 * on cards.
 *
 * No eyebrow slot, for the same reason web dropped one: the caps category word
 * above the title only ever repeated the title.
 */
export function PageHeader({
  title,
  subtitle,
  action,
}: PageHeaderProps) {
  const { titleFontFamily } = useTypography();

  return (
    <View className="gap-1.5 pb-3">
      <View className="flex-row items-end justify-between gap-3">
        <Text
          numberOfLines={2}
          className="text-foreground flex-1 text-[28px] leading-9 font-bold"
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
