import { useEffect, useState } from 'react';
import { Linking } from 'react-native';
import Animated, {
  Easing,
  LinearTransition,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { Ionicons } from '../ui/Ionicons';
import {
  type LiveBoard,
  type LivePlayer,
  liveSessionType,
  rankLiveGroup,
} from '@grandprixpicks/shared/liveSessionBoard';
import { SESSION_LABELS_FULL } from '@grandprixpicks/shared/sessions';
import type { SessionType } from '@grandprixpicks/shared/sessions';
import type { NavigationProp } from '@react-navigation/native';
import { useNavigation } from '@react-navigation/native';

import type { ConvexId } from '../../integrations/convex/api';
import { api } from '../../integrations/convex/api';
import { useQuery } from '../../integrations/convex/query';
import { captureAnalyticsEvent } from '../../lib/analytics';
import { getCountryCodeForRaceSlug } from '../../lib/raceFlags';
import { getTeamColor } from '../../lib/teamColors';
import type { HomeStackParamList } from '../../navigation/types';
import { useDriverCard } from '../../providers/DriverCardProvider';
import { colors } from '../../theme/tokens';
import { useTypography } from '../../theme/typography';
import { AnimatedView, Image, Pressable, Text, View } from '../../tw';
import { Avatar } from '../ui/Avatar';
import type { FeedEvent } from './FeedEventCard';
import { H2HPicksDialog } from './H2HPicksDialog';
import { eventTotalPoints, formatRelativeTime } from './helpers';
import { EmptySlot, PickSlot, ResultSlot } from './PickSlot';

type SessionHeaderDriver = {
  code: string;
  displayName: string;
  team?: string;
  /** Identity, for the card a tapped chip opens. */
  number?: number;
  nationality?: string;
};

export type SessionHeader = {
  raceName: string;
  sessionType: string;
  raceSlug?: string;
  createdAt?: number;
  top5: Array<SessionHeaderDriver>;
  h2h?: Array<{
    team: string;
    winner: SessionHeaderDriver;
    loser: SessionHeaderDriver;
  }>;
};

type FeedLiveBoard = LiveBoard<ConvexId<'users'>>;
type FeedLivePlayer = LivePlayer<ConvexId<'users'>>;

/**
 * How long a place changing hands takes to slide, the same 420ms web's
 * `useReorderFlip` uses. Reanimated's layout transitions follow the system's
 * Reduce Motion setting on their own, so nothing slides for someone who asked
 * it not to.
 */
const REORDER = LinearTransition.duration(420).easing(
  Easing.bezier(0.22, 1, 0.36, 1),
);

function asSessionType(value: string | undefined): SessionType | null {
  if (
    value === 'quali' ||
    value === 'sprint_quali' ||
    value === 'sprint' ||
    value === 'race'
  ) {
    return value;
  }
  return null;
}

function FlagStrip({ raceSlug }: { raceSlug: string }) {
  const countryCode = getCountryCodeForRaceSlug(raceSlug);
  if (!countryCode) {
    return (
      <View className="w-10 shrink-0 items-center justify-center">
        <Ionicons color={colors.accent} name="flag-outline" size={16} />
      </View>
    );
  }
  return (
    <View className="h-10 w-[53px] shrink-0 self-stretch overflow-hidden border-r border-border">
      <Image
        className="h-full w-full"
        resizeMode="cover"
        source={{ uri: `https://flagcdn.com/w80/${countryCode}.png` }}
      />
    </View>
  );
}

/**
 * The one mark that says an order is still moving. Steady for someone who
 * asked for reduced motion: a pulse beside live figures is exactly what they
 * turned off.
 */
function LiveDot() {
  const reduceMotion = useReducedMotion();
  const opacity = useSharedValue(1);
  useEffect(() => {
    if (reduceMotion) {
      opacity.set(1);
      return;
    }
    opacity.set(
      withRepeat(
        withTiming(0.35, { duration: 900, easing: Easing.inOut(Easing.ease) }),
        -1,
        true,
      ),
    );
  }, [opacity, reduceMotion]);
  const style = useAnimatedStyle(() => ({ opacity: opacity.get() }));
  return (
    <AnimatedView
      accessibilityElementsHidden
      className="h-1.5 w-1.5 rounded-full bg-accent"
      importantForAccessibility="no"
      style={style}
    />
  );
}

function BandLabel({ children }: { children: string }) {
  return <Text className="text-muted/80 text-xs font-medium">{children}</Text>;
}

function ResultRow({ top5 }: { top5: SessionHeader['top5'] }) {
  const { numeralFontFamily } = useTypography();
  return (
    <View className="gap-1">
      <View className="flex-row gap-1">
        {top5.map((_, i) => (
          <Text
            className="text-muted/80 min-w-0 flex-1 text-center text-xs leading-none"
            key={i}
            style={
              numeralFontFamily ? { fontFamily: numeralFontFamily } : undefined
            }
          >
            {`P${i + 1}`}
          </Text>
        ))}
      </View>
      {/* Keyed by driver, so on a running order a car going from P4 to P2 is
          seen crossing the cells rather than appearing in one. A published
          result never reorders, so there the transition is inert. */}
      <View className="flex-row gap-1">
        {top5.map((driver, i) => (
          <Animated.View
            key={driver.code}
            layout={REORDER}
            style={{ flex: 1, flexDirection: 'row', minWidth: 0 }}
          >
            <ResultSlot
              code={driver.code}
              displayName={driver.displayName}
              nationality={driver.nationality}
              number={driver.number}
              position={i + 1}
              team={driver.team}
            />
          </Animated.View>
        ))}
      </View>
    </View>
  );
}

function H2HWinnersRow({ h2h }: { h2h: NonNullable<SessionHeader['h2h']> }) {
  const { numeralFontFamily } = useTypography();
  const { showDriver } = useDriverCard();
  return (
    <View className="gap-1">
      <BandLabel>H2H won</BandLabel>
      <View className="flex-row flex-wrap items-center gap-x-1.5 gap-y-1">
        {h2h.map((duel) => (
          // The chip names the winner, so that is whose card a tap opens.
          <Pressable
            accessibilityHint="Shows the driver's number, name and team"
            accessibilityLabel={`${duel.winner.displayName} beat ${duel.loser.displayName} (${duel.team})`}
            accessibilityRole="button"
            className="relative min-h-4 flex-row items-center pr-1 pl-1.5"
            /* The chip is 16px tall (more under large text) inside a card that navigates when pressed,
               so without the slop a near miss opens the race page instead. */
            hitSlop={{ bottom: 8, left: 4, right: 4, top: 8 }}
            key={`${duel.team}-${duel.winner.code}-${duel.loser.code}`}
            onPress={() => showDriver(duel.winner)}
          >
            <View
              className="absolute top-0 bottom-0 left-0 w-[3px]"
              style={{ backgroundColor: getTeamColor(duel.winner.team) }}
            />
            <Text
              className="text-muted text-sm leading-none tracking-wide uppercase"
              style={
                numeralFontFamily
                  ? { fontFamily: numeralFontFamily }
                  : undefined
              }
            >
              {duel.winner.code}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const VIDEO_LABELS: Record<SessionType, string> = {
  sprint_quali: 'Watch sprint qualifying highlights',
  sprint: 'Watch sprint highlights',
  quali: 'Watch qualifying highlights',
  race: 'Watch race highlights',
};

/**
 * The session's highlights, under its result, as web's `RaceVideoLinks`.
 * Opened as a YouTube URL rather than in the in-app browser, so the YouTube
 * app takes it where installed: F1's rights block most embedded players.
 */
function VideoLink({
  raceSlug,
  sessionType,
}: {
  raceSlug: string;
  sessionType: SessionType;
}) {
  const videos = useQuery(api.raceVideos.list, { raceSlug });
  const video = videos?.find((candidate) => candidate.kind === sessionType);
  if (!video?.videoId || !/^[A-Za-z0-9_-]{11}$/.test(video.videoId)) {
    return null;
  }
  const label = VIDEO_LABELS[sessionType];
  return (
    <View className="border-b border-border bg-surface">
      <Pressable
        accessibilityHint="Opens YouTube"
        accessibilityLabel={label}
        accessibilityRole="link"
        className="flex-row items-center gap-1.5 self-start px-2.5 py-3 active:opacity-70"
        onPress={() => {
          captureAnalyticsEvent('race_video_clicked', {
            video_id: video.videoId,
            video_kind: sessionType,
            race_slug: raceSlug,
          });
          void Linking.openURL(
            `https://www.youtube.com/watch?v=${video.videoId}`,
          );
        }}
      >
        <Text className="text-sm font-medium text-accent">{label}</Text>
        <Ionicons color={colors.accent} name="open-outline" size={14} />
      </Pressable>
    </View>
  );
}

function SessionSeparator({
  session,
  pending = false,
  live = false,
}: {
  session: SessionHeader;
  /** Every row is a locked set of picks, waiting on the result. */
  pending?: boolean;
  /** The five in `session.top5` are the running order, not the result. */
  live?: boolean;
}) {
  const navigation = useNavigation<NavigationProp<HomeStackParamList>>();
  const { titleFontFamily } = useTypography();
  const label =
    SESSION_LABELS_FULL[session.sessionType as SessionType] ??
    session.sessionType;
  const hasResult = session.top5.length > 0;
  // "As it stands", not "Result": these five are the order on track this
  // second, and the same five cells directly above everyone's picks is exactly
  // where that could be misread.
  const sessionLine = live
    ? `${label} as it stands`
    : hasResult
      ? `${label} result`
      : label;
  const header = (
    <View className="overflow-hidden">
      <View className="flex-row items-stretch border-b border-border bg-surface-elevated">
        {session.raceSlug ? (
          <FlagStrip raceSlug={session.raceSlug} />
        ) : (
          <View className="w-10 shrink-0 items-center justify-center">
            <Ionicons color={colors.accent} name="flag-outline" size={16} />
          </View>
        )}
        <View className="flex-1 flex-row items-center justify-between gap-2 px-2 py-1">
          <View className="min-w-0 flex-1">
            <Text
              className="text-foreground text-sm leading-tight font-semibold"
              numberOfLines={1}
              style={
                titleFontFamily ? { fontFamily: titleFontFamily } : undefined
              }
            >
              {session.raceName}
            </Text>
            <View className="flex-row items-center gap-1">
              {live ? (
                <LiveDot />
              ) : hasResult ? (
                <Ionicons color={colors.accent} name="trophy" size={12} />
              ) : null}
              <Text className="text-muted text-xs">{sessionLine}</Text>
            </View>
          </View>
          <View className="shrink-0 items-end">
            {session.createdAt ? (
              <Text className="text-muted text-xs">
                {formatRelativeTime(session.createdAt)}
              </Text>
            ) : null}
            {live ? (
              <Text className="text-xs font-medium text-accent">Live</Text>
            ) : pending ? (
              <Text className="text-xs font-medium text-accent">
                Awaiting results
              </Text>
            ) : null}
          </View>
        </View>
      </View>
      {hasResult ? (
        <View className="gap-2.5 bg-surface-elevated px-2.5 pt-2 pb-2.5">
          <ResultRow top5={session.top5} />
          {session.h2h && session.h2h.length > 0 ? (
            <H2HWinnersRow h2h={session.h2h} />
          ) : null}
        </View>
      ) : null}
    </View>
  );

  return (
    <View className="overflow-hidden border-y border-border bg-surface">
      {session.raceSlug ? (
        <Pressable
          accessibilityLabel={`${session.raceName}, ${sessionLine}`}
          accessibilityRole="button"
          onPress={() =>
            navigation.navigate('RaceDetail', { raceSlug: session.raceSlug! })
          }
        >
          {header}
        </Pressable>
      ) : (
        header
      )}
    </View>
  );
}

function SessionLeaderboardRow({
  event,
  isViewer,
  teamOrder,
  live,
}: {
  event: FeedEvent;
  isViewer: boolean;
  teamOrder?: readonly string[];
  /**
   * This player's score against the running order, while the session is still
   * on track. It stands in for the published numbers the row normally reads
   * off the event, which do not exist yet.
   */
  live?: FeedLivePlayer;
}) {
  const navigation = useNavigation<NavigationProp<HomeStackParamList>>();
  const { numeralFontFamily } = useTypography();
  const [h2hOpen, setH2hOpen] = useState(false);
  // A locked set of picks has nothing to total yet: no "+0" beside it.
  const scored = live !== undefined || event.points !== undefined;
  const total = live ? live.total : eventTotalPoints(event);
  const picks = [...(live?.picks ?? event.picks ?? [])].sort(
    (a, b) => a.predictedPosition - b.predictedPosition,
  );
  const sessionType = asSessionType(event.sessionType);
  const canOpenH2h = Boolean(event.userId && event.raceId && sessionType);
  const name = event.displayName ?? event.username ?? 'Unknown';
  // Live has no denominator: duels are settled as the cars cross the line,
  // so "3/11" would read as eight lost duels when eight are still being raced.
  const h2hLabel = live
    ? `H2H +${live.h2hPoints}`
    : event.h2hScore
      ? `H2H ${event.h2hScore.correctPicks}/${event.h2hScore.totalPicks}`
      : 'H2H picks';
  const amended = event.type === 'results_amended';

  function openProfile() {
    if (event.username) {
      navigation.navigate('PublicProfile', { username: event.username });
    }
  }

  return (
    <>
      <View
        className={`gap-1.5 border-b border-border px-2.5 py-2 ${
          isViewer ? 'bg-accent/10' : 'bg-surface'
        }`}
      >
        <View className="flex-row items-center gap-2">
          <Pressable
            accessibilityLabel={`${name}'s profile`}
            accessibilityRole="button"
            className="shrink-0"
            disabled={!event.username}
            onPress={openProfile}
          >
            <Avatar imageUrl={event.avatarUrl} name={name} size="sm" />
          </Pressable>
          <Pressable
            accessibilityRole="button"
            className="min-w-0 flex-1"
            disabled={!event.username}
            onPress={openProfile}
          >
            <Text
              className="text-foreground text-sm leading-snug font-semibold"
              numberOfLines={1}
            >
              {name}
            </Text>
          </Pressable>
          {canOpenH2h ? (
            <Pressable
              accessibilityLabel={h2hLabel}
              accessibilityRole="button"
              className="shrink-0 rounded-sm border border-border px-1.5 py-0.5 active:border-accent/60"
              hitSlop={{ bottom: 8, top: 8 }}
              onPress={() => setH2hOpen(true)}
            >
              <Text
                className="text-muted text-xs font-semibold"
                style={
                  numeralFontFamily
                    ? { fontFamily: numeralFontFamily }
                    : undefined
                }
              >
                {h2hLabel}
              </Text>
            </Pressable>
          ) : null}
          {scored ? (
            <Text
              className="shrink-0 text-sm font-semibold text-accent"
              style={
                numeralFontFamily
                  ? { fontFamily: numeralFontFamily }
                  : undefined
              }
            >
              {`+${total}`}
            </Text>
          ) : null}
        </View>

        <View className="flex-row gap-1">
          {Array.from({ length: 5 }, (_, i) => {
            const pick = picks[i];
            return pick ? (
              <PickSlot
                code={pick.code}
                displayName={pick.displayName}
                key={pick.predictedPosition}
                nationality={
                  'nationality' in pick ? pick.nationality : undefined
                }
                number={'number' in pick ? pick.number : undefined}
                points={scored ? pick.points : undefined}
                predictedPosition={pick.predictedPosition}
                team={pick.team}
              />
            ) : (
              <EmptySlot key={`empty-${i}`} />
            );
          })}
        </View>

        {amended ? (
          <View className="flex-row flex-wrap items-baseline gap-x-2 gap-y-0.5">
            <Text className="text-xs font-medium text-warning">
              {event.previousPoints !== undefined && event.points !== undefined
                ? `Results amended · ${event.previousPoints} → ${event.points} pts`
                : 'Results amended'}
            </Text>
            {event.amendmentNote ? (
              <Text className="text-muted text-xs">{event.amendmentNote}</Text>
            ) : null}
          </View>
        ) : null}
      </View>

      {h2hOpen && event.raceId && sessionType && event.userId ? (
        <H2HPicksDialog
          displayName={name}
          onClose={() => setH2hOpen(false)}
          raceId={event.raceId}
          sessionType={sessionType}
          teamOrder={teamOrder}
          userId={event.userId}
        />
      ) : null}
    </>
  );
}

/**
 * One race session's feed events under a shared header, as web's
 * `SessionGroup`. Three states, one layout:
 *
 * - scored: the result, then the players ranked by total;
 * - live (race and sprint only): the running order, the players ranked
 *   against it and re-ranked as places change hands;
 * - pending: everyone's locked picks, awaiting the result.
 */
export function SessionGroupCard({
  session,
  events,
  viewerId,
}: {
  session: SessionHeader;
  events: FeedEvent[];
  viewerId?: ConvexId<'users'>;
}) {
  const isScored =
    session.top5.length > 0 &&
    events.every((e) => e.type === 'score_published' && e.points !== undefined);
  // Every row can open the H2H dialog, and the order has to be in hand before
  // it opens or its placeholder rows sort by last season and reshuffle.
  const teamOrder = useQuery(api.f1Standings.getConstructorOrder, {});

  /*
   * Every player the group is about, so the board comes back scored for all
   * of them in one read. Sorted so the args are stable across renders: the
   * feed's own order shuffles as events arrive, and an unstable arg is a new
   * subscription each time.
   */
  const raceId = events.find((event) => event.raceId)?.raceId;
  const liveType = liveSessionType(
    events.find((event) => event.sessionType)?.sessionType,
  );
  const userIds = [
    ...new Set(events.flatMap((event) => (event.userId ? [event.userId] : []))),
  ].sort();
  const liveBoard = useQuery(
    api.liveScoring.getLiveSessionBoard,
    !isScored && raceId && liveType && userIds.length > 0
      ? { raceId, sessionType: liveType, userIds }
      : 'skip',
  ) as FeedLiveBoard | null | undefined;

  const sessionWithTime = {
    ...session,
    // Newest first, so the group carries its latest activity.
    createdAt: events[0]?.createdAt,
  };
  function isViewer(event: FeedEvent) {
    return Boolean(viewerId && event.userId === viewerId);
  }

  if (!isScored) {
    const live = rankLiveGroup(events, liveBoard);

    if (live && liveBoard) {
      return (
        <View>
          <SessionSeparator
            live
            session={{
              ...sessionWithTime,
              top5: liveBoard.top5.map((driver) => ({
                ...driver,
                team: driver.team ?? undefined,
              })),
              // No live duel band: a car ahead on lap 30 has not won anything.
              // Each player's own duels are one tap away on their row.
              h2h: undefined,
            }}
          />
          {live.events.map((event) => (
            <Animated.View key={event._id} layout={REORDER}>
              <SessionLeaderboardRow
                event={event}
                isViewer={isViewer(event)}
                live={live.playerFor(event)}
                teamOrder={teamOrder}
              />
            </Animated.View>
          ))}
          {/* Every number above this line moves, and a position read as a
              result is the one misreading to rule out. */}
          <Text className="text-muted border-b border-border px-2.5 py-2 text-xs">
            Running order is live and can change, including after the flag.
          </Text>
        </View>
      );
    }

    return (
      <View>
        <SessionSeparator
          pending={events.every((event) => event.type === 'session_locked')}
          session={sessionWithTime}
        />
        {events.map((event) => (
          <SessionLeaderboardRow
            event={event}
            isViewer={isViewer(event)}
            key={event._id}
            teamOrder={teamOrder}
          />
        ))}
      </View>
    );
  }

  // Best total (Top 5 + H2H) first. The order is the whole statement; the
  // positions themselves belong to the leaderboard.
  const ranked = [...events].sort(
    (a, b) => eventTotalPoints(b) - eventTotalPoints(a),
  );
  const videoType = asSessionType(session.sessionType);

  return (
    <View>
      <SessionSeparator session={sessionWithTime} />
      {session.raceSlug && videoType ? (
        <VideoLink raceSlug={session.raceSlug} sessionType={videoType} />
      ) : null}
      {ranked.map((event) => (
        <SessionLeaderboardRow
          event={event}
          isViewer={isViewer(event)}
          key={event._id}
          teamOrder={teamOrder}
        />
      ))}
    </View>
  );
}
