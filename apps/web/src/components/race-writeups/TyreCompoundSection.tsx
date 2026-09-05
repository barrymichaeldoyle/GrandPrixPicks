import type { ReactNode } from 'react';

/** Pirelli's 2026 slick range, hardest to softest. */
const COMPOUNDS = ['C1', 'C2', 'C3', 'C4', 'C5'] as const;

export type TyreCompound = (typeof COMPOUNDS)[number];

/** The sidewall colours Pirelli prints on each nominated role. */
const ROLE_BANDS = {
  hard: '#f0f0f0',
  medium: '#ffd500',
  soft: '#da291c',
} as const;

const ROLES = ['hard', 'medium', 'soft'] as const;

/**
 * Which role each compound plays at a race, given the hardest of the three
 * nominated for it.
 *
 * A nomination is always three consecutive compounds, so naming the hardest
 * names the set: the next two step down to medium and soft, and the rest of
 * the range is not at the track. Compounds outside the nomination get no role
 * and no colour.
 */
function rolesFor(
  hardest: TyreCompound,
): Record<TyreCompound, (typeof ROLES)[number] | null> {
  const start = COMPOUNDS.indexOf(hardest);
  return Object.fromEntries(
    COMPOUNDS.map((compound, index) => [
      compound,
      index >= start && index < start + ROLES.length
        ? ROLES[index - start]
        : null,
    ]),
  ) as Record<TyreCompound, (typeof ROLES)[number] | null>;
}

/**
 * The compound range drawn as five cells, hardest to softest, with the three
 * nominated for this race picked out.
 *
 * Held to the reading column rather than the full page width, so its cells
 * land near the width of the four-up stats strip and the two read as the same
 * component: gap-px cells on a border fill, figure in mono over a tracked
 * micro label.
 *
 * Showing all five is what makes it worth a graphic. Three cells would say
 * "C3, C4 and C5 are hard, medium and soft", a mapping the heading can carry
 * on its own. Five cells say where those three sit, so "the softest three"
 * stops being a claim the reader takes on trust and the relative naming stops
 * confusing: the eye can see that Monza's hard tyre is the middle of the range.
 *
 * The sidewall band is a 3px top rule per cell rather than a drawn ring: flat,
 * and on-system as the coloured column marker the scoring-band card already
 * uses. The two compounds that stay at home keep the rule at the same weight
 * but dashed, which is what a dashed hairline means everywhere else here: the
 * slot exists and there is nothing in it. They take the sunken fill rather
 * than the page colour, because a transparent cell has no bottom edge of its
 * own and left the strip visibly missing its bottom-left corner.
 */
export function TyreCompoundScale({
  venue,
  hardest,
}: {
  /** Named in the screen-reader text for the compounds that stayed at home. */
  venue: string;
  /** The hardest of the three compounds nominated for this race. */
  hardest: TyreCompound;
}) {
  const roles = rolesFor(hardest);

  return (
    <>
      <ul
        aria-label="Pirelli’s 2026 compound range, hardest to softest"
        className="mt-7 grid grid-cols-5 gap-px overflow-hidden rounded-sm bg-border"
      >
        {COMPOUNDS.map((compound) => {
          const role = roles[compound];
          const band = role ? ROLE_BANDS[role] : null;
          return (
            <li
              key={compound}
              className={
                role
                  ? 'border-t-[3px] bg-surface px-2 py-4 sm:px-5 sm:py-5'
                  : 'border-t-[3px] border-dashed border-border bg-surface-sunken px-2 py-4 sm:px-5 sm:py-5'
              }
              style={band ? { borderTopColor: band } : undefined}
            >
              <p
                className={`gpp-mono text-xl sm:text-2xl ${role ? 'text-text' : 'text-text-muted'}`}
              >
                {compound}
              </p>
              <p
                className={
                  role
                    ? 'mt-1 text-[10px] tracking-label text-text-muted uppercase sm:text-xs'
                    : 'sr-only'
                }
              >
                {role ?? `Not used at ${venue}`}
              </p>
            </li>
          );
        })}
      </ul>
      <div className="mt-2 flex justify-between gap-4 text-[10px] tracking-label text-text-muted uppercase sm:text-xs">
        <span>Lasts longer</span>
        <span>More grip</span>
      </div>
    </>
  );
}

/**
 * The compound nomination for a race, drawn as the full range with the three
 * that travel picked out.
 *
 * Showing the whole scale rather than just the nomination is the point: "the
 * softest three" only means something next to the two that stayed at home.
 */
export function TyreCompoundSection({
  heading,
  venue,
  hardest,
  children,
}: {
  heading: string;
  /** Named in the screen-reader text for the compounds that stayed at home. */
  venue: string;
  /** The hardest of the three compounds nominated for this race. */
  hardest: TyreCompound;
  /** The analysis below the scale. */
  children: ReactNode;
}) {
  return (
    <section className="py-8 sm:py-16" aria-labelledby="tyre-choice">
      <div className="max-w-3xl">
        <h2
          id="tyre-choice"
          className="font-title text-2xl font-medium text-text sm:text-3xl"
        >
          {heading}
        </h2>
        <TyreCompoundScale venue={venue} hardest={hardest} />
        {children}
      </div>
    </section>
  );
}
