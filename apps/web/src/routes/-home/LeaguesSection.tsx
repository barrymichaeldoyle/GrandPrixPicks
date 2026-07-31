import { ArrowRight } from 'lucide-react';

import { Button } from '@/components/Button/Button';
import { useClerkRuntimeControl } from '@/integrations/clerk/runtime-control';
import { captureAnalyticsEvent } from '@/lib/analytics';

import { PointsCell, PositionBox, RankDelta } from './TimingTower';

/**
 * A league standings panel rendered in the real timing-tower primitives rather
 * than shipped as a screenshot. It restyles itself with the rest of the system
 * and costs nothing to download, and a captured PNG of a real league would go
 * stale the first time a token moved.
 *
 * The names are obviously placeholders. Nothing here is presented as a real
 * league or real people.
 */
const MOCK_LEAGUE = {
  name: 'Sunday Strategists',
  memberCount: 8,
  rows: [
    { position: 1, name: 'Dave is P1 again', points: 486, delta: 0 },
    { position: 2, name: 'Undercut Enjoyer', points: 471, delta: 2 },
    { position: 3, name: 'Box Box Barbara', points: 455, delta: -1 },
    { position: 4, name: 'Two Stopper Truther', points: 443, delta: -1 },
    { position: 5, name: 'Yer Man Off The Telly', points: 428, delta: null },
  ],
} as const;

export function LeaguesSection() {
  const clerkRuntime = useClerkRuntimeControl();

  function startLeague() {
    captureAnalyticsEvent('landing_league_cta_clicked', {
      source: 'landing',
    });
    captureAnalyticsEvent('landing_auth_started', {
      source: 'landing',
      intent: 'create_league',
    });
    clerkRuntime.requestSignIn('/leagues/create');
  }

  return (
    <section
      aria-labelledby="landing-leagues-heading"
      className="border-t border-border px-4 py-10 sm:py-12"
    >
      <div className="mx-auto grid w-full max-w-5xl gap-8 lg:grid-cols-2 lg:items-center lg:gap-14">
        <div>
          <h2
            id="landing-leagues-heading"
            className="text-2xl leading-snug font-light tracking-display text-text sm:text-3xl"
          >
            <span className="block">Your group chat has opinions.</span>
            <span className="block whitespace-nowrap">Make them count.</span>
          </h2>
          <p className="gpp-reading-copy-lg mt-4 text-text-muted">
            Create a league, send one link, and give the group chat a table to
            argue about.
          </p>
          <div className="mt-6">
            <Button
              variant="secondary"
              size="md"
              rightIcon={ArrowRight}
              onClick={startLeague}
            >
              Start a league
            </Button>
          </div>
        </div>

        <div>
          <div className="border-b border-border pb-3">
            <p className="gpp-label">League</p>
            <div className="mt-1 flex flex-wrap items-baseline gap-x-2 gap-y-1">
              <h3 className="font-medium text-text">{MOCK_LEAGUE.name}</h3>
              <span className="text-text-muted" aria-hidden="true">
                ·
              </span>
              <p className="gpp-reading-meta text-text-muted">
                {MOCK_LEAGUE.memberCount} members
              </p>
            </div>
          </div>
          <ol aria-label="Example league standings">
            {MOCK_LEAGUE.rows.map((row) => (
              <li
                key={row.position}
                className="flex items-center gap-3 border-b border-border py-2.5"
              >
                <PositionBox
                  position={row.position}
                  leader={row.position === 1}
                />
                <span className="min-w-0 flex-1 truncate text-sm text-text">
                  {row.name}
                </span>
                <PointsCell points={row.points} />
                <span className="flex w-10 shrink-0 justify-end">
                  <RankDelta delta={row.delta} />
                </span>
              </li>
            ))}
          </ol>
          <p className="gpp-reading-meta mt-3 text-text-muted">
            Example league. Yours will have worse names.
          </p>
        </div>
      </div>
    </section>
  );
}
