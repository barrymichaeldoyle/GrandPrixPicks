import { useState } from 'react';
import * as WebBrowser from 'expo-web-browser';
import { Ionicons } from '../ui/Ionicons';
import { newsRunWeekend } from '@grandprixpicks/shared/feedGroups';

import { getTeamColor } from '../../lib/teamColors';
import { colors } from '../../theme/tokens';
import { Pressable, Text, View } from '../../tw';
import { FlagImage } from '../ui/FlagImage';
import { SlantedStripe } from '../ui/SlantedStripe';
import { Numeral } from '../ui/Numeral';
import type { FeedEvent } from './types';
import { formatRelativeTime } from './helpers';
import { LineupChangeCard } from './lineup-change-card';
import { siteUrl } from '../../lib/siteUrl';

const GRID_COLLAPSED_ROWS = 10;

/**
 * How many stories of a run show before the rest fold away: the same six web's
 * `NewsGroup` and the write-up lead with. A live weekend collects fifteen or
 * more, and in this stream they sit above the scores a player opened the app
 * for.
 */
const LEAD_ITEMS = 6;

/**
 * One news story, however it arrived: a `race_news` feed event for a signed-in
 * player, or a `raceNews.list` item for a guest, who has no feed. The card
 * below draws either.
 */
export type NewsStory = {
  id: string;
  key?: string;
  headline: string;
  body?: string;
  /** When the story was published, for the relative time beside the headline. */
  publishedAt: number;
  sourceName?: string;
  sourceUrl?: string;
  team: string | null;
  startingGrid?: NonNullable<FeedEvent['newsStartingGrid']>;
  /** Set for weekend news; absent for season-wide stories. */
  raceName?: string;
};

function storyFromFeedEvent(event: FeedEvent): NewsStory {
  return {
    id: String(event._id),
    key: event.newsKey,
    headline: event.newsHeadline ?? '',
    body: event.newsBody,
    publishedAt: event.createdAt,
    sourceName: event.newsSourceName,
    sourceUrl: event.newsSourceUrl,
    team: event.newsTeam ?? event.newsDrivers?.[0]?.team ?? null,
    startingGrid: event.newsStartingGrid,
    raceName: event.raceName,
  };
}

function isPinned(story: NewsStory): boolean {
  return (story.startingGrid?.length ?? 0) > 0;
}

function newsMentionsGridPenalty(story: NewsStory): boolean {
  if ((story.key ?? '').includes('grid-penalty')) {
    return true;
  }
  if (/grid penalty/i.test(story.headline)) {
    return true;
  }
  return (story.startingGrid ?? []).some((entry) =>
    /penalty/i.test(entry.note ?? ''),
  );
}

/**
 * A pit lane start is not a grid slot: the driver lines up behind every car
 * that qualified, and `position` only exists on the row because the schema
 * numbers the field 1..N with no gaps. Matches web's `StartingGridTable`.
 */
function isPitLaneStart(note?: string): boolean {
  return /pit lane/i.test(note ?? '');
}

function openScoringPolicy() {
  void WebBrowser.openBrowserAsync(siteUrl('/results-policy#sessions-heading'));
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
      {shown.map((entry) => {
        const pitLane = isPitLaneStart(entry.note);
        return (
          <View
            className="flex-row items-center gap-2.5 border-b border-border py-1.5 last:border-b-0"
            key={entry.code}
          >
            <Numeral tone={pitLane ? 'warning' : 'muted'} variant="small">
              {pitLane ? 'PL' : `P${entry.position}`}
            </Numeral>
            <View className="relative h-6 min-w-9 shrink-0 items-center justify-center overflow-hidden rounded-sm border border-border bg-surface-elevated pr-1.5 pl-2">
              <View
                className="absolute top-0 bottom-0 left-0 w-[3px]"
                style={{ backgroundColor: getTeamColor(entry.team) }}
              />
              <Text className="text-foreground text-xs leading-none font-medium uppercase">
                {entry.code}
              </Text>
            </View>
            <Text
              className="text-foreground min-w-0 flex-1 text-sm"
              numberOfLines={1}
            >
              {entry.displayName}
            </Text>
            {entry.note ? (
              <Text
                className={`shrink-0 text-xs ${pitLane ? 'font-semibold text-warning' : 'text-muted'}`}
              >
                {entry.note}
              </Text>
            ) : null}
          </View>
        );
      })}
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

export function RaceNewsCard({
  story,
  grouped = false,
  reverse = false,
  foldable = false,
}: {
  story: NewsStory;
  grouped?: boolean;
  reverse?: boolean;
  /**
   * Whether the story folds to its headline until tapped, as web's
   * `RaceNewsItem` does one column wide. A full story is a third of a phone
   * screen, and a weekend's run of them sat between a player and the scored
   * session they came for. Never a grid card: the grid is the story.
   */
  foldable?: boolean;
}) {
  const teamColour = story.team ? getTeamColor(story.team) : colors.accent;
  const [open, setOpen] = useState(!foldable);
  const headline = (
    <Text className="text-foreground text-sm font-semibold">
      {story.headline}
      <Text className="text-muted text-xs font-normal">
        {`  · ${formatRelativeTime(story.publishedAt)}`}
      </Text>
    </Text>
  );

  return (
    <View className="overflow-hidden">
      <SlantedStripe color={teamColour} reverse={reverse} />
      <View className="min-w-0 flex-1 gap-2 py-2.5 pr-3 pl-4">
        {grouped ? null : (
          <Text className="text-xs font-medium text-accent">
            {story.raceName ? 'Weekend news' : 'News'}
          </Text>
        )}
        {foldable ? (
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ expanded: open }}
            className="flex-row items-start justify-between gap-3"
            hitSlop={{ bottom: 10, top: 10 }}
            onPress={() => setOpen((current) => !current)}
          >
            <View className="min-w-0 flex-1">{headline}</View>
            <Ionicons
              color={colors.textMuted}
              name={open ? 'chevron-up' : 'chevron-down'}
              size={16}
              style={{ marginTop: 1 }}
            />
          </Pressable>
        ) : (
          headline
        )}
        {open && story.body ? (
          <Text className="text-muted text-sm leading-5">{story.body}</Text>
        ) : null}
        {story.startingGrid && story.startingGrid.length > 0 ? (
          <StartingGrid entries={story.startingGrid} />
        ) : null}
        {open ? (
          <View className="flex-row items-center justify-between gap-3">
            <View className="min-w-0 flex-1 flex-row flex-wrap items-center gap-x-3 gap-y-1.5">
              {story.sourceUrl && story.sourceName ? (
                <Pressable
                  accessibilityRole="link"
                  className="flex-row items-center gap-1"
                  hitSlop={6}
                  onPress={() => {
                    void WebBrowser.openBrowserAsync(story.sourceUrl!);
                  }}
                >
                  <Text className="text-muted text-xs underline">
                    {story.sourceName}
                  </Text>
                  <Ionicons
                    color={colors.textMuted}
                    name="open-outline"
                    size={12}
                  />
                </Pressable>
              ) : null}
              {grouped || !newsMentionsGridPenalty(story) ? null : (
                <ScoringPolicyNote />
              )}
            </View>
          </View>
        ) : null}
      </View>
    </View>
  );
}

