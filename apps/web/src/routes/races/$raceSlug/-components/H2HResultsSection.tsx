import { api } from '@convex-generated/api';
import type { Doc, Id } from '@convex-generated/dataModel';
import {
  DRIVER_STATUS_DESCRIPTIONS,
  DRIVER_STATUS_LABELS,
} from '@grandprixpicks/shared/driverStatus';
import { Link } from '@tanstack/react-router';
import { useQuery } from '@/integrations/convex/query';
import { ChevronDown, ChevronUp, Gavel } from 'lucide-react';
import { useState } from 'react';

import { DriverBadge } from '@/components/DriverBadge';
import { useViewerSession } from '@/integrations/clerk/useViewerSession';
import { H2HResultsTable } from '@/components/H2HResultsTable';
import { ShareOnXButton } from '@/components/ShareOnXButton';
import {
  toPointsBySession,
  useMyH2HScoresBySession,
} from '@/hooks/useMyH2HScoresBySession';
import { encodeShareCardSearch } from '@/lib/og/shareCard';
import type { SessionType } from '@/lib/sessions';
import { SESSION_LABELS } from '@/lib/sessions';
import { buildH2HScoreShareText } from '@/lib/share';
import { siteConfig } from '@/lib/site';
import { useUserDateFormat } from '@/lib/useUserDateFormat';
import type { RaceWeekendInitialResults } from '@/routes/races/$raceSlug/-hooks/useRaceWeekendData';

interface H2HResultsSectionProps {
  race: Doc<'races'>;
  selectedSession: SessionType;
  /**
   * Loader-seeded public data (driver roster, which sessions are published, and
   * the finishing order per session). Renders the actual-results table during
   * SSR / before the client subscriptions resolve, so a finished race is
   * crawlable. Viewer-specific data (the pick column, H2H record) stays
   * client-only and simply shows blanks until Clerk + Convex boot.
   */
  initialDrivers?: Doc<'drivers'>[];
  initialAvailableSessions?: SessionType[];
  initialResultsBySession?: RaceWeekendInitialResults['resultsBySession'];
}

