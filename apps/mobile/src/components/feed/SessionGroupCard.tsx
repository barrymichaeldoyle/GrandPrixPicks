import { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { SESSION_LABELS_FULL } from '@grandprixpicks/shared/sessions';
import type { SessionType } from '@grandprixpicks/shared/sessions';
import type { NavigationProp } from '@react-navigation/native';
import { useNavigation } from '@react-navigation/native';

import type { ConvexId } from '../../integrations/convex/api';
import { api } from '../../integrations/convex/api';
import { useQuery } from '../../integrations/convex/query';
import { getCountryCodeForRaceSlug } from '../../lib/raceFlags';
import { getTeamColor } from '../../lib/teamColors';
import type { HomeStackParamList } from '../../navigation/types';
import { useDriverCard } from '../../providers/DriverCardProvider';
import { colors } from '../../theme/tokens';
import { useTypography } from '../../theme/typography';
import { Image, Pressable, Text, View } from '../../tw';
import { Avatar } from '../ui/Avatar';
import type { FeedEvent } from './FeedEventCard';
import { FeedEventCard } from './FeedEventCard';
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
      <View className="flex-row gap-1">
        {top5.map((driver, i) => (
          <ResultSlot
            code={driver.code}
            displayName={driver.displayName}
            key={driver.code}
            nationality={driver.nationality}
            number={driver.number}
            position={i + 1}
            team={driver.team}
          />
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
            className="relative h-4 flex-row items-center pr-1 pl-1.5"
            /* The chip is 16px tall inside a card that navigates when pressed,
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

function SessionSeparator({ session }: { session: SessionHeader }) {
  const navigation = useNavigation<NavigationProp<HomeStackParamList>>();
  const { titleFontFamily } = useTypography();
  const label =
    SESSION_LABELS_FULL[session.sessionType as SessionType] ??
    session.sessionType;
  const hasResult = session.top5.length > 0;
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
              {hasResult ? (
                <Ionicons color={colors.accent} name="trophy" size={12} />
              ) : null}
              <Text className="text-muted text-xs">
                {hasResult ? `${label} Result` : label}
              </Text>
            </View>
          </View>
          <View className="shrink-0 items-end">
            {session.createdAt ? (
              <Text className="text-muted text-xs">
                {formatRelativeTime(session.createdAt)}
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
          accessibilityLabel={session.raceName}
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
}: {
  event: FeedEvent;
  isViewer: boolean;
  teamOrder?: readonly string[];
}) {
  const navigation = useNavigation<NavigationProp<HomeStackParamList>>();
  const { numeralFontFamily } = useTypography();
  const [h2hOpen, setH2hOpen] = useState(false);
  const total = eventTotalPoints(event);
  const picks = [...(event.picks ?? [])].sort(
    (a, b) => a.predictedPosition - b.predictedPosition,
  );
  const sessionType = asSessionType(event.sessionType);
  const canOpenH2h = Boolean(event.h2hScore && event.raceId && sessionType);
  const name = event.displayName ?? event.username ?? 'Unknown';

  return (
    <>
      <View
        className={`gap-1.5 border-b border-border px-2.5 py-2 ${
          isViewer ? 'bg-accent/10' : 'bg-surface'
        }`}
      >
        <View className="flex-row items-center gap-2">
          <Pressable
            accessibilityRole="button"
            className="shrink-0"
            disabled={!event.username}
            onPress={() =>
              event.username
                ? navigation.navigate('PublicProfile', {
                    username: event.username,
                  })
                : undefined
            }
          >
            <Avatar imageUrl={event.avatarUrl} name={name} size="sm" />
          </Pressable>
          <Pressable
            accessibilityRole="button"
            className="min-w-0 flex-1"
            disabled={!event.username}
            onPress={() =>
              event.username
                ? navigation.navigate('PublicProfile', {
                    username: event.username,
                  })
                : undefined
            }
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
              accessibilityLabel={`H2H ${event.h2hScore!.correctPicks}/${event.h2hScore!.totalPicks}`}
              accessibilityRole="button"
              className="shrink-0 rounded-sm border border-border px-1.5 py-0.5 active:border-accent/60"
              onPress={() => setH2hOpen(true)}
            >
              <Text
                className="text-muted text-xs font-semibold tracking-wide uppercase"
                style={
                  numeralFontFamily
                    ? { fontFamily: numeralFontFamily }
                    : undefined
                }
              >
                {`H2H ${event.h2hScore!.correctPicks}/${event.h2hScore!.totalPicks}`}
              </Text>
            </Pressable>
          ) : null}
          <Text
            className="shrink-0 text-sm font-semibold text-accent"
            style={
              numeralFontFamily ? { fontFamily: numeralFontFamily } : undefined
            }
          >
            {`+${total}`}
          </Text>
        </View>

        <View className="flex-row flex-wrap items-center justify-between gap-x-3 gap-y-1.5">
          <View className="min-w-[15rem] flex-1 flex-row gap-1">
            {Array.from({ length: 5 }, (_, i) => {
              const pick = picks[i];
              return pick ? (
                <PickSlot
                  code={pick.code}
                  displayName={pick.displayName}
                  key={pick.predictedPosition}
                  nationality={pick.nationality}
                  number={pick.number}
                  points={pick.points}
                  predictedPosition={pick.predictedPosition}
                  team={pick.team}
                />
              ) : (
                <EmptySlot key={`empty-${i}`} />
              );
            })}
          </View>
        </View>
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
 * One race session's feed events under a shared header. Scored sessions
 * render as a ranked mini-leaderboard (mirrors web's SessionGroup); locked
 * sessions stack the individual pick cards.
 */
export function SessionGroupCard({
  session,
  events,
  viewerId,
  onPressEvent,
}: {
  session: SessionHeader;
  events: FeedEvent[];
  viewerId?: ConvexId<'users'>;
  onPressEvent: (event: FeedEvent) => void;
}) {
  const isScored =
    session.top5.length > 0 &&
    events.every((e) => e.type === 'score_published' && e.points !== undefined);
  const teamOrder = useQuery(
    api.f1Standings.getConstructorOrder,
    isScored ? {} : 'skip',
  );

  if (!isScored) {
    const sessionLabel =
      SESSION_LABELS_FULL[session.sessionType as SessionType] ??
      session.sessionType;
    return (
      <View className="gap-2 px-4">
        <Text className="text-muted px-0.5 text-xs font-medium">
          {session.raceName} · {sessionLabel}
        </Text>
        <View className="gap-3">
          {events.map((event) => (
            <FeedEventCard
              event={event}
              key={event._id}
              onPress={() => onPressEvent(event)}
            />
          ))}
        </View>
      </View>
    );
  }

  const ranked = [...events].sort(
    (a, b) => eventTotalPoints(b) - eventTotalPoints(a),
  );
  const sessionWithTime = {
    ...session,
    createdAt: events[0]?.createdAt,
  };

  return (
    <View>
      <SessionSeparator session={sessionWithTime} />
      {ranked.map((event) => (
        <SessionLeaderboardRow
          event={event}
          isViewer={Boolean(viewerId && event.userId === viewerId)}
          key={event._id}
          teamOrder={teamOrder}
        />
      ))}
    </View>
  );
}
