import { Link } from '@tanstack/react-router';
import { Loader2, type LucideIcon } from 'lucide-react';

import { Button } from '@/components/Button/Button';
import { NoticeCard } from '@/components/NoticeCard';
import {
  useClerkRuntimeControl,
  useClerkWarmHandlers,
} from '@/integrations/clerk/runtime-control';

type SignInPromptProps = {
  icon?: LucideIcon;
  /** What this page is, as a heading. Not "Sign In Required" on every page. */
  title: string;
  /** One sentence on what the page does once you are signed in. */
  description: string;
  /** Label on the primary button, e.g. "Sign in to see your notifications". */
  actionLabel?: string;
  /** Width constraint for the surrounding column. */
  maxWidthClass?: string;
};

/**
 * The signed-out state for a gated route.
 *
 * Three things it deliberately does not do. It does not redirect: every one of
 * these URLs is a deep-link target (push notifications, receipts, league
 * invites), and bouncing to `/` throws away where the person was going. It does
 * not import Clerk: sign-in goes through `requestSignIn`, so an anonymous
 * visitor never pays for the runtime unless they ask for it, and this renders
 * from SSR instead of waiting on Clerk's boot. And it does not dead-end: these
 * pages are frequently a first touch from a shared link, so there is always
 * somewhere public to go next.
 */
export function SignInPrompt({
  icon,
  title,
  description,
  actionLabel = 'Sign in',
  maxWidthClass = 'max-w-3xl',
}: SignInPromptProps) {
  const { requestSignIn, signInPending } = useClerkRuntimeControl();
  const warmHandlers = useClerkWarmHandlers();

  return (
    <div className="min-h-full bg-page">
      <div className={`mx-auto ${maxWidthClass} px-4 py-6`}>
        <NoticeCard
          level="page"
          icon={icon}
          title={title}
          description={description}
          action={
            <Button
              size="sm"
              {...warmHandlers}
              onClick={() => requestSignIn()}
              aria-busy={signInPending || undefined}
            >
              <span className="relative inline-flex items-center justify-center">
                <span className={signInPending ? 'invisible' : undefined}>
                  {actionLabel}
                </span>
                {signInPending ? (
                  <Loader2
                    size={16}
                    className="absolute top-1/2 left-1/2 shrink-0 -translate-x-1/2 -translate-y-1/2 animate-spin"
                    aria-hidden="true"
                  />
                ) : null}
              </span>
            </Button>
          }
        />

        <nav
          aria-label="Public pages"
          className="mt-8 border-t border-border pt-6"
        >
          <p className="text-xs font-semibold tracking-label text-text-muted uppercase">
            No account yet?
          </p>
          <ul className="mt-3 grid gap-2 text-sm sm:grid-cols-2 [&_a]:text-accent [&_a:hover]:text-accent-hover">
            <li>
              <Link to="/how-to-play">How the game works</Link>
            </li>
            <li>
              <Link to="/races">2026 F1 race calendar</Link>
            </li>
            <li>
              <Link to="/leaderboard">Season leaderboard</Link>
            </li>
            <li>
              <Link
                to="/guides/$guideSlug"
                params={{ guideSlug: 'how-to-predict-f1-top-five' }}
              >
                How to predict an F1 top five
              </Link>
            </li>
          </ul>
        </nav>
      </div>
    </div>
  );
}
