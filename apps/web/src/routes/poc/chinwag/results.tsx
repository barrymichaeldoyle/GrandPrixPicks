import { api } from '@convex-generated/api';
import { createFileRoute } from '@tanstack/react-router';

import { useQuery } from '@/integrations/convex/query';
import { isCreatorPollPreviewAllowed } from '@/lib/creatorPollGate';

import { NotFoundPage } from '@/routes/__root';

import { chinwagHead } from './-components/chinwagHead';
import { ChinwagResultsBoard } from './-components/ChinwagResultsBoard';
import { ChinwagShell } from './-components/ChinwagShell';

const POLL_SLUG = 'chinwag';

export const Route = createFileRoute('/poc/chinwag/results')({
  component: ChinwagResultsPage,
  validateSearch: (search: Record<string, unknown>): { k?: string } => ({
    k: typeof search.k === 'string' ? search.k : undefined,
  }),
  loaderDeps: ({ search }) => ({ k: search.k }),
  loader: async ({ deps }) => ({
    allowed: await isCreatorPollPreviewAllowed(deps.k),
  }),
  head: () => chinwagHead('Chinwag results'),
});

/** The live board, off the same Convex subscription the vote page uses. */
function ChinwagResultsPage() {
  const { allowed } = Route.useLoaderData();
  const results = useQuery(api.creatorPolls.getResults, { slug: POLL_SLUG });

  if (!allowed || results === null) {
    return <NotFoundPage />;
  }

  return (
    <ChinwagShell>
      <ChinwagResultsBoard data={results} />
    </ChinwagShell>
  );
}
