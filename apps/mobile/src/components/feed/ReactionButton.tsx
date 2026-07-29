import type {
  ReactionCounts,
  ReactionType,
} from '@grandprixpicks/shared/reactions';
import {
  REACTION_BY_TYPE,
  REACTION_OPTIONS,
  emptyReactionCounts,
} from '@grandprixpicks/shared/reactions';
import { useMutation } from 'convex/react';
import * as Haptics from 'expo-haptics';
import { useEffect, useRef, useState } from 'react';

import { api, type ConvexId } from '../../integrations/convex/api';
import { captureAnalyticsEvent } from '../../lib/analytics';
import { useToast } from '../../providers/ToastProvider';
import { Modal, Pressable, Text, View } from '../../tw';

type ReactionButtonProps = {
  feedEventId: ConvexId<'feedEvents'>;
  reactionCount: number;
  reactionCounts: ReactionCounts;
  viewerReaction: ReactionType | null;
};

function updateCounts(
  counts: ReactionCounts,
  previous: ReactionType | null,
  next: ReactionType | null,
): ReactionCounts {
  const updated = { ...counts };
  if (previous) {
    updated[previous] = Math.max(0, updated[previous] - 1);
  }
  if (next) {
    updated[next] += 1;
  }
  return updated;
}

export function ReactionButton({
  feedEventId,
  reactionCount,
  reactionCounts,
  viewerReaction,
}: ReactionButtonProps) {
  const setReaction = useMutation(api.feed.setReaction);
  const removeReaction = useMutation(api.feed.removeReaction);
  const { showToast } = useToast();
  const longPressOpenedPicker = useRef(false);
  const [pickerVisible, setPickerVisible] = useState(false);
  const [optimisticReaction, setOptimisticReaction] = useState<
    ReactionType | null | undefined
  >(undefined);
  const [optimisticCount, setOptimisticCount] = useState<number | undefined>();
  const [optimisticCounts, setOptimisticCounts] = useState<
    ReactionCounts | undefined
  >();

  const selectedReaction =
    optimisticReaction === undefined ? viewerReaction : optimisticReaction;
  const count = optimisticCount ?? reactionCount;
  const counts = optimisticCounts ?? reactionCounts ?? emptyReactionCounts();

  useEffect(() => {
    if (
      optimisticReaction !== undefined &&
      viewerReaction === optimisticReaction &&
      reactionCount === optimisticCount
    ) {
      setOptimisticReaction(undefined);
      setOptimisticCount(undefined);
      setOptimisticCounts(undefined);
    }
  }, [optimisticCount, optimisticReaction, reactionCount, viewerReaction]);

  function haptic(style: Haptics.ImpactFeedbackStyle) {
    if (process.env.EXPO_OS === 'ios') {
      void Haptics.impactAsync(style);
    }
  }

  function resetOptimisticState() {
    setOptimisticReaction(undefined);
    setOptimisticCount(undefined);
    setOptimisticCounts(undefined);
  }

  async function chooseReaction(nextReaction: ReactionType) {
    const previousReaction = selectedReaction;
    setPickerVisible(false);
    setOptimisticReaction(nextReaction);
    setOptimisticCount(count + (previousReaction ? 0 : 1));
    setOptimisticCounts(updateCounts(counts, previousReaction, nextReaction));
    haptic(Haptics.ImpactFeedbackStyle.Medium);

    try {
      await setReaction({
        feedEventId,
        reactionType: nextReaction,
      });
      captureAnalyticsEvent(
        previousReaction
          ? 'feed_event_reaction_changed'
          : 'feed_event_reaction_added',
        {
          feed_event_id: String(feedEventId),
          reaction_type: nextReaction,
          previous_reaction_type: previousReaction,
        },
      );
    } catch (error) {
      resetOptimisticState();
      showToast(
        error instanceof Error ? error.message : 'Could not add reaction',
        'error',
      );
    }
  }

  async function removeSelectedReaction() {
    if (!selectedReaction) {
      setPickerVisible(true);
      return;
    }

    const previousReaction = selectedReaction;
    setOptimisticReaction(null);
    setOptimisticCount(Math.max(0, count - 1));
    setOptimisticCounts(updateCounts(counts, previousReaction, null));
    haptic(Haptics.ImpactFeedbackStyle.Light);

    try {
      await removeReaction({ feedEventId });
      captureAnalyticsEvent('feed_event_reaction_removed', {
        feed_event_id: String(feedEventId),
        reaction_type: previousReaction,
      });
    } catch (error) {
      resetOptimisticState();
      showToast(
        error instanceof Error ? error.message : 'Could not remove reaction',
        'error',
      );
    }
  }

  const selectedDefinition = selectedReaction
    ? REACTION_BY_TYPE[selectedReaction]
    : null;
  const topEmojis = REACTION_OPTIONS.filter(
    (reaction) => counts[reaction.type] > 0,
  )
    .sort((a, b) => counts[b.type] - counts[a.type])
    .slice(0, 3)
    .map((reaction) => reaction.emoji)
    .join('');

  return (
    <>
      <Pressable
        accessibilityHint={
          selectedReaction
            ? 'Tap to remove. Press and hold to change your reaction.'
            : 'Tap to choose a reaction.'
        }
        accessibilityLabel={
          selectedDefinition
            ? `${selectedDefinition.label} reaction, ${count} total reactions`
            : `React, ${count} total reactions`
        }
        accessibilityRole="button"
        className={`flex-row items-center gap-1.5 rounded-full border px-3 py-1.5 ${
          selectedReaction
            ? 'border-accent bg-accent-muted'
            : 'border-border active:bg-surface-elevated'
        }`}
        delayLongPress={300}
        onLongPress={() => {
          longPressOpenedPicker.current = true;
          setPickerVisible(true);
          haptic(Haptics.ImpactFeedbackStyle.Light);
        }}
        onPress={() => {
          if (longPressOpenedPicker.current) {
            longPressOpenedPicker.current = false;
            return;
          }
          if (selectedReaction) {
            void removeSelectedReaction();
          } else {
            setPickerVisible(true);
          }
        }}
      >
        <Text
          className={`text-xs font-semibold ${
            selectedReaction ? 'text-accent' : 'text-muted'
          }`}
        >
          {selectedDefinition
            ? `${selectedDefinition.emoji} ${selectedDefinition.label}`
            : 'React'}
        </Text>
        {count > 0 ? (
          <Text
            className={
              selectedReaction
                ? 'text-xs font-semibold text-accent'
                : 'text-muted text-xs font-semibold'
            }
            style={{ fontVariant: ['tabular-nums'] }}
          >
            {topEmojis ? `${topEmojis} ` : ''}
            {count}
          </Text>
        ) : null}
      </Pressable>

      <Modal
        animationType="fade"
        onRequestClose={() => setPickerVisible(false)}
        transparent
        visible={pickerVisible}
      >
        <Pressable
          accessibilityRole="button"
          className="flex-1 justify-end bg-black/45 p-4"
          onPress={() => setPickerVisible(false)}
        >
          <Pressable
            accessibilityRole="none"
            className="gap-3 rounded-2xl border border-border bg-surface-elevated p-4"
            onPress={(event) => event.stopPropagation()}
            style={{ borderCurve: 'continuous' }}
          >
            <View className="gap-0.5">
              <Text className="text-foreground text-base font-bold">
                React to this post
              </Text>
              <Text className="text-muted text-xs">
                Choose the vibe that fits.
              </Text>
            </View>
            <View className="flex-row justify-between gap-1">
              {REACTION_OPTIONS.map((reaction) => {
                const isSelected = reaction.type === selectedReaction;
                return (
                  <Pressable
                    accessibilityLabel={reaction.label}
                    accessibilityRole="button"
                    accessibilityState={{ selected: isSelected }}
                    className={`flex-1 items-center gap-1 rounded-xl border px-1 py-3 ${
                      isSelected
                        ? 'border-accent bg-accent-muted'
                        : 'border-border bg-surface'
                    }`}
                    key={reaction.type}
                    onPress={() => void chooseReaction(reaction.type)}
                    style={{ borderCurve: 'continuous' }}
                  >
                    <Text className="text-2xl">{reaction.emoji}</Text>
                    <Text
                      className={`text-center text-[10px] font-bold ${
                        isSelected ? 'text-accent' : 'text-muted'
                      }`}
                      numberOfLines={1}
                    >
                      {reaction.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}
