import type {
  ReactionCounts,
  ReactionType,
} from '@grandprixpicks/shared/reactions';
import {
  REACTION_BY_TYPE,
  reactionOptionsFor,
  type ReactionContext,
  emptyReactionCounts,
} from '@grandprixpicks/shared/reactions';
import { api } from '@convex-generated/api';
import type { Id } from '@convex-generated/dataModel';
import { useMutation } from 'convex/react';
import { useLayoutEffect, useRef, useState } from 'react';

import { Tooltip } from '@/components/Tooltip';
import { captureAnalyticsEvent } from '@/lib/analytics';

interface ReactionButtonProps {
  /** Which wording to offer. See `reactionOptionsFor`. */
  context?: ReactionContext;
  feedEventId: Id<'feedEvents'>;
  reactionCount: number;
  reactionCounts: ReactionCounts;
  viewerReaction: ReactionType | null;
  onCountClick?: () => void;
}

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
  onCountClick,
  context = 'pick',
}: ReactionButtonProps) {
  // "Great pick" is right on a score and wrong under a news story, so the
  // wording follows the surface. The stored type is untouched.
  const options = reactionOptionsFor(context);
  const setReaction = useMutation(api.feed.setReaction);
  const removeReaction = useMutation(api.feed.removeReaction);
  const [pickerOpen, setPickerOpen] = useState(false);
  const pickerRef = useRef<HTMLDivElement | null>(null);
  // Anchoring alone cannot guarantee the options are reachable: whichever edge
  // the panel grows from, a trigger near the opposite edge pushes it off a
  // phone screen. So we measure the panel once it is up and slide it back in.
  const [pickerShift, setPickerShift] = useState(0);
  const pickerShiftRef = useRef(0);
  const [optimisticReaction, setOptimisticReaction] = useState<
    ReactionType | null | undefined
  >(undefined);
  const [optimisticCount, setOptimisticCount] = useState<number | undefined>();
  const [optimisticCounts, setOptimisticCounts] = useState<
    ReactionCounts | undefined
  >();

  useLayoutEffect(() => {
    if (!pickerOpen) {
      return;
    }

    function keepPickerOnScreen() {
      const panel = pickerRef.current;
      if (!panel) {
        return;
      }

      const margin = 8;
      const rect = panel.getBoundingClientRect();
      // Undo the shift already applied so we always reason about where the
      // popover would sit unaided.
      const left = rect.left - pickerShiftRef.current;
      const right = rect.right - pickerShiftRef.current;

      let shift = 0;
      if (right > window.innerWidth - margin) {
        shift = window.innerWidth - margin - right;
      }
      if (left + shift < margin) {
        shift = margin - left;
      }

      pickerShiftRef.current = shift;
      setPickerShift(shift);
    }

    // Runs before paint, so a shift left over from the previous open is
    // corrected (it is subtracted out above) before anyone sees it.
    keepPickerOnScreen();
    window.addEventListener('resize', keepPickerOnScreen);
    return () => window.removeEventListener('resize', keepPickerOnScreen);
  }, [pickerOpen]);

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

  function resetOptimisticState() {
    setOptimisticReaction(undefined);
    setOptimisticCount(undefined);
    setOptimisticCounts(undefined);
  }

  async function chooseReaction(nextReaction: ReactionType) {
    const previousReaction = selectedReaction;
    setPickerOpen(false);
    setOptimisticReaction(nextReaction);
    setOptimisticCount(count + (previousReaction ? 0 : 1));
    setOptimisticCounts(updateCounts(counts, previousReaction, nextReaction));

    try {
      await setReaction({ feedEventId, reactionType: nextReaction });
      captureAnalyticsEvent(
        previousReaction
          ? 'feed_event_reaction_changed'
          : 'feed_event_reaction_added',
        {
          feed_event_id: feedEventId,
          reaction_type: nextReaction,
          previous_reaction_type: previousReaction,
        },
      );
    } catch {
      resetOptimisticState();
    }
  }

  async function handleMainClick() {
    if (!selectedReaction) {
      setPickerOpen((open) => !open);
      return;
    }

    const previousReaction = selectedReaction;
    setPickerOpen(false);
    setOptimisticReaction(null);
    setOptimisticCount(Math.max(0, count - 1));
    setOptimisticCounts(updateCounts(counts, previousReaction, null));
    try {
      await removeReaction({ feedEventId });
      captureAnalyticsEvent('feed_event_reaction_removed', {
        feed_event_id: feedEventId,
        reaction_type: previousReaction,
      });
    } catch {
      resetOptimisticState();
    }
  }

  const selectedDefinition = selectedReaction
    ? REACTION_BY_TYPE[selectedReaction]
    : null;
  const topReactions = options
    .filter((reaction) => counts[reaction.type] > 0)
    .sort((a, b) => counts[b.type] - counts[a.type])
    .slice(0, 3);

  return (
    <div
      className="relative inline-flex"
      onMouseLeave={() => setPickerOpen(false)}
    >
      {pickerOpen && (
        // pb-2 keeps a visual gap above the trigger while remaining inside the
        // hover target — margin would create a dead zone that fires mouseleave.
        // Anchored right because the trigger sits at the right edge of a feed
        // row: growing leftwards keeps the options on a phone screen, and the
        // measured shift below covers any surface that places it elsewhere.
        <div
          ref={pickerRef}
          className="absolute right-0 bottom-full z-30 w-max max-w-[calc(100vw-1rem)] pb-2"
          style={{ transform: `translateX(${pickerShift}px)` }}
        >
          <div
            className="flex flex-wrap items-center gap-1 rounded-sm border border-border-strong bg-surface-elevated p-1.5"
            role="menu"
            aria-label="Choose a reaction"
          >
            {options.map((reaction) => {
              const selected = selectedReaction === reaction.type;
              return (
                <Tooltip key={reaction.type} content={reaction.label}>
                  <button
                    type="button"
                    role="menuitemradio"
                    aria-checked={selected}
                    onClick={() => void chooseReaction(reaction.type)}
                    className={`group/reaction flex h-10 w-10 items-center justify-center rounded-sm text-xl transition-colors duration-150 ease-out hover:bg-surface-hover ${
                      selected
                        ? 'bg-accent/15 ring-1 ring-accent/50'
                        : 'hover:bg-page'
                    }`}
                  >
                    <span aria-hidden="true">{reaction.emoji}</span>
                    <span className="sr-only">{reaction.label}</span>
                  </button>
                </Tooltip>
              );
            })}
          </div>
        </div>
      )}

      <div
        className={`inline-flex h-8 items-center rounded-sm border transition-colors ${
          selectedReaction
            ? 'border-accent/40 bg-accent/10'
            : 'border-border/70 bg-surface-muted/30 hover:border-border'
        }`}
      >
        <button
          type="button"
          onClick={() => void handleMainClick()}
          onMouseEnter={() => {
            if (selectedReaction) {
              setPickerOpen(true);
            }
          }}
          title={
            selectedDefinition
              ? `Remove ${selectedDefinition.label} reaction`
              : 'React to this post'
          }
          className={`inline-flex h-full items-center justify-center gap-1 rounded-l-sm px-2.5 text-xs font-semibold transition-colors ${
            selectedReaction
              ? 'text-accent hover:bg-accent/10'
              : 'text-text-muted hover:bg-surface-muted hover:text-text'
          }`}
        >
          {selectedDefinition ? (
            <>
              <span aria-hidden="true">{selectedDefinition.emoji}</span>
              <span>{selectedDefinition.label}</span>
            </>
          ) : (
            <span>React</span>
          )}
        </button>

        <div
          className={`h-4 w-px shrink-0 ${
            selectedReaction ? 'bg-accent/30' : 'bg-border/70'
          }`}
        />

        <button
          type="button"
          onClick={onCountClick}
          title={count > 0 ? 'See reactions' : 'No reactions yet'}
          disabled={count === 0}
          className={`gpp-mono inline-flex h-full shrink-0 items-center justify-center gap-0.5 rounded-r-sm px-2 text-xs font-semibold transition-colors ${
            selectedReaction
              ? 'text-accent hover:bg-accent/10'
              : count > 0
                ? 'text-text-muted hover:bg-surface-muted hover:text-text'
                : 'cursor-default text-text-muted/35'
          }`}
        >
          {topReactions.map((reaction) => (
            <span key={reaction.type} aria-hidden="true" className="font-sans">
              {reaction.emoji}
            </span>
          ))}
          <span>{count}</span>
        </button>
      </div>
    </div>
  );
}
