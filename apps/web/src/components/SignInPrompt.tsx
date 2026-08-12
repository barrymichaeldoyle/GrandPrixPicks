import { Link } from '@tanstack/react-router';
import type { ReactNode } from 'react';
import { ArrowRight, Loader2 } from 'lucide-react';

import { Button } from '@/components/Button/Button';
import { NextEventPanel } from '@/components/NextEventPanel';
import {
  useClerkRuntimeControl,
  useClerkWarmHandlers,
} from '@/integrations/clerk/runtime-control';

type SignInPromptProps = {
  /** Micro label above the title. Names the page, not the gate. */
  eyebrow: string;
  title: string;
  /** One sentence on what the page does once you are signed in. */
  description: string;
  actionLabel?: string;
  /**
   * Quiet context under the title: member counts, a round, a season. Use it
   * when the page is about one named thing and the reader needs to know they
   * have arrived at the right one.
   */
  meta?: ReactNode;
  /**
   * What this page holds, as rows. These are the page's real contents, not
   * decoration: the panel is only worth its space because a reader can tell
   * from it whether signing in gets them what they came for.
   */
  behind: readonly string[];
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
 *
 * A gate is a container awaiting input, so the panel naming what is behind it
 * takes the system's dashed hairline. That is the whole withheld treatment: a
 * centred card with an icon over "Sign In Required" made a page with plenty
 * behind it look like it had nothing.
 */
export function SignInPrompt({
  eyebrow,
  title,
  description,
  actionLabel = 'Sign in',
  meta,
  behind,
}: SignInPromptProps) {
  const { requestSignIn, signInPending } = useClerkRuntimeControl();
  const warmHandlers = useClerkWarmHandlers();

  return (
    <main className="min-h-full bg-page">
      {/* Same frame as every other page container, so the stripe, the panel
          and the footer columns all land on one left edge. */}
      <div className="mx-auto w-full max-w-(--page-max) px-4 py-10 sm:py-14">
        {/* Same rail track as the grid below, so the next-event panel and the
            public links form one column down the right of the page. */}
        <div className="grid gap-x-12 gap-y-10 lg:grid-cols-[minmax(0,1fr)_20rem]">
          {/* One stripe per container, on the thing that matters most. */}
          <header className="gpp-stripe pl-5">
            <p className="gpp-label">{eyebrow}</p>
            <h1 className="font-title mt-2 max-w-3xl text-4xl font-light text-balance text-text sm:text-5xl">
              {title}
            </h1>
            {meta ? (
              <p className="gpp-reading-meta mt-2 text-text-muted">{meta}</p>
            ) : null}
            <p className="gpp-reading-copy mt-4 max-w-xl text-pretty text-text-muted">
              {description}
            </p>
            <div className="mt-7 flex flex-wrap items-center gap-x-4 gap-y-3">
              <Button
                size="md"
                /* Suppresses the header's own chartreuse CTA (see styles.css):
                 the accent marks one action per screen, and on this page the
                 action is here. */
                data-landing-hero-cta
                {...warmHandlers}
                onClick={() => requestSignIn()}
                aria-busy={signInPending || undefined}
              >
                {/* Stays enabled while Clerk boots: a disabled button reads as
                  "this broke" rather than "this is opening". */}
                <span className="relative inline-flex items-center justify-center">
                  <span className={signInPending ? 'invisible' : undefined}>
                    {actionLabel}
                  </span>
                  {signInPending ? (
                    <Loader2
                      size={20}
                      className="absolute top-1/2 left-1/2 shrink-0 -translate-x-1/2 -translate-y-1/2 animate-spin"
                      aria-hidden="true"
                    />
                  ) : null}
                </span>
              </Button>
              {/* The one exit that is not a dead end for someone who has never
                heard of this. `/` is the only page where a logged-out visitor
                can build a real pick, and it was reachable from here only via
                the wordmark: the header's "How it works" goes to
                /how-to-play, which is the rules, not the offer. */}
              {/* No left padding until the buttons sit side by side: stacked on
                a phone, the text variant's px-5 pushed its label inboard of
                the primary button's edge and the column stopped reading as a
                column. */}
              <Button
                asChild
                variant="text"
                size="md"
                rightIcon={ArrowRight}
                className="!px-0 sm:!px-5"
              >
                <Link to="/">Try a pick without an account</Link>
              </Button>
            </div>
            <p className="gpp-reading-meta mt-3 text-text-disabled">
              Free to play. No card needed.
            </p>
          </header>

          <NextEventPanel />
        </div>

        {/* Echoes the signed-in page's own shape: a content column with a
            narrower rail beside it, rather than a narrow strip in a wide frame
            with half the page empty. */}
        <div className="mt-12 grid gap-x-12 gap-y-12 lg:grid-cols-[minmax(0,1fr)_20rem]">
          <section>
            <h2 className="gpp-label">Behind sign-in</h2>
            {/* Dashed hairline is the system's "awaiting input", which is what
                a gate is. That carries the withheld meaning on its own: an
                earlier version put a mono "--" in a right-hand column to stand
                for the figure you would see signed in, and it just read as
                four rows of stray punctuation. */}
            <ul className="gpp-empty mt-3 divide-y divide-border rounded-lg">
              {behind.map((row) => (
                <li key={row} className="px-4 py-3 text-sm text-text">
                  {row}
                </li>
              ))}
            </ul>
          </section>

          <nav aria-labelledby="signed-out-public-pages">
            <h2 id="signed-out-public-pages" className="gpp-label">
              Open to everyone
            </h2>
            <ul className="mt-3 border-t border-border">
              {[
                { to: '/how-to-play', label: 'How the game works' },
                { to: '/races', label: '2026 F1 race calendar' },
                { to: '/leaderboard', label: 'Season leaderboard' },
                { to: '/f1-standings', label: 'F1 championship standings' },
              ].map((link) => (
                <li key={link.to} className="border-b border-border">
                  <Link
                    to={link.to}
                    className="block py-3 text-sm text-text-muted transition-colors hover:text-accent"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </div>
    </main>
  );
}
