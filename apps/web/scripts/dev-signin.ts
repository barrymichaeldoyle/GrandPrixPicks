/**
 * Prints a one-time Clerk sign-in URL for a shared dev account.
 *
 * Used to give Claude Code / scripted browsers an authenticated session
 * without going through the email/OAuth modal flow. The token expires in
 * 300 seconds — re-run to refresh.
 *
 * Usage:
 *   pnpm --filter @grandprixpicks/web dev:signin                  # uses default namespace
 *   pnpm --filter @grandprixpicks/web dev:signin custom-namespace # different test user
 *
 * Then open the printed URL in your browser (or have Playwright navigate to it).
 */
import {
  createE2EClerkIdentity,
  createE2EClerkSignInTokenUrl,
} from '../tests/e2e/helpers/clerk.ts';

const namespace = process.argv[2] ?? 'claude-dev-signin';
const redirect = process.argv[3] ?? '/';

const identity = await createE2EClerkIdentity(namespace);
const url = await createE2EClerkSignInTokenUrl(identity.userId, redirect);
console.log(url);
