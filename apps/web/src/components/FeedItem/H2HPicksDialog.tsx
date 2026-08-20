import { api } from '@convex-generated/api';
import type { Id } from '@convex-generated/dataModel';
import {
  currentPairings,
  teamStandingsIndex,
} from '@grandprixpicks/shared/teams';
import { useQuery } from '@/integrations/convex/query';
import { createPortal } from 'react-dom';
import { Check, X } from 'lucide-react';
import type { CSSProperties } from 'react';

import { useModalDialog } from '@/hooks/useModalDialog';
import { displayTeamName } from '@/lib/display';
import { FALLBACK_TEAM_COLOR, TEAM_COLORS } from '@/lib/teamColors';

import { DriverBadge } from '../DriverBadge';

/**
 * Constructors' order for the loading rows. This is last season's order, the
 * best a component with no database can do, so a team or two may shift when the
 * live standings arrive with the real rows.
 *
 * The current pairings only: the season's list also holds the pairings that
 * mid-season driver changes have retired, and including those would draw a
 * team twice.
 */
const loadingRows = [...currentPairings()].sort(
  (a, b) =>
    teamStandingsIndex(a.team) - teamStandingsIndex(b.team) ||
    a.team.localeCompare(b.team),
);

/**
 * The team column, which the loading state can fill in for real.
 *
 * The grid's eleven teams are the same all season and the rows are sorted into
 * a fixed order, so a skeleton that greys them out is hiding something it
 * already knows. Only the duel itself has to wait — and that is now the part
 * that can genuinely change mid-season, when a driver swaps seats.
 */
function TeamCell({ team }: { team: string }) {
  return (
    <span
      className="flex min-w-0 flex-1 items-center gap-1.5"
      style={
        {
          '--team-colour': TEAM_COLORS[team] ?? FALLBACK_TEAM_COLOR,
        } as CSSProperties
      }
    >
      <span className="gpp-team-dot" aria-hidden />
      <span className="truncate text-xs leading-none text-text-muted">
        {displayTeamName(team)}
      </span>
    </span>
  );
}

function VersusLabel() {
  return (
    <span className="shrink-0 text-xs leading-none text-text-muted/40">vs</span>
  );
}

export function H2HPicksDialog({
  userId,
  raceId,
  sessionType,
  displayName,
  onClose,
}: {
  userId: Id<'users'>;
  raceId: Id<'races'>;
  sessionType: 'quali' | 'sprint_quali' | 'sprint' | 'race';
  displayName: string;
  onClose: () => void;
}) {
  const panelRef = useModalDialog<HTMLDivElement>({ onClose });
  const picks = useQuery(api.h2h.getH2HPicksForFeedItem, {
    userId,
    raceId,
    sessionType,
  });

  // The server sorts these by the live constructors table now, so re-sorting
  // here on last season's order would quietly undo it. It used to be needed:
  // the query returned rows in whatever order the player's predictions were
  // written, which differs between players.
  const rows = picks;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="h2h-picks-dialog-title"
        tabIndex={-1}
        className="mx-4 w-full max-w-sm rounded-sm border border-border bg-surface outline-none"
      >
        {/* Header */}
        <div className="flex items-start justify-between px-4 pt-4 pb-2">
          <div>
            <h3 id="h2h-picks-dialog-title" className="font-semibold text-text">
              Head to Head
            </h3>
            <p className="text-xs text-text-muted">
              {displayName}&apos;s picks
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-0.5 text-text-muted hover:text-text"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="border-t border-border" />

        {/* Rows */}
        <div className="py-1">
          {rows === undefined ? (
            // The finished row, dimmed. Teams, duels and the drivers in them
            // are all fixed for the season, so the only thing actually being
            // waited on is the outcome — which is the only thing that pulses.
            // Nothing here is a different shape from the loaded row, so
            // nothing reflows when it arrives.
            loadingRows.map((duel) => (
              <div key={duel.team} className="flex h-9 items-center gap-2 px-4">
                <TeamCell team={duel.team} />
                <span className="inline-flex shrink-0 opacity-30">
                  <DriverBadge
                    code={duel.driver1Code}
                    team={duel.team}
                    size="sm"
                  />
                </span>
                <VersusLabel />
                <span className="inline-flex shrink-0 opacity-30">
                  <DriverBadge
                    code={duel.driver2Code}
                    team={duel.team}
                    size="sm"
                  />
                </span>
                <span className="flex w-4 shrink-0 items-center">
                  <span className="h-4 w-4 animate-pulse rounded-full bg-surface-muted" />
                </span>
              </div>
            ))
          ) : !rows || rows.length === 0 ? (
            <p className="px-4 py-3 text-sm text-text-muted">
              No H2H picks for this session.
            </p>
          ) : (
            rows.map((pick) => {
              const d1Picked = pick.predictedWinnerId === pick.driver1._id;

              return (
                <div
                  key={pick.matchupId}
                  className="flex h-9 items-center gap-2 px-4"
                >
                  <TeamCell team={pick.team} />

                  <span
                    className={`inline-flex shrink-0 ${d1Picked ? '' : 'opacity-30'}`}
                  >
                    <DriverBadge
                      code={pick.driver1.code}
                      team={pick.driver1.team}
                      displayName={pick.driver1.displayName}
                      nationality={pick.driver1.nationality}
                      size="sm"
                    />
                  </span>

                  <VersusLabel />

                  <span
                    className={`inline-flex shrink-0 ${!d1Picked ? '' : 'opacity-30'}`}
                  >
                    <DriverBadge
                      code={pick.driver2.code}
                      team={pick.driver2.team}
                      displayName={pick.driver2.displayName}
                      nationality={pick.driver2.nationality}
                      size="sm"
                    />
                  </span>

                  <span className="flex w-4 shrink-0 items-center">
                    {pick.hasResult ? (
                      pick.correct ? (
                        <Check className="h-4 w-4 text-success" />
                      ) : (
                        <X className="h-4 w-4 text-error" />
                      )
                    ) : null}
                  </span>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
