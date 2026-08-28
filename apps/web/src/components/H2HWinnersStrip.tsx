import type { Id } from '@convex-generated/dataModel';

import { displayTeamName } from '@/lib/display';

import { DriverBadge } from './DriverBadge';
import type { H2HDriver, H2HMatchup } from './H2HMatchupGrid';

interface H2HWinnersStripProps {
  matchups: H2HMatchup[];
  selections: Record<string, Id<'drivers'> | undefined>;
  className?: string;
}

function pickedDriver(
  matchup: H2HMatchup,
  pickedId: Id<'drivers'> | undefined,
): H2HDriver | null {
  if (pickedId === matchup.driver1._id) {
    return matchup.driver1;
  }
  if (pickedId === matchup.driver2._id) {
    return matchup.driver2;
  }
  return null;
}

/**
 * A saved head-to-head entry, shown as its eleven answers rather than as the
 * picker that produced them.
 *
 * `H2HMatchupGrid` in `readonly` mode renders both drivers of every pair in a
 * card, so reporting eleven decisions the player had already made cost 22
 * cells, eleven team headers and about a thousand pixels on a phone. Here the
 * pick is the badge and the driver it beat is the muted code beside it: the
 * pairing survives, the card does not. The grid stays where its size is earned,
 * inside the edit overlay, where it is a picker rather than a receipt.
 *
 * Team identity comes from the badge's 3px bar plus the pair of codes, which is
 * as much as the grid's team header was carrying. The full name is in the
 * `sr-only` sentence, which is also what stands in for the `aria-hidden` badge.
 */
export function H2HWinnersStrip({
  matchups,
  selections,
  className = '',
}: H2HWinnersStripProps) {
  return (
    <ul
      className={`flex flex-wrap gap-1.5 ${className}`.trim()}
      data-testid="h2h-winners-strip"
    >
      {matchups.map((matchup) => {
        const picked = pickedDriver(matchup, selections[matchup._id]);
        const teamName = displayTeamName(matchup.team);

        if (picked === null) {
          return (
            <li
              key={matchup._id}
              className="inline-flex h-10 items-center rounded-sm border border-dashed border-border-strong px-2.5"
            >
              <span className="gpp-mono text-xs text-text-muted/70" aria-hidden>
                {matchup.driver1.code} v {matchup.driver2.code}
              </span>
              <span className="sr-only">
                {teamName}: no pick yet, {matchup.driver1.displayName} against{' '}
                {matchup.driver2.displayName}
              </span>
            </li>
          );
        }

        const beaten =
          picked._id === matchup.driver1._id
            ? matchup.driver2
            : matchup.driver1;

        return (
          <li
            key={matchup._id}
            className="inline-flex h-10 items-center gap-1.5 rounded-sm bg-surface pr-2.5 pl-1.5"
          >
            {/* Covered by the sr-only sentence below, so the badge's tooltip
                trigger must not also take a tab stop inside a region assistive
                tech is told is not there. */}
            <span aria-hidden>
              <DriverBadge
                code={picked.code}
                team={picked.team}
                displayName={picked.displayName}
                number={picked.number}
                nationality={picked.nationality}
                size="sm"
                tooltipFocusable={false}
              />
            </span>
            <span className="gpp-mono text-xs text-text-muted/70" aria-hidden>
              {beaten.code}
            </span>
            <span className="sr-only">
              {teamName}: you picked {picked.displayName} over{' '}
              {beaten.displayName}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
