/**
 * Prints a one-time Clerk sign-in URL for a shared dev account.
 *
 * Used to give Claude Code / scripted browsers an authenticated session
 * without going through the email/OAuth modal flow. The token expires in
 * 300 seconds — re-run to refresh.
 *
 * Usage:
 *   pnpm --filter @grandprixpicks/web dev:signin                  # rich populated scenario (default)
 *   pnpm --filter @grandprixpicks/web dev:signin in-leagues       # follows nobody, joined a league
 *   pnpm --filter @grandprixpicks/web dev:signin solo             # no follows, no leagues
 *   pnpm --filter @grandprixpicks/web dev:signin stale            # follows users with no activity
 *   pnpm --filter @grandprixpicks/web dev:signin <namespace>      # any custom namespace
 *
 * Scenario state is set up by `pnpm dev:setup-scenarios` — run that once first.
 *
 * Then open the printed URL in your browser (or have Playwright navigate to it).
 */
import {
  createE2EClerkIdentity,
  createE2EClerkSignInTokenUrl,
} from '../tests/e2e/helpers/clerk.ts';

const SCENARIO_NAMESPACES: Record<string, string> = {
  rich: 'claude-dev-signin',
  'in-leagues': 'claude-dev-in-leagues',
  solo: 'claude-dev-solo',
  stale: 'claude-dev-stale',
};

const arg = process.argv[2] ?? 'rich';
const namespace = SCENARIO_NAMESPACES[arg] ?? arg;
const redirect = process.argv[3] ?? '/';

const identity = await createE2EClerkIdentity(namespace);
const url = await createE2EClerkSignInTokenUrl(identity.userId, redirect);
console.log(url);
