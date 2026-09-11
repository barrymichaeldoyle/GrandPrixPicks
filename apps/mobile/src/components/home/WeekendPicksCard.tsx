import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import { formatLockCountdown } from '@grandprixpicks/shared/picks';
import {
  SESSION_LABELS_SHORT,
  type SessionType,
} from '@grandprixpicks/shared/sessions';
import * as WebBrowser from 'expo-web-browser';

import { api } from '../../integrations/convex/api';
import { useQuery } from '../../integrations/convex/query';
import { getCountryCodeForRaceSlug } from '../../lib/raceFlags';
import { bucketWeatherNow, pickForecastHour } from '../../lib/weatherNow';
import { getRaceWriteup } from '../../lib/raceWriteups';
import { useMobileConfig } from '../../providers/mobile-config';
import { colors } from '../../theme/tokens';
import { useTypography } from '../../theme/typography';
import { Image, Pressable, ScrollView, Text, View } from '../../tw';
import { H2HPicksBar, type H2HBarMatchup } from '../picks/H2HPicksBar';
import { TopFivePicksBar } from '../picks/TopFivePicksBar';
import { PrimaryButton } from '../ui/PrimaryButton';
import { SlantedStripe } from '../ui/SlantedStripe';
import { Numeral } from '../ui/Numeral';

const SITE_URL = 'https://grandprixpicks.com';

const LABEL = 'text-[10px] font-semibold tracking-widest text-muted uppercase';

export type WeekendSession = {
  sessionType: SessionType;
  lockAt: number | null;
  isLocked: boolean;
  hasResult: boolean;
  canCreate: boolean;
  canEdit: boolean;
};

type Driver = {
  _id: string;
  code: string;
  team?: string | null;
};

export function WeekendPicksCard({
  race,
  sessions,
  selectedSession,
  onSelectSession,
  now,
  drivers,
  matchups,
  top5,
  h2h,
  hasAnyTop5,
  onMakePicks,
  onEditTop5,
  onSelectH2H,
  onFinishH2H,
}: {
  race: {
    name: string;
    round: number;
    slug: string;
    hasSprint?: boolean | null;
  };
  sessions: ReadonlyArray<WeekendSession>;
  selectedSession: SessionType;
  onSelectSession?: (session: SessionType) => void;
  now: number;
  drivers: ReadonlyArray<Driver>;
  matchups: ReadonlyArray<H2HBarMatchup>;
  top5: ReadonlyArray<string>;
  h2h: Record<string, string>;
  hasAnyTop5: boolean;
  onMakePicks: () => void;
  onEditTop5: () => void;
  onSelectH2H: (index: number) => void;
  onFinishH2H: () => void;
}) {
  const { titleFontFamily } = useTypography();
  const countryCode = getCountryCodeForRaceSlug(race.slug);
  const writeup = getRaceWriteup(race.slug);
  const active =
    sessions.find((session) => session.sessionType === selectedSession) ??
    sessions[0];
  const editable = Boolean(active && (active.canCreate || active.canEdit));
  const hasCard = top5.length > 0;
  const tabsInteractive = hasAnyTop5;
  const h2hCalled = matchups.filter((matchup) => h2h[matchup._id]).length;
  const h2hComplete = matchups.length > 0 && h2hCalled === matchups.length;

  return (
    <View className="overflow-hidden border-b border-border bg-surface">
      <SlantedStripe />

      <View className="flex-row items-start gap-3 px-4 py-4">
        {countryCode ? (
          <View className="h-[30px] w-10 overflow-hidden rounded-sm border border-border">
            <Image
              source={{
                uri: `https://flagcdn.com/w160/${countryCode}.png`,
              }}
              className="h-full w-full"
              resizeMode="cover"
            />
          </View>
        ) : null}
        <View className="min-w-0 flex-1">
          <Text className={LABEL}>
            {`Round ${race.round}${race.hasSprint ? ' · Sprint weekend' : ''}`}
          </Text>
          <Text
            className="text-foreground mt-1 text-xl font-semibold"
            numberOfLines={2}
            style={
              titleFontFamily ? { fontFamily: titleFontFamily } : undefined
            }
          >
            {race.name}
          </Text>
        </View>
      </View>

      <View className="flex-row items-center gap-3 pl-4">
        <ScrollView
          className="min-w-0 flex-1"
          contentContainerClassName="flex-row gap-x-4 pr-3"
          horizontal
          showsHorizontalScrollIndicator={false}
        >
          {sessions.map((session) => (
            <SessionChip
              key={session.sessionType}
              onSelect={
                tabsInteractive
                  ? () => onSelectSession?.(session.sessionType)
                  : undefined
              }
              selected={
                tabsInteractive && session.sessionType === selectedSession
              }
              session={session}
            />
          ))}
        </ScrollView>
        <View className="pr-4">
          <SessionClock now={now} session={active} />
        </View>
      </View>

      <View className="px-4 py-4">
        {!hasCard ? (
          <PicksInvitation editable={editable} onMakePicks={onMakePicks} />
        ) : (
          <PicksSummary
            drivers={drivers}
            editable={editable}
            h2h={h2h}
            h2hCalled={h2hCalled}
            h2hComplete={h2hComplete}
            matchups={matchups}
            onEditTop5={onEditTop5}
            onFinishH2H={onFinishH2H}
            onSelectH2H={onSelectH2H}
            top5={top5}
          />
        )}
      </View>

      <ForecastRow now={now} raceSlug={race.slug} startAt={active?.lockAt} />

      {writeup ? (
        <Pressable
          accessibilityRole="link"
          className="flex-row items-center gap-3 px-4 py-3 active:bg-surface-elevated"
          onPress={() => {
            void WebBrowser.openBrowserAsync(`${SITE_URL}${writeup.to}`);
          }}
        >
          <Ionicons color={colors.textMuted} name="book-outline" size={16} />
          <View className="min-w-0 flex-1">
            <Text className={LABEL}>Weekend preview</Text>
            <Text
              className="text-foreground mt-0.5 text-sm font-medium"
              numberOfLines={1}
            >
              {writeup.cta}
            </Text>
          </View>
          <Ionicons color={colors.textMuted} name="arrow-forward" size={16} />
        </Pressable>
      ) : null}
    </View>
  );
}

