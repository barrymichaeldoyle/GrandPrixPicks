import type { ReactNode } from 'react';

import { RACE_WRITEUP_PICKS_ANCHOR } from '@/components/race-writeups/DeferredRaceWriteupPicks';
import { RaceFaqSection } from '@/components/race-writeups/RaceFaqSection';
import { RaceWriteupArticle } from '@/components/race-writeups/RaceWriteupArticle';
import { RaceWriteupChampionshipContext } from '@/components/race-writeups/RaceWriteupChampionshipContext';
import { RaceWriteupFinish } from '@/components/race-writeups/RaceWriteupFinish';
import { RaceWriteupHero } from '@/components/race-writeups/RaceWriteupHero';
import { RaceWriteupNextRound } from '@/components/race-writeups/RaceWriteupNextRound';
import { RaceWriteupPage } from '@/components/race-writeups/RaceWriteupPage';
import { WeekendNewsSection } from '@/components/WeekendNewsSection';
import { WeekendPracticeSection } from '@/components/WeekendPracticeSection';
import type { RaceWriteupData } from '@/lib/raceWriteupLoader';
import {
  getRaceWriteupPhase,
  isRaceWriteupLive,
  raceWriteupHeroSummary,
} from '@/lib/raceWriteupPhase';
import { followingRound } from '@/lib/raceWriteups';

/**
 * A race write-up laid out the standard way: hero, the weekend's news, the
 * article, the picker, practice, the championship, FAQs and the next round.
 *
 * Six write-ups were this page copied by hand, differing only in the values
 * passed here and the article sections passed as children. Copies drift: one
 * lost the gate that keeps the pick button off a round whose picks are not
 * open yet, which the others had gained after Austin's opened five days late.
 * A route now supplies its facts and its prose, and the page is built once.
 */
export function StandardRaceWriteup({
  data,
  raceSlug,
  raceName,
  flagCode,
  venueName,
  signalsHeading,
  timeZone,
  timeZoneLabel,
  summary,
  reviewedAt,
  sources,
  faqs,
  children,
}: {
  data: RaceWriteupData;
  raceSlug: string;
  /** "Las Vegas Grand Prix": the title and the hero summary's subject. */
  raceName: string;
  flagCode: string;
  /** Where the race is, as players say it: "Las Vegas", "Lusail". */
  venueName: string;
  /** The circuit section's heading, which the hero also links to. */
  signalsHeading: string;
  /** The track's IANA zone; the schedule and the eyebrow dates use it. */
  timeZone: string;
  timeZoneLabel: string;
  /** The hero's one sentence about this weekend while it is still to come. */
  summary: string;
  reviewedAt: number;
  sources: ReactNode;
  faqs: readonly { question: string; answer: string }[];
  /** The article's sections. */
  children: ReactNode;
}) {
  const {
    race,
    championship,
    weather,
    weatherNow,
    news,
    season,
    practice,
    nextRace,
  } = data;
  const phase = getRaceWriteupPhase(race, weatherNow);
  const isLive = isRaceWriteupLive(phase);
  // The picker takes over from the closing panel by itself once this round is
  // the next on the calendar (`RaceWriteupFinish`), so the page needs no edit
  // on the day picks open. Austin's opened five days late for want of one.
  const canPick = isLive && (!nextRace || nextRace.slug === raceSlug);
  const primaryActionTargetId = canPick ? RACE_WRITEUP_PICKS_ANCHOR : undefined;

  return (
    <RaceWriteupPage
      hero={
        <RaceWriteupHero
          flagCode={flagCode}
          eyebrow={`${formatWeekendSpan(race, timeZone)} · ${venueName} · Round ${race.round}`}
          title={`${raceName} 2026 predictions`}
          summary={raceWriteupHeroSummary(phase, `The ${raceName}`, summary)}
          phase={phase}
          raceSlug={raceSlug}
          primaryActionTargetId={primaryActionTargetId}
          nextRace={phase === 'finished' ? nextRace : undefined}
          venueName={venueName}
          signalsHeading={signalsHeading}
          schedule={{
            race,
            timeZone,
            timeZoneLabel,
            weather,
            now: weatherNow,
          }}
        />
      }
      storeLinkInFooter={!(isLive && news.items.length > 0)}
      reviewedAt={reviewedAt}
      sources={sources}
    >
      {/* The weekend's news opens the page: see the Singapore route and
          `docs/race-writeup-lifecycle.md`. Renders nothing until there is an
          item. */}
      {isLive ? (
        <WeekendNewsSection items={news.items} storePage={raceSlug} />
      ) : null}
      <RaceWriteupArticle
        actions={{ phase, raceSlug, venueName, primaryActionTargetId }}
      >
        {children}
      </RaceWriteupArticle>
      <RaceWriteupFinish
        isLive={isLive}
        phase={phase}
        raceId={race._id}
        round={race.round}
        season={race.season}
        raceSlug={raceSlug}
        venueName={venueName}
        nextRace={nextRace}
        hasSprint={race.hasSprint}
        loadImmediately
      />
      {/* Practice follows the article and the call to pick. It renders
          nothing until there is a session. */}
      {isLive ? (
        <WeekendPracticeSection
          results={practice}
          raceSlug={raceSlug}
          schedule={race}
        />
      ) : null}

      {isLive ? (
        <RaceWriteupChampionshipContext
          championship={championship}
          races={season.races}
          thisRound={race.round}
          venueName={venueName}
        />
      ) : null}

      <RaceFaqSection faqs={faqs} />

      {/* While live, `RaceWriteupFinish` holds the picker, so the next round
          is linked here; once finished it prints the next round itself. */}
      {isLive ? (
        <RaceWriteupNextRound
          nextRace={followingRound(season.races, race.round)}
        />
      ) : null}
    </RaceWriteupPage>
  );
}

/**
 * "19–21 Nov", or "30 Oct–1 Nov" across a month end: first practice to the
 * race, in track time. Read from the race rather than typed beside it, so a
 * rescheduled round cannot keep its old dates in the eyebrow while the schedule
 * card under it shows the new ones.
 */
export function formatWeekendSpan(
  race: Pick<RaceWriteupData['race'], 'fp1StartAt' | 'raceStartAt'>,
  timeZone: string,
): string {
  function parts(timestamp: number) {
    const formatted = new Intl.DateTimeFormat('en-GB', {
      day: 'numeric',
      month: 'short',
      timeZone,
    }).formatToParts(timestamp);
    return {
      day: formatted.find((part) => part.type === 'day')?.value ?? '',
      month: formatted.find((part) => part.type === 'month')?.value ?? '',
    };
  }
  const end = parts(race.raceStartAt);
  if (race.fp1StartAt === undefined) {
    return `${end.day} ${end.month}`;
  }
  const start = parts(race.fp1StartAt);
  return start.month === end.month
    ? `${start.day}–${end.day} ${end.month}`
    : `${start.day} ${start.month}–${end.day} ${end.month}`;
}