export function H2HResultsSection({
  race,
  selectedSession,
  initialDrivers,
  initialAvailableSessions,
  initialResultsBySession,
}: H2HResultsSectionProps) {
  const raceId = race._id;
  // SSR-resolved, so the signed-out table shape is right on first paint.
  const { isSignedIn } = useViewerSession();
  const { formatDate } = useUserDateFormat();
  const me = useQuery(api.users.me, {});
  const drivers =
    useQuery(api.drivers.listDrivers, {
      round: race.round,
      season: race.season,
      includeNotRacing: true,
    }) ?? initialDrivers;
  const availableSessions =
    useQuery(api.results.getAllResultsForRace, {
      raceId,
    }) ?? initialAvailableSessions;
  const selectedTop5Result =
    useQuery(api.results.getResultForRace, {
      raceId,
      sessionType: selectedSession,
    }) ?? initialResultsBySession?.[selectedSession];
  const myTop5Predictions = useQuery(api.predictions.myWeekendPredictions, {
    raceId,
  });
  const myTop5Scores = useQuery(api.results.getMyScoresForRace, {
    raceId,
  });
  const h2hResults = useQuery(api.h2h.getH2HResultsForRace, {
    raceId,
    sessionType: selectedSession,
  });
  const { scoresBySession: myH2HScoresBySession, pointsBySession } =
    useMyH2HScoresBySession(raceId);
  const myH2HScore = myH2HScoresBySession[selectedSession];
  const myH2HPredictions = useQuery(api.h2h.myH2HPredictionsForRace, {
    raceId,
  });

  const [fullResultsExpanded, setFullResultsExpanded] = useState(false);

  const sessionHasResults = new Set(availableSessions ?? []);
  const isSelectedSessionScored = sessionHasResults.has(selectedSession);

  const top5PointsBySession = toPointsBySession(myTop5Scores);

  const selectedTop5Points = top5PointsBySession[selectedSession];
  const selectedH2HPoints = pointsBySession[selectedSession];
  const sessionPointsGain = selectedTop5Points + selectedH2HPoints;

  const driverById = new Map(drivers?.map((driver) => [driver._id, driver]));
  const selectedTop5Picks = myTop5Predictions?.predictions[selectedSession];
  const top5Breakdown =
    myTop5Scores?.[selectedSession]?.enrichedBreakdown ?? [];
  const selectedSessionPicks = myH2HPredictions?.[selectedSession] ?? null;

  const top5ByPredictedPosition = new Map(
    top5Breakdown.map((b) => [b.predictedPosition, b]),
  );

  const classificationRows = selectedTop5Result?.enrichedClassification ?? [];
  const scoringRows = classificationRows.slice(0, 6);
  const remainingRows = classificationRows.slice(6);
  const remainingMidpoint = Math.ceil(remainingRows.length / 2);
  const remainingColumns = [
    remainingRows.slice(0, remainingMidpoint),
    remainingRows.slice(remainingMidpoint),
  ];
  const h2hSummaryItems: {
    rowId: string;
    matchupId: Id<'h2hMatchups'>;
    team: string;
    myPickId: Id<'drivers'> | null;
    myPickCode: string | null;
    winnerId: Id<'drivers'>;
    points: number;
  }[] = (h2hResults ?? []).map((result) => {
    const myPickId = selectedSessionPicks?.[result.matchupId] ?? null;
    const myPickDriver =
      myPickId === result.driver1?._id
        ? result.driver1
        : myPickId === result.driver2?._id
          ? result.driver2
          : null;
    const points = myPickId && myPickId === result.winnerId ? 1 : 0;
    return {
      rowId: `h2h-${result.matchupId}`,
      matchupId: result.matchupId,
      team: result.team,
      myPickId,
      myPickCode: myPickDriver?.code ?? null,
      winnerId: result.winnerId,
      points,
    };
  });
  const h2hResultMatchups = (h2hResults ?? [])
    .map((result) => {
      if (!result.driver1 || !result.driver2) {
        return null;
      }
      return {
        _id: result.matchupId,
        team: result.team,
        driver1: result.driver1,
        driver2: result.driver2,
      };
    })
    .filter(
      (matchup): matchup is NonNullable<typeof matchup> => matchup != null,
    );
  const h2hSelections = Object.fromEntries(
    h2hSummaryItems.map((item) => [item.matchupId, item.myPickId ?? undefined]),
  );
  const h2hWinners = Object.fromEntries(
    h2hSummaryItems.map((item) => [item.matchupId, item.winnerId]),
  );
  const h2hPointsMap = Object.fromEntries(
    h2hSummaryItems.map((item) => [item.matchupId, item.points]),
  );
  const h2hShareBy = me?.displayName || me?.username || undefined;
  const h2hShareText = myH2HScore
    ? buildH2HScoreShareText({
        raceName: race.name,
        sessionLabel: SESSION_LABELS[selectedSession],
        correct: myH2HScore.correctPicks,
        total: myH2HScore.totalPicks,
        picks: h2hSummaryItems.map((item) => ({
          code: item.myPickCode,
          correct: item.points > 0,
        })),
        accountHandle: siteConfig.social.x.handle,
        raceHashtag: race.hashtag,
      })
    : '';
  const h2hShareUrl = myH2HScore
    ? `${siteConfig.url}/races/${race.slug}?${new URLSearchParams({
        ...encodeShareCardSearch({
          variant: 'h2h_score',
          session: selectedSession,
          correct: myH2HScore.correctPicks,
          total: myH2HScore.totalPicks,
          points: myH2HScore.points,
          // Skipped matchups have no code; the card simply omits their chip.
          picks: h2hSummaryItems.flatMap((item) =>
            item.myPickCode
              ? [{ code: item.myPickCode, correct: item.points > 0 }]
              : [],
          ),
          by: h2hShareBy,
        }),
        utm_source: 'x',
        utm_medium: 'social',
        utm_campaign: 'share_h2h_score',
      }).toString()}`
    : '';

  /**
   * Non-finishers keep a tail position so H2H has an order to read, but showing
   * that number would imply they finished there. Show the official status.
   */
  function renderPositionCell(entry: (typeof classificationRows)[number]) {
    if (entry.status) {
      return (
        <span
          className="text-text-muted"
          title={DRIVER_STATUS_DESCRIPTIONS[entry.status]}
        >
          {DRIVER_STATUS_LABELS[entry.status]}
        </span>
      );
    }
    return <>P{entry.position}</>;
  }

  function renderActualDriverRow(
    entry: (typeof classificationRows)[number],
    compact = false,
  ) {
    return (
      <div className="flex min-w-0 items-center gap-2 sm:gap-3">
        <DriverBadge
          code={entry.code}
          team={entry.team}
          displayName={entry.displayName}
          number={entry.number}
          nationality={entry.nationality}
          size={compact ? 'sm' : 'md'}
        />
        {/*
          The driver's name is the answer this page exists to give, so it
          renders at every width and in full ink. It used to be
          `hidden text-xs sm:inline`, which left a phone showing "P1 · NOR"
          with the name reachable only through a hover tooltip that touch
          cannot open — while the collapsed P7-P22 rows below, which pass
          `compact`, showed their names all along.
        */}
        <span
          className={`min-w-0 truncate ${
            compact
              ? 'text-sm text-text-muted'
              : 'text-sm text-text sm:text-base'
          }`}
        >
          {entry.displayName}
        </span>
      </div>
    );
  }

  return (
    <div data-testid="session-points-breakdown">
      {/*
        Headline role (`3xl`, weight 400). It used to be `lg`/`xl` semibold,
        which put it level with the race name in the page header above it.
      */}
      <h2 className="mb-4 text-2xl leading-tight font-normal tracking-tight text-text sm:text-3xl">
        Session Results
      </h2>

      {!isSelectedSessionScored ? (
        <div className="rounded-lg border border-border bg-surface px-4 py-5 text-sm text-text-muted">
          No results published yet for {SESSION_LABELS[selectedSession]}. Points
          will appear here when results are in.
        </div>
      ) : (
        <div className="space-y-3">
          {selectedTop5Result?.amendedAt != null &&
            selectedTop5Result.amendmentNote && (
              <div
                className="flex items-start gap-2.5 rounded-lg border border-warning/30 bg-warning/10 px-3 py-2.5"
                data-testid="results-amended-banner"
              >
                <Gavel className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
                <div className="min-w-0 text-sm">
                  <p className="font-semibold text-text">
                    Results amended{' '}
                    <span
                      className="font-normal text-text-muted"
                      suppressHydrationWarning
                    >
                      · {formatDate(selectedTop5Result.amendedAt)}
                    </span>
                  </p>
                  <p className="text-text-muted">
                    {selectedTop5Result.amendmentNote}
                  </p>
                  <Link
                    to="/results-policy"
                    className="mt-1 inline-block font-medium text-accent hover:underline"
                  >
                    Why results change
                  </Link>
                </div>
              </div>
            )}
          {/*
            Title role (`xl`, weight 500). This was `sm`/600 — smaller than the
            body text underneath it — with a decorative accent trophy beside
            it. The icon carried no information the heading did not, and it
            spent the accent on something that is neither the action nor the
            active state.
          */}
          <div className="flex items-baseline justify-between gap-3 pt-1">
            <h3 className="text-xl leading-tight font-medium tracking-tight text-text">
              Top 5
            </h3>
            {isSignedIn && (
              <span className="gpp-mono shrink-0 text-sm font-medium text-accent">
                +{selectedTop5Points} pts
              </span>
            )}
          </div>
          <div className="flex flex-col gap-1">
            <div className="rounded-lg border border-border bg-surface">
              <table className="w-full">
                <caption className="sr-only">
                  {race.name} {SESSION_LABELS[selectedSession]} classification,
                  positions 1 to 6. P6 is shown because a driver predicted at P5
                  who finishes P6 is off by one and still scores.
                </caption>
                <thead>
                  <tr className="border-b border-border text-xs uppercase sm:text-sm">
                    {/*
                      `scope` is what lets a screen reader announce "P1,
                      Actual: Lando Norris" instead of reading cells blind.
                    */}
                    <th
                      scope="col"
                      className="sticky top-0 z-20 w-16 bg-surface px-2 py-2 text-left text-text-muted sm:w-24 sm:px-4"
                    >
                      Pos
                    </th>
                    <th
                      scope="col"
                      className="sticky top-0 z-20 bg-surface px-2 py-2 text-left text-text-muted sm:px-4"
                    >
                      Actual
                    </th>
                    {/*
                      Pick and points are per-viewer. For a signed-out reader
                      there is nothing to show, and rendering the columns filled
                      a public results page with "No pick" and "+0" for every
                      row, which is all a crawler saw of the classification.
                    */}
                    {isSignedIn && (
                      <>
                        <th
                          scope="col"
                          className="sticky top-0 z-20 bg-surface px-2 py-2 text-left text-text-muted sm:px-4"
                        >
                          Top 5
                        </th>
                        <th
                          scope="col"
                          className="sticky top-0 z-20 bg-surface px-2 py-2 text-right text-text-muted sm:px-4"
                        >
                          Pts
                        </th>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {scoringRows.map((entry) => {
                    const predictedPos =
                      entry.position <= 5 ? entry.position : null;
                    const pickDriverId =
                      predictedPos !== null
                        ? selectedTop5Picks?.[predictedPos - 1]
                        : undefined;
                    const pickDriver = pickDriverId
                      ? driverById.get(pickDriverId)
                      : undefined;
                    const top5 = predictedPos
                      ? top5ByPredictedPosition.get(predictedPos)
                      : undefined;
                    const top5Pts = top5?.points ?? 0;
                    const isTop5Actual = entry.position <= 5;

                    return (
                      <tr
                        key={entry.driverId}
                        className={`border-b border-border ${isTop5Actual ? 'bg-accent-muted/15' : ''}`}
                      >
                        <td className="gpp-mono px-2 py-2 text-sm text-text-muted sm:px-4">
                          {renderPositionCell(entry)}
                        </td>
                        <td className="px-2 py-2 sm:px-4">
                          {renderActualDriverRow(entry)}
                        </td>
                        {isSignedIn && (
                          <>
                            <td className="px-2 py-2 sm:px-4">
                              {predictedPos !== null ? (
                                <div className="flex items-center gap-2">
                                  {pickDriver ? (
                                    <DriverBadge
                                      code={pickDriver.code}
                                      team={pickDriver.team}
                                      displayName={pickDriver.displayName}
                                      number={pickDriver.number}
                                      nationality={pickDriver.nationality}
                                    />
                                  ) : (
                                    <span className="text-xs text-text-muted">
                                      No pick
                                    </span>
                                  )}
                                </div>
                              ) : (
                                <span className="text-xs text-text-muted">
                                  —
                                </span>
                              )}
                            </td>
                            <td
                              className={`px-2 py-2 text-right text-sm font-semibold sm:px-4 ${
                                top5Pts > 0 ? 'text-accent' : 'text-text-muted'
                              }`}
                            >
                              +{top5Pts}
                            </td>
                          </>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
                {remainingRows.length > 0 && (
                  <tfoot>
                    <tr>
                      <td
                        colSpan={isSignedIn ? 4 : 2}
                        className="border-t border-border px-2 py-0 sm:px-4"
                      >
                        <button
                          type="button"
                          onClick={() => setFullResultsExpanded((v) => !v)}
                          className="flex w-full items-center justify-center gap-1.5 py-2 text-sm text-text-muted transition-colors hover:text-text"
                        >
                          {fullResultsExpanded ? (
                            <>
                              <ChevronUp size={14} />
                              Hide full results
                            </>
                          ) : (
                            <>
                              <ChevronDown size={14} />
                              Show full results (P7–P{classificationRows.length}
                              )
                            </>
                          )}
                        </button>
                      </td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
            {/*
              Kept mounted rather than conditionally rendered: this table is
              P7 to the back of the grid, which is most of a results page. If it
              only exists once expanded, crawlers index a 22-driver result as a
              6-driver one. Collapsed state is height 0 plus inert.
            */}
            {remainingRows.length > 0 && (
              // Height animates via grid-template-rows (0fr/1fr) rather than a
              // measured pixel height, which is the same trick the announcement
              // banner uses: it lets the row size itself to content without
              // anything having to measure it, so no engine is involved.
              <div
                aria-hidden={!fullResultsExpanded}
                inert={!fullResultsExpanded}
                className={`grid overflow-hidden transition-[grid-template-rows,opacity] duration-200 ease-out ${
                  fullResultsExpanded
                    ? 'grid-rows-[1fr] opacity-100'
                    : 'grid-rows-[0fr] opacity-0'
                }`}
              >
                <div className="grid min-h-0 gap-x-1 md:grid-cols-2">
                  {remainingColumns.map((column, index) => (
                    <div
                      key={index}
                      className={`overflow-hidden border border-border bg-surface ${
                        index === 0
                          ? 'rounded-t-lg md:rounded-lg'
                          : 'rounded-b-lg border-t-0 md:rounded-lg md:border-t'
                      }`}
                    >
                      <table className="w-full">
                        <caption className="sr-only">
                          {race.name} {SESSION_LABELS[selectedSession]}{' '}
                          classification, remaining finishers (part {index + 1}{' '}
                          of {remainingColumns.length}).
                        </caption>
                        <thead
                          className={
                            index === 1 ? 'hidden md:table-header-group' : ''
                          }
                        >
                          <tr className="border-b border-border text-xs uppercase">
                            <th
                              scope="col"
                              className="w-16 px-3 py-2 text-left text-text-muted"
                            >
                              Pos
                            </th>
                            <th
                              scope="col"
                              className="px-3 py-2 text-left text-text-muted"
                            >
                              Driver
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {column.map((entry) => (
                            <tr
                              key={entry.driverId}
                              className="border-b border-border last:border-0"
                            >
                              <td className="gpp-mono px-3 py-2 text-sm text-text-muted">
                                {renderPositionCell(entry)}
                              </td>
                              <td className="px-3 py-2">
                                {renderActualDriverRow(entry, true)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => setFullResultsExpanded(false)}
                  className="mt-1 flex w-full items-center justify-center gap-1.5 py-2 text-sm text-text-muted transition-colors hover:text-text"
                >
                  <ChevronUp size={14} />
                  Hide full results
                </button>
              </div>
            )}
          </div>
          <div className="flex items-baseline justify-between gap-3 pt-4">
            <h3 className="text-xl leading-tight font-medium tracking-tight text-text">
              Head-to-Head
            </h3>
            {isSignedIn && (
              <span className="gpp-mono shrink-0 text-sm font-medium text-accent">
                +{selectedH2HPoints} pts
              </span>
            )}
          </div>
          <H2HResultsTable
            matchups={h2hResultMatchups}
            selections={h2hSelections}
            winners={h2hWinners}
            pointsByMatchup={h2hPointsMap}
            showViewerColumn={isSignedIn}
            caption={`${race.name} ${SESSION_LABELS[selectedSession]} team-mate duels: which driver finished ahead in each pairing.`}
          />
          {h2hShareText && h2hShareUrl && (
            <div className="flex justify-center pt-1">
              <ShareOnXButton
                text={h2hShareText}
                url={h2hShareUrl}
                analyticsEvent="h2h_score_shared_x"
                analyticsProps={{
                  race_slug: race.slug,
                  session_type: selectedSession,
                  correct_picks: myH2HScore?.correctPicks,
                  total_picks: myH2HScore?.totalPicks,
                  points: myH2HScore?.points,
                }}
                label="Share my H2H score on X"
              />
            </div>
          )}

          {isSignedIn && (
            <div className="flex items-center justify-between border-t border-border pt-3 text-sm">
              <span className="font-semibold text-text">Session Total</span>
              <span className="font-semibold text-accent">
                +{sessionPointsGain} pts
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