function PicksInvitation({
  editable,
  onMakePicks,
}: {
  editable: boolean;
  onMakePicks: () => void;
}) {
  if (!editable) {
    return (
      <Text className="text-muted text-sm">
        This session locked before you picked for it.
      </Text>
    );
  }

  return (
    <View>
      <Text className="text-[10px] font-semibold tracking-widest text-accent uppercase">
        Step 1 of 2
      </Text>
      <Text className="text-foreground mt-1 text-lg font-semibold">
        Choose your Top 5
      </Text>
      <Text className="text-muted mt-1 text-sm">
        Tap drivers in finishing order. One card covers every open session.
      </Text>
      <View className="mt-4">
        <PrimaryButton label="Make your picks" onPress={onMakePicks} />
      </View>
    </View>
  );
}

function PicksSummary({
  drivers,
  editable,
  h2h,
  h2hCalled,
  h2hComplete,
  matchups,
  onEditTop5,
  onFinishH2H,
  onSelectH2H,
  top5,
}: {
  drivers: ReadonlyArray<Driver>;
  editable: boolean;
  h2h: Record<string, string>;
  h2hCalled: number;
  h2hComplete: boolean;
  matchups: ReadonlyArray<H2HBarMatchup>;
  onEditTop5: () => void;
  onFinishH2H: () => void;
  onSelectH2H: (index: number) => void;
  top5: ReadonlyArray<string>;
}) {
  return (
    <View>
      <View className="min-h-11 flex-row items-center justify-between">
        <Text className={LABEL}>Your Top 5</Text>
        {editable ? (
          <Pressable
            accessibilityRole="button"
            className="flex-row items-center gap-1 py-2"
            hitSlop={8}
            onPress={onEditTop5}
          >
            <Ionicons color={colors.accent} name="pencil" size={12} />
            <Text className="text-xs font-bold text-accent">Edit</Text>
          </Pressable>
        ) : null}
      </View>
      <TopFivePicksBar
        drivers={drivers}
        onEdit={editable ? onEditTop5 : undefined}
        picks={top5}
      />

      {matchups.length === 0 ? null : (
        <View className="mt-5">
          <View className="min-h-11 flex-row items-center justify-between">
            <Text className={LABEL}>Team-mate picks</Text>
            {editable ? (
              <Text className="text-muted text-xs">
                {h2hComplete
                  ? 'Tap one to change it'
                  : `${matchups.length - h2hCalled} left to pick`}
              </Text>
            ) : null}
          </View>
          <H2HPicksBar
            matchups={matchups}
            onSelectIndex={editable ? onSelectH2H : undefined}
            selections={h2h}
          />
          {editable && !h2hComplete ? (
            <View className="mt-3">
              <PrimaryButton
                label={
                  h2hCalled === 0
                    ? 'Make your team-mate picks'
                    : 'Finish team-mate picks'
                }
                onPress={onFinishH2H}
              />
            </View>
          ) : null}
        </View>
      )}
    </View>
  );
}

