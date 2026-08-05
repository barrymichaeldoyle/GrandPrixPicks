import { api } from '@convex-generated/api';
import type { Id } from '@convex-generated/dataModel';
import type { Meta, StoryObj } from '@storybook/react';

import { fakeId } from '@/storybook/fixtures';
import {
  buildStorybookConvexMocks,
  StorybookMockProviders,
} from '@/storybook/mockAppRuntime';

import { H2HPicksDialog } from './H2HPicksDialog';

type Duel = {
  matchupId: string;
  team: string;
  driver1: {
    _id: string;
    code: string;
    displayName: string;
    team: string;
    nationality: string;
  };
  driver2: {
    _id: string;
    code: string;
    displayName: string;
    team: string;
    nationality: string;
  };
  predictedWinnerId: string;
  actualWinnerId: string | null;
  correct: boolean;
  hasResult: boolean;
};

function duel(
  team: string,
  first: [code: string, name: string, nationality: string],
  second: [code: string, name: string, nationality: string],
  outcome: { picked: 1 | 2; correct: boolean },
): Duel {
  const driver1 = {
    _id: first[0],
    code: first[0],
    displayName: first[1],
    team,
    nationality: first[2],
  };
  const driver2 = {
    _id: second[0],
    code: second[0],
    displayName: second[1],
    team,
    nationality: second[2],
  };
  const predictedWinnerId = outcome.picked === 1 ? driver1._id : driver2._id;
  const otherId = outcome.picked === 1 ? driver2._id : driver1._id;

  return {
    matchupId: team,
    team,
    driver1,
    driver2,
    predictedWinnerId,
    actualWinnerId: outcome.correct ? predictedWinnerId : otherId,
    correct: outcome.correct,
    hasResult: true,
  };
}

// Deliberately not in constructors' order: the dialog sorts them, because the
// query hands back whatever order the player's predictions were written in.
const duels: Duel[] = [
  duel(
    'McLaren',
    ['NOR', 'Lando Norris', 'GB'],
    ['PIA', 'Oscar Piastri', 'AU'],
    {
      picked: 1,
      correct: true,
    },
  ),
  duel(
    'Red Bull Racing',
    ['VER', 'Max Verstappen', 'NL'],
    ['HAD', 'Isack Hadjar', 'FR'],
    { picked: 1, correct: true },
  ),
  duel(
    'Ferrari',
    ['LEC', 'Charles Leclerc', 'MC'],
    ['HAM', 'Lewis Hamilton', 'GB'],
    { picked: 2, correct: false },
  ),
  duel(
    'Mercedes',
    ['RUS', 'George Russell', 'GB'],
    ['ANT', 'Kimi Antonelli', 'IT'],
    { picked: 2, correct: true },
  ),
  duel(
    'Aston Martin',
    ['ALO', 'Fernando Alonso', 'ES'],
    ['STR', 'Lance Stroll', 'CA'],
    { picked: 1, correct: true },
  ),
  duel(
    'Alpine',
    ['GAS', 'Pierre Gasly', 'FR'],
    ['COL', 'Franco Colapinto', 'AR'],
    {
      picked: 1,
      correct: true,
    },
  ),
  duel('Williams', ['ALB', 'Alex Albon', 'TH'], ['SAI', 'Carlos Sainz', 'ES'], {
    picked: 2,
    correct: true,
  }),
  duel(
    'Racing Bulls',
    ['LAW', 'Liam Lawson', 'NZ'],
    ['LIN', 'Arvid Lindblad', 'GB'],
    { picked: 1, correct: true },
  ),
  duel(
    'Audi',
    ['HUL', 'Nico Hülkenberg', 'DE'],
    ['BOR', 'Gabriel Bortoleto', 'BR'],
    {
      picked: 2,
      correct: false,
    },
  ),
  duel('Haas', ['OCO', 'Esteban Ocon', 'FR'], ['BEA', 'Oliver Bearman', 'GB'], {
    picked: 1,
    correct: true,
  }),
  duel(
    'Cadillac',
    ['BOT', 'Valtteri Bottas', 'FI'],
    ['PER', 'Sergio Pérez', 'MX'],
    {
      picked: 1,
      correct: true,
    },
  ),
];

function renderDialog(loaded: boolean) {
  return (
    <StorybookMockProviders
      auth={{ isLoaded: true, isSignedIn: true }}
      convex={buildStorybookConvexMocks({
        // The loading story mocks nothing, so the query stays undefined.
        queries: loaded ? [[api.h2h.getH2HPicksForFeedItem, duels]] : [],
      })}
    >
      <H2HPicksDialog
        userId={fakeId<'users'>('viewer') as Id<'users'>}
        raceId={fakeId<'races'>('miami-gp') as Id<'races'>}
        sessionType="race"
        displayName="Fast Lapper"
        onClose={() => {}}
      />
    </StorybookMockProviders>
  );
}

const meta = {
  title: 'Feed/H2HPicksDialog',
  parameters: { layout: 'fullscreen' },
} satisfies Meta;

export default meta;
type Story = StoryObj;

export const AllElevenDuels: Story = {
  render: () => renderDialog(true),
};

/**
 * The teams and the "vs" are known before the data arrives — the grid does not
 * change mid-season and the rows are sorted into a fixed order — so only the
 * duel itself is skeletonised. Compare against `AllElevenDuels`: nothing but
 * the badges should move when it resolves.
 */
export const Loading: Story = {
  render: () => renderDialog(false),
};
