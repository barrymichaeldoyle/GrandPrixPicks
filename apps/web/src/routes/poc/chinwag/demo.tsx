import { createFileRoute } from '@tanstack/react-router';

import { isCreatorPollPreviewAllowed } from '@/lib/creatorPollGate';

import { NotFoundPage } from '@/routes/__root';

import { chinwagHead } from './-components/chinwagHead';
import type { ResultsBoardData } from './-components/ChinwagResultsBoard';
import { ChinwagResultsBoard } from './-components/ChinwagResultsBoard';
import { ChinwagShell } from './-components/ChinwagShell';

export const Route = createFileRoute('/poc/chinwag/demo')({
  component: ChinwagDemoPage,
  validateSearch: (search: Record<string, unknown>): { k?: string } => ({
    k: typeof search.k === 'string' ? search.k : undefined,
  }),
  loaderDeps: ({ search }) => ({ k: search.k }),
  loader: async ({ deps }) => ({
    allowed: await isCreatorPollPreviewAllowed(deps.k),
  }),
  head: () => chinwagHead('Chinwag results'),
});

/**
 * A fixed board, for the proposal.
 *
 * The live board at `/poc/chinwag/results` reflects whatever the poll is doing
 * right now, which for a link sent to someone is a liability: an empty board, a
 * pre-race phase with no comparison to show, or a race that has moved on by the
 * time he opens it. This one always shows the same thing, so it can go in an
 * email and still be worth looking at a week later.
 *
 * It renders through the same `ChinwagResultsBoard` as the live one, so what he
 * is shown is the component he would get rather than a mock-up that can drift.
 *
 * ## What is real and what is not
 *
 * The race is the 2026 Dutch Grand Prix, and the two settled facts are the real
 * ones: Norris took pole at Zandvoort and won from it.
 *
 * Every vote count and percentage below is invented, because nobody has voted
 * on this yet — that is the whole point of a proposal. The board is marked
 * `Example data` for exactly that reason: these numbers must never be mistaken
 * for his audience's, wherever the link ends up.
 */
const DEMO: ResultsBoardData = {
  phase: 'post',
  race: { name: 'Dutch Grand Prix' },
  showName: 'Pre Race Chinwag',
  totalVotes: 1284,
  settled: [
    {
      id: 'pole',
      label: 'Pole position',
      actual: { code: 'NOR', displayName: 'Lando Norris' },
      crowd: { value: 'VER', label: 'Max Verstappen', count: 462, share: 0.36 },
    },
    {
      id: 'winner',
      label: 'Race winner',
      actual: { code: 'NOR', displayName: 'Lando Norris' },
      crowd: { value: 'NOR', label: 'Lando Norris', count: 526, share: 0.41 },
    },
  ],
  questions: [
    {
      id: 'bangerDriver',
      label: 'BANGER DRIVER',
      before: [
        { value: 'HAM', label: 'Lewis Hamilton', count: 401, share: 0.27 },
      ],
      options: [
        { value: 'ANT', label: 'Kimi Antonelli', count: 488, share: 0.38 },
        { value: 'RUS', label: 'George Russell', count: 244, share: 0.19 },
        { value: 'NOR', label: 'Lando Norris', count: 205, share: 0.16 },
        { value: 'HAM', label: 'Lewis Hamilton', count: 141, share: 0.11 },
        { value: 'BEA', label: 'Oliver Bearman', count: 103, share: 0.08 },
      ],
    },
    {
      id: 'clangerDriver',
      label: 'CLANGER DRIVER',
      before: [
        { value: 'STR', label: 'Lance Stroll', count: 372, share: 0.25 },
      ],
      options: [
        { value: 'COL', label: 'Franco Colapinto', count: 411, share: 0.32 },
        { value: 'STR', label: 'Lance Stroll', count: 269, share: 0.21 },
        { value: 'PER', label: 'Sergio Pérez', count: 231, share: 0.18 },
        { value: 'GAS', label: 'Pierre Gasly', count: 167, share: 0.13 },
        { value: 'BOT', label: 'Valtteri Bottas', count: 116, share: 0.09 },
      ],
    },
    {
      id: 'bangerTeam',
      label: 'BANGER TEAM',
      before: [{ value: 'Ferrari', label: 'Ferrari', count: 430, share: 0.29 }],
      options: [
        { value: 'Mercedes', label: 'Mercedes', count: 552, share: 0.43 },
        { value: 'McLaren', label: 'McLaren', count: 308, share: 0.24 },
        { value: 'Ferrari', label: 'Ferrari', count: 180, share: 0.14 },
        { value: 'Haas', label: 'Haas', count: 129, share: 0.1 },
        { value: 'Williams', label: 'Williams', count: 90, share: 0.07 },
      ],
    },
    {
      id: 'clangerTeam',
      label: 'CLANGER TEAM',
      before: [
        { value: 'Cadillac', label: 'Cadillac', count: 461, share: 0.31 },
      ],
      options: [
        { value: 'Alpine', label: 'Alpine', count: 398, share: 0.31 },
        { value: 'Cadillac', label: 'Cadillac', count: 295, share: 0.23 },
        {
          value: 'Aston Martin',
          label: 'Aston Martin',
          count: 244,
          share: 0.19,
        },
        { value: 'Audi', label: 'Audi', count: 180, share: 0.14 },
        { value: 'Haas', label: 'Haas', count: 167, share: 0.13 },
      ],
    },
  ],
};

function ChinwagDemoPage() {
  const { allowed } = Route.useLoaderData();

  if (!allowed) {
    return <NotFoundPage />;
  }

  return (
    <ChinwagShell>
      <ChinwagResultsBoard data={DEMO} sample />
    </ChinwagShell>
  );
}