function SessionChip({
  session,
  selected = false,
  onSelect,
}: {
  session: WeekendSession;
  selected?: boolean;
  onSelect?: () => void;
}) {
  const isOpen = session.canCreate || session.canEdit;
  const icon: ComponentProps<typeof Ionicons>['name'] = session.hasResult
    ? 'trophy'
    : isOpen
      ? 'time-outline'
      : 'lock-closed';
  const tone = session.hasResult
    ? colors.success
    : isOpen
      ? colors.accent
      : colors.warning;
  const className = `shrink-0 flex-row items-center gap-1 border-b-2 py-2.5 ${
    selected ? 'border-accent' : 'border-transparent'
  } ${onSelect && !selected ? 'opacity-60' : ''}`;

  const label = (
    <>
      <Ionicons color={tone} name={icon} size={12} />
      <Text
        className="text-[11px] font-semibold tracking-widest uppercase"
        style={{ color: tone }}
      >
        {SESSION_LABELS_SHORT[session.sessionType]}
      </Text>
    </>
  );

  if (!onSelect) {
    return <View className={className}>{label}</View>;
  }

  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityState={{ selected }}
      className={className}
      onPress={onSelect}
    >
      {label}
    </Pressable>
  );
}

function SessionClock({
  session,
  now,
}: {
  session: WeekendSession | undefined;
  now: number;
}) {
  const { numeralFontFamily } = useTypography();
  if (!session) {
    return null;
  }
  const isOpen = session.canCreate || session.canEdit;
  let copy: string | null = null;
  let countdown: string | null = null;
  if (isOpen && session.lockAt != null) {
    const remaining = session.lockAt - now;
    if (remaining > 0) {
      copy = 'locks in';
      countdown = formatLockCountdown(remaining);
    } else {
      copy = 'locking now';
    }
  } else if (session.hasResult) {
    copy = 'results published';
  } else {
    copy = 'locked';
  }

  return (
    <View className="shrink-0 flex-row items-center py-2.5">
      <Text className="text-muted text-xs">{copy}</Text>
      {countdown ? (
        <Numeral
          style={{
            marginLeft: 6,
            fontFamily: numeralFontFamily,
          }}
          variant="small"
        >
          {countdown}
        </Numeral>
      ) : null}
    </View>
  );
}

function ForecastRow({
  raceSlug,
  startAt,
  now,
}: {
  raceSlug: string;
  startAt: number | null | undefined;
  now: number;
}) {
  const { convexEnabled } = useMobileConfig();
  const weather = useQuery(
    api.weather.getByRaceSlug,
    convexEnabled ? { raceSlug, now: bucketWeatherNow(now) } : 'skip',
  );
  if (!weather) {
    return null;
  }
  const target = startAt ?? now;
  const hour = pickForecastHour(weather.forecast.hours, target);
  if (!hour) {
    return null;
  }

  const rainy =
    hour.conditionCode.includes('rain') || hour.conditionCode.includes('sleet');
  const cloudy =
    hour.conditionCode.includes('cloud') || hour.conditionCode.includes('fog');

  return (
    <View className="flex-row items-center gap-3 px-4 py-2.5">
      <Ionicons
        color={colors.textMuted}
        name={
          rainy ? 'rainy-outline' : cloudy ? 'cloud-outline' : 'sunny-outline'
        }
        size={16}
      />
      <Text className={LABEL}>
        {weather.isStale ? 'Forecast (last available)' : 'Forecast'}
      </Text>
      <Text className="text-foreground ml-auto text-xs">
        {`${forecastLabel(hour.conditionCode)} · ${Math.round(hour.temperatureC)}°C`}
      </Text>
    </View>
  );
}

function forecastLabel(code: string): string {
  const normalized = code.toLowerCase().replace(/_/g, '');
  if (normalized.includes('thunder')) {
    return 'Thunderstorms';
  }
  if (normalized.includes('heavyrain')) {
    return 'Heavy rain';
  }
  if (normalized.includes('rain')) {
    return 'Rain';
  }
  if (normalized.includes('sleet')) {
    return 'Sleet';
  }
  if (normalized.includes('snow')) {
    return 'Snow';
  }
  if (normalized.includes('fog')) {
    return 'Fog';
  }
  if (normalized.includes('partlycloudy')) {
    return 'Partly cloudy';
  }
  if (normalized.includes('cloudy')) {
    return 'Cloudy';
  }
  if (normalized.includes('fair')) {
    return 'Fair';
  }
  if (normalized.includes('clearsky') || normalized.includes('clear')) {
    return 'Clear';
  }
  return 'Changeable';
}
