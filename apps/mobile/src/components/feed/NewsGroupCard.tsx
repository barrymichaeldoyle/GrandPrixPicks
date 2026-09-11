import { useState } from 'react';
import * as WebBrowser from 'expo-web-browser';
import { Ionicons } from '@expo/vector-icons';

import { getTeamColor } from '../../lib/teamColors';
import { colors } from '../../theme/tokens';
import { Pressable, Text, View } from '../../tw';
import { FlagImage } from '../ui/FlagImage';
import { SlantedStripe } from '../ui/SlantedStripe';
import { Numeral } from '../ui/Numeral';
import type { FeedEvent } from './types';
import { formatRelativeTime } from './helpers';
import { ReactionButton } from './ReactionButton';

const SITE_URL = 'https://grandprixpicks.com';
const GRID_COLLAPSED_ROWS = 10;

function openScoringPolicy() {
  void WebBrowser.openBrowserAsync(
    `${SITE_URL}/results-policy#sessions-heading`,
  );
}

function ScoringPolicyNote() {
  return (
    <View className="flex-row flex-wrap items-baseline gap-x-1">
      <Text className="text-muted text-xs">
        Grid penalties don’t change qualifying results.
      </Text>
      <Pressable
        accessibilityRole="link"
        hitSlop={6}
        onPress={openScoringPolicy}
      >
        <Text className="text-muted text-xs font-semibold underline">
          How scoring works
        </Text>
      </Pressable>
    </View>
  );
}

function StartingGrid({
  entries,
}: {
  entries: NonNullable<FeedEvent['newsStartingGrid']>;
}) {
  const [expanded, setExpanded] = useState(false);
  const collapsible = entries.length > GRID_COLLAPSED_ROWS;
  const shown =
    collapsible && !expanded ? entries.slice(0, GRID_COLLAPSED_ROWS) : entries;

  return (
    <View className="mt-1">
      {shown.map((entry) => (
        <View
          className="flex-row items-center gap-2.5 border-b border-border py-1.5 last:border-b-0"
          key={entry.code}
        >
          <Numeral tone="muted" variant="small">
            {`P${entry.position}`}
          </Numeral>
          <View
            className="h-4 w-[3px] shrink-0"
            style={{ backgroundColor: getTeamColor(entry.team) }}
          />
          <Text
            className="text-foreground min-w-0 flex-1 text-sm"
            numberOfLines={1}
          >
            {entry.displayName}
          </Text>
          {entry.note ? (
            <Text className="text-muted shrink-0 text-xs">{entry.note}</Text>
          ) : null}
        </View>
      ))}
      {collapsible ? (
        <Pressable
          accessibilityRole="button"
          className="mt-2 self-start"
          onPress={() => setExpanded((open) => !open)}
        >
          <Text className="text-xs font-semibold text-accent">
            {expanded
              ? 'Show the top of the grid'
              : `Show all ${entries.length} places`}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

function RaceNewsCard({
  event,
  grouped = false,
  reverse = false,
}: {
  event: FeedEvent;
  grouped?: boolean;
  reverse?: boolean;
}) {
  const team = event.newsDrivers?.[0]?.team ?? null;
  const teamColour = team ? getTeamColor(team) : colors.accent;

  return (
    <View className="overflow-hidden">
      <SlantedStripe color={teamColour} reverse={reverse} />
      <View className="min-w-0 flex-1 gap-2 py-2.5 pr-3 pl-4">
        {grouped ? null : (
          <Text className="text-[10px] font-semibold tracking-wide text-accent uppercase">
            Weekend news
          </Text>
        )}
        <Text className="text-foreground text-sm font-semibold">
          {event.newsHeadline}
          <Text className="text-muted text-xs font-normal">
            {`  · ${formatRelativeTime(event.createdAt)}`}
          </Text>
        </Text>
        {event.newsBody ? (
          <Text className="text-muted text-sm leading-5">{event.newsBody}</Text>
        ) : null}
        {event.newsStartingGrid && event.newsStartingGrid.length > 0 ? (
          <StartingGrid entries={event.newsStartingGrid} />
        ) : null}
        <View className="flex-row items-center justify-between gap-3">
          <View className="min-w-0 flex-1 flex-row flex-wrap items-center gap-x-3 gap-y-1.5">
            {event.newsSourceUrl && event.newsSourceName ? (
              <Pressable
                accessibilityRole="link"
                className="flex-row items-center gap-1"
                hitSlop={6}
                onPress={() => {
                  void WebBrowser.openBrowserAsync(event.newsSourceUrl!);
                }}
              >
                <Text className="text-muted text-xs underline">
                  {event.newsSourceName}
                </Text>
                <Ionicons
                  color={colors.textMuted}
                  name="open-outline"
                  size={12}
                />
              </Pressable>
            ) : null}
            {grouped ? null : <ScoringPolicyNote />}
          </View>
          <ReactionButton
            context="news"
            feedEventId={event._id}
            reactionCount={event.reactionCount}
            reactionCounts={event.reactionCounts}
            viewerReaction={event.viewerReaction}
          />
        </View>
      </View>
    </View>
  );
}

/**
 * Consecutive weekend-news cards as one block. The eyebrow, race name and
 * scoring note belong to the run and are said once; each card keeps the story
 * that actually differs. Grouping is by adjacency, not by race — see
 * `groupFeedEvents`.
 */
export function NewsGroupCard({ events }: { events: FeedEvent[] }) {
  if (events.length === 0) {
    return null;
  }
  const raceName = events.find((event) => event.raceName)?.raceName;
  const raceSlug = events.find((event) => event.raceSlug)?.raceSlug;

  return (
    <View
      accessibilityLabel={
        raceName ? `Weekend news, ${raceName}` : 'Weekend news'
      }
      className="overflow-hidden rounded-xl border border-border bg-surface"
    >
      <View className="flex-row flex-wrap items-center justify-between gap-x-3 gap-y-1 border-b border-border px-3 py-2">
        <Text className="text-[10px] font-semibold tracking-wide text-accent uppercase">
          Weekend news
        </Text>
        {raceName ? (
          <View className="flex-row items-center gap-1.5">
            {raceSlug ? <FlagImage raceSlug={raceSlug} /> : null}
            <Text className="text-muted text-[11px]">{raceName}</Text>
          </View>
        ) : null}
      </View>
      {events.map((event, index) => (
        <View
          className={index === 0 ? undefined : 'border-t border-border'}
          key={event._id}
        >
          <RaceNewsCard event={event} grouped reverse={index % 2 === 0} />
        </View>
      ))}
      <View className="border-t border-border px-3 py-2">
        <ScoringPolicyNote />
      </View>
    </View>
  );
}
