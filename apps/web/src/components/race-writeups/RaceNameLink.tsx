import { Link } from '@tanstack/react-router';

import { getRaceWriteup } from '@/lib/raceWriteups';

/**
 * A race named in write-up prose, linked to the best page we have for it.
 *
 * Its own write-up where one exists, and the race page otherwise, which is
 * what lets a page published weeks early name its neighbours before their
 * write-ups are written and pick them up automatically once they are.
 *
 * It takes the two fields it reads rather than a whole race document, so a
 * caller can hand it a row from any query that carries a slug and a name.
 */
export function RaceNameLink({
  race,
}: {
  race: { slug: string; name: string };
}) {
  const writeup = getRaceWriteup(race.slug);
  if (writeup) {
    return (
      <Link
        to={writeup.to}
        className="font-semibold text-text underline decoration-border-strong underline-offset-4 hover:text-accent"
      >
        {race.name}
      </Link>
    );
  }

  return (
    <Link
      to="/races/$raceSlug"
      params={{ raceSlug: race.slug }}
      className="font-semibold text-text underline decoration-border-strong underline-offset-4 hover:text-accent"
    >
      {race.name}
    </Link>
  );
}
