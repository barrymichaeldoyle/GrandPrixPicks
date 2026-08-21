import * as Sentry from '@sentry/tanstackstart-react';
import { Link, useRouter } from '@tanstack/react-router';
import { Flag, Home, LifeBuoy, RefreshCw, ShieldCheck } from 'lucide-react';
import { useEffect, useRef } from 'react';

import { Button } from '@/components/Button/Button';

interface ErrorFallbackProps {
  error: unknown;
  reset?: () => void;
  reportToSentry?: boolean;
}

function getErrorObject(error: unknown): Error {
  if (error instanceof Error) {
    return error;
  }
  return new Error(String(error));
}

export function ErrorFallback({
  error,
  reset,
  reportToSentry = true,
}: ErrorFallbackProps) {
  const router = useRouter();
  const clipRef = useRef<HTMLVideoElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const errorObj = getErrorObject(error);

  // Depends on the raw `error`, not on `errorObj`. `getErrorObject` builds a
  // fresh Error for anything that isn't already one, so keying this on the
  // derived object re-reported to Sentry on every render whenever something
  // threw a string or a plain object.
  useEffect(() => {
    if (!reportToSentry) {
      return;
    }

    Sentry.captureException(getErrorObject(error), {
      tags: {
        location:
          typeof window !== 'undefined' ? window.location.pathname : 'unknown',
        component: 'ErrorFallback',
      },
    });
  }, [error, reportToSentry]);

  // An errored route keeps the title and meta of the page it failed to render,
  // so without this a crawler can index "It's broken" under a real URL. Same
  // approach as NotFoundPage, which has the identical problem.
  useEffect(() => {
    const previousTitle = document.title;
    document.title = 'Something went wrong | Grand Prix Picks';
    const meta = document.createElement('meta');
    meta.name = 'robots';
    meta.content = 'noindex';
    document.head.appendChild(meta);
    return () => {
      document.title = previousTitle;
      meta.remove();
    };
  }, []);

  // Swapping in this fallback replaces the page silently: nothing is announced,
  // and focus is left on whatever the unmounted content had. Moving it to the
  // heading tells a screen reader user that something changed, and says what.
  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  // Playback starts here rather than via an `autoplay` attribute so that
  // reduced-motion users never see a frame of movement, instead of the clip
  // starting and then being paused a tick later.
  useEffect(() => {
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      return;
    }
    // Autoplay policy can still refuse. The poster frame is the fallback, so
    // there is nothing to recover from.
    void clipRef.current?.play().catch(() => {});
  }, []);

  function handleRetry() {
    if (reset) {
      reset();
    } else {
      router.invalidate();
    }
  }

  return (
    // The testid is what the signed-out smoke sweep asserts the absence of on
    // every public route. Matching on copy instead would mean a reworded
    // heading silently disarms the check.
    <div
      data-testid="error-fallback"
      className="mx-auto flex min-h-[60vh] w-full max-w-3xl flex-col justify-center px-4 py-16"
    >
      {/* Copy and clip sit side by side from `sm` up, which is what stops the
          three blocks below from each ending at a different right edge. Source
          order is copy then clip, so stacking on mobile drops the clip under
          the column it sits beside on desktop, no `order` overrides needed. */}
      <div className="flex flex-col gap-8 sm:flex-row sm:items-center sm:gap-10">
        {/* Grows to fill the row so the clip stays pinned to the right edge and
            lines up with the rule below. Without this the column is only as
            wide as its longest line, and the row packs left leaving the clip
            short of the edge. */}
        <div className="min-w-0 sm:flex-1">
          {/* Utilities are spelled out rather than using `gpp-label`, which
              hard-sets the muted colour and beats a colour utility beside it.
              `racing-red` is the system's one true red, so the flag reads as
              the real thing instead of the amber `error` resolves to. */}
          <p className="flex items-center gap-2 text-xs font-semibold tracking-label text-racing-red uppercase">
            <Flag className="h-3.5 w-3.5 fill-current" aria-hidden />
            Red flag
          </p>

          {/* `tabIndex={-1}` makes this focusable programmatically without
              adding it to the tab order. The ring is suppressed because focus
              here is announced, not user-initiated. */}
          <h1
            ref={headingRef}
            tabIndex={-1}
            className="font-title mt-3 text-4xl font-light text-text focus:outline-none sm:text-5xl"
          >
            It's broken
          </h1>

          {/* Deliberately no error message: even the mapped, "user facing"
              strings read as diagnostics to a player mid-picks. The technical
              detail lives in Sentry and in the dev-only block below. */}
          <p className="gpp-reading-copy mt-4 text-text-muted">
            Something on our side stopped working.
            <br />
            It isn't anything you did.
          </p>
        </div>

        {/* The top margin is the caption bar's height, and it exists to cancel
            the caption out of the centring. Flexbox centres the whole figure,
            but the eye centres on the video and reads the caption as chrome,
            so without this the clip sits visibly high against the copy: the
            margin box gains 38px at the top, which moves the frame down by
            half that, exactly the offset being corrected. */}
        <figure className="w-full shrink-0 overflow-hidden rounded-lg border border-border sm:mt-9.5 sm:w-80">
          <video
            ref={clipRef}
            className="block aspect-video w-full object-cover"
            src="/media/its-broken.mp4"
            poster="/media/its-broken-poster.jpg"
            // Neither `autoplay` nor `loop`, both deliberate. Auto-starting
            // motion that runs past five seconds needs a pause control under
            // WCAG 2.2.2; playing this 2.6s clip exactly once stays under that
            // threshold, so the criterion does not apply. It comes to rest on
            // the last frame, which is the one holding the punchline.
            muted
            playsInline
            // Decorative: the caption below carries the meaning for screen
            // readers, so the clip itself stays out of the accessibility tree.
            aria-hidden
            tabIndex={-1}
          />
          {/* Sentence case, not `gpp-label`: uppercase is reserved for micro
              labels, and a full sentence set in it reads as shouting. */}
          <figcaption className="border-t border-border bg-surface px-4 py-2.5 text-xs text-text-muted">
            Lando Norris, saying it better than we can.
          </figcaption>
        </figure>
      </div>

      {/* A hairline rule on the page background rather than a bordered panel:
          the clip is already a contained block, and stacking a second card
          under it is the nested-card look this direction removes.

          Unconditional, and it stays true even when `reportToSentry` is false:
          that flag exists only for ErrorBoundary, which has already captured
          the error in componentDidCatch by the time this renders. If a caller
          ever renders this fallback with nothing reporting behind it, this
          promise has to move behind a prop. */}
      <div className="mt-10 flex items-start gap-3 border-t border-border pt-5">
        <ShieldCheck
          className="mt-0.5 h-4 w-4 shrink-0 text-accent"
          strokeWidth={1.5}
          aria-hidden
        />
        <p className="gpp-reading-meta text-text-muted">
          <span className="font-medium text-text">
            This has been logged automatically.
          </span>
          <br />
          You don't need to report it. We can already see what went wrong and
          we're working on a fix.
        </p>
      </div>

      {/* Last, deliberately: the page reads as what happened, then that it is
          already in hand, and only then what you can do about it. Offering the
          retry before the reassurance made it look like the fix was the
          reader's job. */}
      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <Button onClick={handleRetry} leftIcon={RefreshCw} variant="primary">
          Try again
        </Button>
        <Button asChild leftIcon={Home} variant="secondary">
          <Link to="/">Go home</Link>
        </Button>
        {/* Tertiary on purpose. We've said they don't need to report it, so
            this is the escape hatch for when retrying keeps failing, not an
            invitation to file a ticket for a one-off. */}
        <Button asChild leftIcon={LifeBuoy} variant="text">
          <Link to="/support">Still stuck?</Link>
        </Button>
      </div>

      {import.meta.env.DEV && (
        <details className="mt-8 text-left">
          <summary className="cursor-pointer text-sm text-text-muted hover:text-text">
            Error details (dev only)
          </summary>
          <pre className="mt-2 overflow-auto rounded-lg bg-surface-muted p-4 text-xs text-error">
            {errorObj.stack || errorObj.message}
          </pre>
        </details>
      )}
    </div>
  );
}