/**
 * Consecutive weekend-news cards as one block. The eyebrow, race name and
 * scoring note belong to the run and are said once; each card keeps the story
 * that actually differs. Grouping is by adjacency, not by race — see
 * `groupFeedEvents`.
 *
 * Edge to edge, same as web's `NewsGroup`: side borders and radius go, inner
 * padding stays.
 */
export function NewsGroupCard({ events }: { events: FeedEvent[] }) {
  if (events.length === 0) {
    return null;
  }
  const weekend = newsRunWeekend(events);
  return (
    <NewsRun
      entries={events.map((event) => ({
        id: String(event._id),
        story:
          event.type === 'lineup_change' ? null : storyFromFeedEvent(event),
        render: (foldable, reverse) =>
          event.type === 'lineup_change' ? (
            <LineupChangeCard event={event} grouped />
          ) : (
            <RaceNewsCard
              foldable={foldable}
              grouped
              reverse={reverse}
              story={storyFromFeedEvent(event)}
            />
          ),
      }))}
      raceName={weekend?.raceName}
      raceSlug={weekend?.raceSlug}
    />
  );
}

/**
 * A run of stories as one block: header, the first six, the rest behind a
 * fold, and the scoring note once if any of them is a grid penalty. The feed
 * hands it events; the guest home hands it `raceNews.list` items.
 */
export type NewsRunEntry = {
  id: string;
  /** Null for a lineup change, which has no story shape of its own. */
  story: NewsStory | null;
  render: (foldable: boolean, reverse: boolean) => React.ReactNode;
};

export function NewsRun({
  entries,
  raceName,
  raceSlug,
}: {
  entries: NewsRunEntry[];
  raceName?: string;
  raceSlug?: string;
}) {
  const [showEarlier, setShowEarlier] = useState(false);
  if (entries.length === 0) {
    return null;
  }
  function pinned(entry: NewsRunEntry) {
    return entry.story !== null && isPinned(entry.story);
  }
  // A grid stays open and out of the fold: it is a table, not a story with a
  // headline to stand in for it.
  const lead = entries.filter(
    (entry, index) => index < LEAD_ITEMS || pinned(entry),
  );
  const earlier = entries.filter((entry) => !lead.includes(entry));

  function cards(items: NewsRunEntry[], offset: number) {
    return items.map((entry, index) => (
      <View key={entry.id}>
        {entry.render(
          entries.length > 1 && !pinned(entry),
          (index + offset) % 2 === 0,
        )}
      </View>
    ));
  }
  const hasGridPenalty = entries.some(
    (entry) => entry.story !== null && newsMentionsGridPenalty(entry.story),
  );

  return (
    <View
      accessibilityLabel={raceName ? `Weekend news, ${raceName}` : 'News'}
      className="overflow-hidden border-y border-border bg-surface"
    >
      <View className="flex-row flex-wrap items-center justify-between gap-x-3 gap-y-1 border-b border-border px-3 py-2">
        <Text className="text-xs font-medium text-accent">
          {raceName ? 'Weekend news' : 'News'}
        </Text>
        {raceName ? (
          <View className="flex-row items-center gap-1.5">
            {raceSlug ? <FlagImage raceSlug={raceSlug} /> : null}
            <Text className="text-muted text-xs">{raceName}</Text>
          </View>
        ) : null}
      </View>
      {cards(lead, 0)}
      {earlier.length > 0 ? (
        <View className="border-t border-border">
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ expanded: showEarlier }}
            className="flex-row items-center justify-between gap-2 px-3 py-3 active:bg-surface-elevated"
            onPress={() => setShowEarlier((current) => !current)}
          >
            <Text className="text-muted text-sm font-medium">
              {`${earlier.length} earlier ${earlier.length === 1 ? 'story' : 'stories'}`}
            </Text>
            <Ionicons
              color={colors.textMuted}
              name={showEarlier ? 'chevron-up' : 'chevron-down'}
              size={16}
            />
          </Pressable>
          {showEarlier ? cards(earlier, lead.length) : null}
        </View>
      ) : null}
      {hasGridPenalty ? (
        <View className="border-t border-border px-3 py-2">
          <ScoringPolicyNote />
        </View>
      ) : null}
    </View>
  );
}
