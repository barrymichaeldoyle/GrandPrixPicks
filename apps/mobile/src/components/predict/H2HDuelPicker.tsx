import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useEffect, useRef, useState } from 'react';
import { useReducedMotion } from 'react-native-reanimated';

import { colors } from '../../theme/tokens';
import { Pressable, Text, View } from '../../tw';
import { H2HPicksBar } from '../picks/H2HPicksBar';
import type { H2HDuelMatchup } from './H2HDuelQuestion';
import { H2HDuelQuestion } from './H2HDuelQuestion';

/**
 * How long the answered duel stays on screen before the next one replaces it.
 * Same beat as web: long enough to see the pick land, short enough that eleven
 * battles feel like a rhythm rather than a queue.
 */
const ADVANCE_DELAY_MS = 420;

const LABEL = 'text-muted text-xs font-semibold tracking-wider uppercase';

/**
 * The eleven team-mate battles, one at a time. Port of web's `H2HDuelPicker`:
 * the picks bar is the progress (and the way back to any battle), the duel
 * card asks the question, and a finished card folds down to the bar alone.
 */
export function H2HDuelPicker({
  matchups,
  selections,
  onSelect,
  draftHydrated = true,
  topFivePositions,
  disabled = false,
}: {
  matchups: ReadonlyArray<H2HDuelMatchup>;
  selections: Record<string, string | undefined>;
  onSelect: (matchupId: string, driverId: string) => void;
  /**
   * Whether the editor has finished restoring any device draft. The picker
   * catches up to that restored progress once; after that the player owns
   * which battle is on screen.
   */
  draftHydrated?: boolean;
  topFivePositions?: Record<string, number | undefined>;
  disabled?: boolean;
}) {
  const reduceMotion = useReducedMotion();
  const firstOpenIndex = (() => {
    const index = matchups.findIndex((matchup) => !selections[matchup._id]);
    return index === -1 ? Math.max(0, matchups.length - 1) : index;
  })();
  const [activeIndex, setActiveIndex] = useState(firstOpenIndex);
  /** A finished card reopened on one battle, or null when folded away. */
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const syncedToDraftRef = useRef(false);

  const selectedCount = matchups.filter(
    (matchup) => selections[matchup._id] !== undefined,
  ).length;
  const previousSelectedCountRef = useRef(selectedCount);
  const complete = matchups.length > 0 && selectedCount === matchups.length;
  const matchup = matchups[activeIndex];

  useEffect(
    () => () => {
      if (timerRef.current !== null) {
        clearTimeout(timerRef.current);
      }
    },
    [],
  );

  // Drafts load asynchronously, so a 5/11 draft would otherwise sit stranded
  // on battle one. Catch up once, then get out of the way so Previous works.
  useEffect(() => {
    if (!draftHydrated || syncedToDraftRef.current || matchups.length === 0) {
      return;
    }
    syncedToDraftRef.current = true;
    // oxlint-disable-next-line react/set-state-in-effect
    setActiveIndex(firstOpenIndex);
  }, [draftHydrated, firstOpenIndex, matchups.length]);

  // Discarding a restored draft empties the card, so start the sequence over.
  useEffect(() => {
    if (previousSelectedCountRef.current > 0 && selectedCount === 0) {
      // oxlint-disable-next-line react/set-state-in-effect
      setActiveIndex(0);
    }
    previousSelectedCountRef.current = selectedCount;
  }, [selectedCount]);

  function cancelPendingAdvance() {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }

  /** Deliberate navigation always wins over a queued auto-advance. */
  function goTo(index: number) {
    cancelPendingAdvance();
    const next = Math.min(Math.max(index, 0), matchups.length - 1);
    setActiveIndex(next);
    setEditingIndex(next);
  }

  function goToNextOpenMatchup(selectedMatchupId: string) {
    function isOpen(candidate: H2HDuelMatchup) {
      return (
        candidate._id !== selectedMatchupId &&
        selections[candidate._id] === undefined
      );
    }
    const nextAfterCurrent = matchups.findIndex(
      (candidate, index) => index > activeIndex && isOpen(candidate),
    );
    const nextAnywhere = matchups.findIndex(isOpen);
    setActiveIndex(
      nextAfterCurrent !== -1
        ? nextAfterCurrent
        : nextAnywhere !== -1
          ? nextAnywhere
          : Math.min(activeIndex + 1, matchups.length - 1),
    );
  }

  function pick(driverId: string) {
    if (!matchup) {
      return;
    }
    // Re-picking inside the advance window re-arms it rather than being lost.
    onSelect(matchup._id, driverId);
    void Haptics.selectionAsync();

    cancelPendingAdvance();
    // Changing a call on a finished card has nowhere to advance to, so the
    // same beat that would move on folds the card away instead.
    const answered = matchups.every(
      (candidate) =>
        candidate._id === matchup._id ||
        selections[candidate._id] !== undefined,
    );
    timerRef.current = setTimeout(
      () =>
        answered ? setEditingIndex(null) : goToNextOpenMatchup(matchup._id),
      reduceMotion ? 0 : ADVANCE_DELAY_MS,
    );
  }

  if (!matchup) {
    return null;
  }

  const collapsed = complete && editingIndex === null;

  return (
    <View>
      <View className={collapsed ? '' : 'mb-4'}>
        <View className="flex-row items-center justify-between gap-3">
          <View
            accessibilityLiveRegion="polite"
            className="flex-row items-center gap-1.5"
          >
            {collapsed ? (
              <Ionicons color={colors.accent} name="checkmark" size={14} />
            ) : null}
            <Text className={LABEL}>
              {collapsed
                ? 'All team-mate picks made'
                : `Team-mate pick ${activeIndex + 1} of ${matchups.length}`}
            </Text>
          </View>
          {collapsed ? (
            <Text className="text-muted text-xs">Tap one to change it</Text>
          ) : null}
        </View>
        <H2HPicksBar
          activeIndex={collapsed ? -1 : activeIndex}
          matchups={matchups}
          onSelectIndex={disabled ? undefined : goTo}
          selections={selections}
        />
      </View>

      {collapsed ? null : (
        <>
          <View className="rounded-xl border border-border bg-surface p-3">
            <H2HDuelQuestion
              disabled={disabled}
              matchup={matchup}
              onPick={pick}
              selectedDriverId={selections[matchup._id]}
              showTeam
              topFivePositions={topFivePositions}
            />
          </View>

          <View className="mt-3 min-h-9 flex-row items-center justify-between gap-3">
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ disabled: activeIndex === 0 }}
              className={`min-h-11 flex-row items-center gap-1.5 pr-3 ${
                activeIndex === 0 ? 'opacity-40' : ''
              }`}
              disabled={activeIndex === 0}
              hitSlop={6}
              onPress={() => goTo(activeIndex - 1)}
            >
              <Ionicons color={colors.text} name="arrow-back" size={14} />
              <Text className="text-foreground text-sm font-medium">
                Previous
              </Text>
            </Pressable>
            <View className="flex-row items-center gap-1.5">
              {complete ? (
                <Ionicons color={colors.accent} name="checkmark" size={14} />
              ) : null}
              <Text className="text-muted text-sm">
                {complete ? 'All team-mate picks made' : 'Pick one to continue'}
              </Text>
            </View>
          </View>
        </>
      )}
    </View>
  );
}
