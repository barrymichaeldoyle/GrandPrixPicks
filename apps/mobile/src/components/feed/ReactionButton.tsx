import type {
  ReactionContext,
  ReactionCounts,
  ReactionType,
} from '@grandprixpicks/shared/reactions';
import {
  emptyReactionCounts,
  reactionOptionFor,
  reactionOptionsFor,
} from '@grandprixpicks/shared/reactions';
import { useMutation } from 'convex/react';
import * as Haptics from 'expo-haptics';
import { useRef, useState } from 'react';

import { api, type ConvexId } from '../../integrations/convex/api';
import { captureAnalyticsEvent } from '../../lib/analytics';
import { useToast } from '../../providers/ToastProvider';
import { Modal, Pressable, Text, View } from '../../tw';

type ReactionButtonProps = {
  feedEventId: ConvexId<'feedEvents'>;
  reactionCount: number;
  reactionCounts: ReactionCounts;
  viewerReaction: ReactionType | null;
  context?: ReactionContext;
  /** Split control matching web's feed leaderboard (React | count). */
  variant?: 'pill' | 'split';
  onCountPress?: () => void;
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
  context = 'pick',
  variant = 'pill',
  onCountPress,
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

  const optimisticUpdateSettled =
    optimisticReaction !== undefined &&
    viewerReaction === optimisticReaction &&
    reactionCount === optimisticCount;
  const selectedReaction =
    optimisticReaction === undefined || optimisticUpdateSettled
      ? viewerReaction
      : optimisticReaction;
  const count =
    optimisticCount === undefined || optimisticUpdateSettled
      ? reactionCount
      : optimisticCount;
  const counts =
    optimisticCounts === undefined || optimisticUpdateSettled
      ? (reactionCounts ?? emptyReactionCounts())
      : optimisticCounts;

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

  const options = reactionOptionsFor(context);
  const selectedDefinition = selectedReaction
    ? reactionOptionFor(context, selectedReaction)
    : null;
  const topEmojis = options
    .filter((reaction) => counts[reaction.type] > 0)
    .sort((a, b) => counts[b.type] - counts[a.type])
    .slice(0, 3)
    .map((reaction) => reaction.emoji)
    .join('');

  const triggerHint = selectedReaction
    ? 'Tap to remove. Press and hold to change your reaction.'
    : 'Tap to choose a reaction.';
  const triggerLabel = selectedDefinition
    ? `${selectedDefinition.label} reaction, ${count} total reactions`
    : `React, ${count} total reactions`;

  function onTriggerLongPress() {
    longPressOpenedPicker.current = true;
    setPickerVisible(true);
    haptic(Haptics.ImpactFeedbackStyle.Light);
  }

  function onTriggerPress() {
    if (longPressOpenedPicker.current) {
      longPressOpenedPicker.current = false;
      return;
    }
    if (selectedReaction) {
      void removeSelectedReaction();
    } else {
      setPickerVisible(true);
    }
  }

  const trigger = (
    <>
      <Text
        className={`text-xs font-semibold ${
          selectedReaction ? 'text-accent' : 'text-muted'
        }`}
      >
        {selectedDefinition
          ? `${selectedDefinition.emoji} ${selectedDefinition.label}`
          : 'React'}
      </Text>
      {variant === 'pill' && count > 0 ? (
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
    </>
  );

  return (
    <>
      {variant === 'split' ? (
        <View
          className={`h-8 flex-row items-center overflow-hidden rounded-sm border ${
            selectedReaction
              ? 'border-accent/40 bg-accent/10'
              : 'border-border/70'
          }`}
        >
          <Pressable
            accessibilityHint={triggerHint}
            accessibilityLabel={triggerLabel}
            accessibilityRole="button"
            className="h-full flex-row items-center gap-1 px-2.5"
            delayLongPress={300}
            onLongPress={onTriggerLongPress}
            onPress={onTriggerPress}
          >
            {trigger}
          </Pressable>
          <View
            className={`h-4 w-px shrink-0 ${
              selectedReaction ? 'bg-accent/30' : 'bg-border/70'
            }`}
          />
          <Pressable
            accessibilityLabel={`${count} reactions`}
            accessibilityRole="button"
            className="h-full shrink-0 flex-row items-center justify-center gap-0.5 px-2"
            disabled={!onCountPress || count === 0}
            onPress={onCountPress}
          >
            <Text
              className={`text-xs font-semibold ${
                selectedReaction
                  ? 'text-accent'
                  : count > 0
                    ? 'text-muted'
                    : 'text-muted/35'
              }`}
              style={{ fontVariant: ['tabular-nums'] }}
            >
              {topEmojis && count > 0 ? `${topEmojis} ` : ''}
              {count}
            </Text>
          </Pressable>
        </View>
      ) : (
        <Pressable
          accessibilityHint={triggerHint}
          accessibilityLabel={triggerLabel}
          accessibilityRole="button"
          className={`flex-row items-center gap-1.5 rounded-full border px-3 py-1.5 ${
            selectedReaction
              ? 'border-accent bg-accent-muted'
              : 'border-border active:bg-surface-elevated'
          }`}
          delayLongPress={300}
          onLongPress={onTriggerLongPress}
          onPress={onTriggerPress}
        >
          {trigger}
        </Pressable>
      )}

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
              {options.map((reaction) => {
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
