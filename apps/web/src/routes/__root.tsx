import { TanStackDevtools } from '@tanstack/react-devtools';
import type { QueryClient } from '@tanstack/react-query';
import {
  createRootRouteWithContext,
  HeadContent,
  Link,
  Scripts,
  useLocation,
} from '@tanstack/react-router';
import { TanStackRouterDevtoolsPanel } from '@tanstack/react-router-devtools';
import { ConvexProviderWithAuth } from 'convex/react';
import { Flag, Home, Loader2 } from 'lucide-react';
import type { PropsWithChildren } from 'react';
import {
  lazy,
  startTransition,
  Suspense,
  useEffect,
  useRef,
  useState,
} from 'react';

import { AppMotionProvider } from '@/components/AppMotionProvider';
import { ErrorBoundary } from '@/components/error/ErrorBoundary';
import { Footer } from '@/components/Footer';
import { Header } from '@/components/Header';
import { MobileTabBar } from '@/components/MobileTabBar';
import { OfflineBanner } from '@/components/OfflineBanner';
import { PendingPickSubmitter } from '@/components/PendingPickSubmitter';
import {
  AuthCurtainHost,
  useAuthCurtain,
} from '@/integrations/clerk/auth-curtain';
import {
  fetchInitialAuth,
  InitialAuthProvider,
} from '@/integrations/clerk/initial-auth';
import { isClerkFreeRoute } from '@/integrations/clerk/clerk-free-routes';
import { preloadClerkRuntime } from '@/integrations/clerk/preload';
import { hasClerkSessionCookie } from '@/integrations/clerk/session-cookie';
import {
  ClerkRuntimeControlProvider,
  useClerkRuntimeControl,
} from '@/integrations/clerk/runtime-control';
import { useViewerSession } from '@/integrations/clerk/useViewerSession';
import { ViewerSessionProvider } from '@/integrations/clerk/viewer-session-context';
import { convex } from '@/integrations/convex/client';
import { AppConvexQueryCache } from '@/integrations/convex/queryCache';
import TanStackQueryDevtools from '@/integrations/tanstack-query/devtools';
import { clerkFrontendApiOrigin } from '@/lib/clerkOrigin';
import { ensureAdSenseLoaded } from '@/lib/adsense';
import { deferUntilAfterLoad } from '@/lib/deferUntilAfterLoad';
import { showsGlobalFooter } from '@/lib/globalFooter';
import { isNotificationArrival } from '@/lib/notificationArrival';
import { CURRENT_SEASON, siteConfig } from '@/lib/site';
import appCss from '@/styles.css?url';

const DeferredShellFeatures = lazy(() =>
  import('@/components/DeferredGlobalFeatures').then((module) => ({
    default: module.DeferredShellFeatures,
  })),
);
const DeferredObservabilityUserSync = lazy(() =>
  import('@/integrations/clerk/runtime-bundle').then((module) => ({
    default: module.DeferredObservabilityUserSync,
  })),
);
const DeferredPredictionBanner = lazy(() =>
  import('@/integrations/clerk/runtime-bundle').then((module) => ({
    default: module.DeferredPredictionBanner,
  })),
);
const UnreadTabIndicator = lazy(() =>
  import('@/integrations/clerk/runtime-bundle').then((module) => ({
    default: module.UnreadTabIndicator,
  })),
);
const AuthenticatedAppRuntime = lazy(() =>
  import('@/integrations/clerk/runtime-bundle').then((module) => ({
    default: module.AuthenticatedAppRuntime,
  })),
);
const ClerkSignInOverlay = lazy(() =>
  import('@/integrations/clerk/runtime-bundle').then((module) => ({
    default: module.ClerkSignInOverlay,
  })),
);

interface MyRouterContext {
  queryClient: QueryClient;
}

/**
 * Warmed at document parse so the first Sign in click does not open with a DNS
 * lookup and a TLS handshake. Clerk is deliberately absent from the landing
 * page's first paint, which makes its origin completely cold at the exact
 * moment the visitor is waiting on it.
 */
const CLERK_ORIGIN = clerkFrontendApiOrigin(
  import.meta.env.VITE_CLERK_PUBLISHABLE_KEY,
);

/**
 * How hard to warm Clerk's origin, decided by whether the server already knows
 * this visitor is signed in.
 *
 * A signed-in document mounts Clerk during hydration, so the request is a
 * certainty and `preconnect` is paid back in full. A signed-out document may
 * never touch Clerk at all: most visitors read the landing page and leave, and
 * a speculative socket costs them a DNS lookup, a TCP handshake and a TLS
 * negotiation to a third origin during the exact window the fonts and the app
 * chunk are competing for bandwidth. Chrome then closes it unused after ~10s,
 * which is what Lighthouse reports as an unused preconnect.
 *
 * So signed-out visitors get `dns-prefetch` only: it resolves the name without
 * opening anything, which is the half of the cold-start cost worth paying up
 * front. The other half is covered by `useClerkWarmHandlers`, which upgrades to
 * a real connection on pointerenter / focus / touchstart — all of which fire
 * before the click that needs it.
 */
function clerkOriginHints(isSignedIn: boolean) {
  if (!CLERK_ORIGIN) {
    return [];
  }
  return isSignedIn
    ? [
        {
          rel: 'preconnect',
          href: CLERK_ORIGIN,
          crossOrigin: 'anonymous' as const,
        },
        { rel: 'dns-prefetch', href: CLERK_ORIGIN },
      ]
    : [{ rel: 'dns-prefetch', href: CLERK_ORIGIN }];
}

export const Route = createRootRouteWithContext<MyRouterContext>()({
  // `loaderData` is undefined while the root loader is still in flight, which
  // is the signed-out shape anyway: the cheaper hint is the safe default.
  head: ({ loaderData }) => ({
    meta: [
      { charSet: 'utf-8' },
      {
        name: 'viewport',
        content: 'width=device-width, initial-scale=1, viewport-fit=cover',
      },
      { title: siteConfig.title },
      { name: 'description', content: siteConfig.description },
      { name: 'theme-color', content: siteConfig.themeColor },

      // Open Graph / Twitter Card
      // NOTE: og:title, og:description, og:image (and twitter: equivalents)
      // are set per-route, not here. HeadContent renders all matched routes'
      // meta without dedup, so values here would shadow child overrides.
      // og:url, twitter:url, and canonical are set per-route so each page
      // has its own canonical URL. Do NOT add them here — HeadContent merges
      // all matched route head() results without dedup.
      { property: 'og:type', content: 'website' },
      { property: 'og:site_name', content: siteConfig.title },
      {
        property: 'og:image:alt',
        content: `Grand Prix Picks: make F1 predictions and climb the ${CURRENT_SEASON} leaderboard.`,
      },
      { name: 'twitter:card', content: 'summary_large_image' },
      {
        name: 'twitter:image:alt',
        content: `Grand Prix Picks: make F1 predictions and climb the ${CURRENT_SEASON} leaderboard.`,
      },
      { name: 'twitter:site', content: siteConfig.social.x.handle },
    ],
    links: [
      ...clerkOriginHints(loaderData?.initialAuth.isSignedIn ?? false),
      // Only the faces that paint above the fold get preloaded, because a face
      // discovered from @font-face sits three hops deep (document → CSS →
      // font) and swaps in ~1.4s on a cold mobile load. Above the fold that is
      // Archivo for all UI text, Plex Mono 400 for the countdown and driver
      // codes (the countdown asks for 300, and with no 300 face CSS matching
      // resolves it up to 400), and Plex Mono 600 for the position badges.
      // Plex Mono 500 is points-only, which is always below the fold, so it
      // loads on demand.
      {
        rel: 'preload',
        href: '/fonts/archivo-latin-var.woff2',
        as: 'font',
        type: 'font/woff2',
        crossOrigin: 'anonymous',
      },
      {
        rel: 'preload',
        href: '/fonts/ibm-plex-mono-400-latin.woff2',
        as: 'font',
        type: 'font/woff2',
        crossOrigin: 'anonymous',
      },
      {
        rel: 'preload',
        href: '/fonts/ibm-plex-mono-600-latin.woff2',
        as: 'font',
        type: 'font/woff2',
        crossOrigin: 'anonymous',
      },
      { rel: 'stylesheet', href: appCss },
      {
        rel: 'icon',
        type: 'image/png',
        sizes: '32x32',
        href: '/favicon-32x32.png?v=20260729',
      },
      {
        rel: 'icon',
        type: 'image/png',
        sizes: '16x16',
        href: '/favicon-16x16.png?v=20260729',
      },
      {
        rel: 'apple-touch-icon',
        sizes: '180x180',
        href: '/apple-touch-icon.png?v=20260729',
      },
      { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg?v=20260729' },
      { rel: 'manifest', href: '/manifest.json?v=20260729' },
      // canonical link is set per-route — do NOT add a global one here
    ],
  }),

  // Resolve the viewer's signed-in/out state on the server (edge-safe Clerk
  // backend) so the header renders the correct nav on the first paint.
  loader: async () => {
    const initialAuth = await fetchInitialAuth();
    return { initialAuth };
  },

  notFoundComponent: NotFoundPage,
  shellComponent: RootDocument,
});

export function NotFoundPage() {
  useEffect(() => {
    document.title = 'Page Not Found | Grand Prix Picks';
    const meta = document.createElement('meta');
    meta.name = 'robots';
    meta.content = 'noindex';
    document.head.appendChild(meta);
    return () => {
      meta.remove();
    };
  }, []);

  return (
    <div className="flex min-h-[50vh] items-center justify-center px-4">
      <div className="w-full max-w-md text-center">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-warning-muted">
          <Flag className="h-8 w-8 text-warning" aria-hidden="true" />
        </div>

        <h1 className="mb-2 text-2xl font-semibold text-text">
          Page not found
        </h1>

        <p className="mb-8 text-text-muted">
          Looks like you've taken a wrong turn. This page doesn't exist or has
          been moved.
        </p>

        <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <Link
            to="/"
            className="inline-flex items-center gap-2 rounded-lg bg-accent px-6 py-2.5 font-semibold text-text-on-accent transition-colors hover:bg-accent-hover"
          >
            <Home className="h-4 w-4" aria-hidden="true" />
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function RootDocument({ children }: PropsWithChildren) {
  const { initialAuth } = Route.useLoaderData();
  const pathname = useLocation({ select: (location) => location.pathname });

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(console.error);
    }
  }, []);

  useEffect(() => {
    // Every route, landing page included. This used to skip `/` to keep the
    // conversion page free of third-party work, but "ad code not found" is its
    // own AdSense rejection reason and the home page is the first thing a
    // reviewer opens — a risk worth more than the bytes after a previous
    // rejection. The cost also fell sharply: the StartupBar widget this page
    // used to carry was 232 KB plus the 163 KB of Google Tag Manager it pulled
    // in, and both are gone.
    //
    // This is the loader only. Placement belongs to `AdSlot`, which loads the
    // same script on its own when a slot approaches the viewport, so this call
    // exists purely to keep the code findable on every route while the account
    // is under review. Both go through `ensureAdSenseLoaded`, so whichever
    // fires first wins.
    //
    // Delete this effect once ads are approved and placed: the slots then
    // become the only trigger, and a page with nothing to show stops paying
    // ~680 KB across four Google hosts for a script it cannot use.
    //
    // A bare `<ins class="adsbygoogle">` and an iframe show up on prod with
    // `<body>` as their parent, which the app never rendered. That is the
    // script's own bookkeeping, not a placement: Auto ads is off in the AdSense
    // console and stays off, so Google never chooses a position here. Every ad
    // on this site comes from an `AdSlot` somebody put there on purpose.
    //
    // Checked because the alternative mattered: Auto ads would inject its own
    // slots wherever it liked, including inside the picks flow, which is the
    // thing deliberate placement exists to prevent.
    //
    // It still waits for the document and an idle main thread, so it cannot
    // touch first paint either way.
    return deferUntilAfterLoad(() => {
      // Failure is fine and expected (ad blockers): the loader clears its own
      // state so a slot can retry, and nothing here depends on the result.
      void ensureAdSenseLoaded().catch(() => {});
    });
    // Once per document, not per navigation: the loader is global and the
    // route no longer decides whether it runs.
  }, []);

  return (
    <html lang="en" className="dark" data-theme="dark">
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html:
              'var __name=(target,value)=>Object.defineProperty(target,"name",{value,configurable:true});',
          }}
        />
        <HeadContent />
      </head>
      <body>
        {/* The screen-blended atmosphere field and grain overlay that used to
            sit here are gone: backgrounds are flat colour in this system, and
            a full-viewport gradient is the single biggest thing standing
            between the app and "calm". */}
        <AppMotionProvider>
          <InitialAuthProvider value={initialAuth}>
            <AppRuntimeBoundary
              initialSignedIn={initialAuth.isSignedIn}
              pathname={pathname}
            >
              <AuthenticatedDeferredFeature>
                <DeferredObservabilityUserSync />
              </AuthenticatedDeferredFeature>
              {/* Unread count in the tab title, tab icon and OS badge. Renders
                  no visible DOM, so it sits outside the shell rather than in
                  the header next to the bell it mirrors. */}
              <AuthenticatedDeferredFeature>
                <UnreadTabIndicator />
              </AuthenticatedDeferredFeature>
              <AppShell>
                <a
                  href="#main-content"
                  className="sr-only focus:not-sr-only focus:absolute focus:z-[9999] focus:rounded-sm focus:border focus:border-border focus:bg-surface focus:px-4 focus:py-2 focus:text-text"
                >
                  Skip to main content
                </a>
                <Header />
                <OfflineBanner />
                <DeferredFeaturesBoundary>
                  <DeferredShellFeatures />
                </DeferredFeaturesBoundary>
                <div className="flex min-h-0 flex-1 flex-col">
                  <AuthenticatedDeferredFeature>
                    <DeferredPredictionBanner />
                  </AuthenticatedDeferredFeature>
                  <main id="main-content" className="min-h-0 flex-1">
                    <ErrorBoundary>{children}</ErrorBoundary>
                  </main>
                  <ShellFooter />
                  {/* Signed-in only, and only below 844px — see MobileTabBar.
                      Inside AppShell so the sign-in curtain makes it inert
                      along with everything else behind the loader. */}
                  <MobileTabBar />
                  <TanStackDevtools
                    config={{
                      position: 'bottom-right',
                      openHotkey: ['CtrlOrMeta', 'A'],
                    }}
                    plugins={[
                      {
                        name: 'Tanstack Router',
                        render: <TanStackRouterDevtoolsPanel />,
                      },
                      TanStackQueryDevtools,
                    ]}
                  />
                </div>
              </AppShell>
            </AppRuntimeBoundary>
          </InitialAuthProvider>
        </AppMotionProvider>
        <Scripts />
      </body>
    </html>
  );
}

/**
 * The visible app frame.
 *
 * Only reason it is a component: while the sign-in curtain is up this has to go
 * `inert`, so nothing behind the loader is focusable or reachable by a screen
 * reader. `visibility: hidden` rather than `display: none` because the page
 * underneath must keep mounting and fetching (its curtain gates depend on it).
 * Outside a handoff `active` is false and this renders the same DOM it always
 * did, with no extra attributes.
 */
function AppShell({ children }: PropsWithChildren) {
  const { active } = useAuthCurtain();

  return (
    <div
      className={`relative z-10 flex min-h-[var(--app-viewport-height,100dvh)] flex-col overflow-x-clip pt-[var(--app-top-overlay-offset,0px)] pb-[var(--app-bottom-overlay-offset,0px)]${
        active ? ' invisible' : ''
      }`}
      inert={active}
    >
      {children}
    </div>
  );
}

/**
 * Signed-in Home carries Play / Legal / Support links in its right rail, so
 * the global footer would be a duplicate. Everywhere else keeps the full
 * footer. `RailFooterLinks` reads the same rule from the other side.
 */
function ShellFooter() {
  const pathname = useLocation({ select: (location) => location.pathname });
  const { isSignedIn } = useViewerSession();
  if (!showsGlobalFooter(pathname, isSignedIn)) {
    return null;
  }
  return <Footer />;
}

function AppRuntimeBoundary({
  children,
  initialSignedIn,
  pathname,
}: PropsWithChildren<{
  initialSignedIn: boolean;
  pathname: string;
}>) {
  /** A Clerk redirect landed back on this page; the handshake needs the runtime. */
  const [returningFromClerk, setReturningFromClerk] = useState(false);
  /**
   * Narrower than `returningFromClerk`: a `__clerk*` callback parameter is only
   * ever a sign-in handshake, whereas an accounts.dev referrer also covers a
   * hosted sign-*out*. Only the unambiguous case may raise the curtain, or a
   * signing-out visitor would stare at "Signing you in" until it timed out.
   */
  const [clerkHandshake, setClerkHandshake] = useState(false);
  /** The modal reported a session, so the page becomes the signed-in app. */
  const [signedInViaModal, setSignedInViaModal] = useState(false);
  /** Provider mounted but idle: pays the Clerk boot cost before the click. */
  const [runtimeWarm, setRuntimeWarm] = useState(false);
  const [signInOpen, setSignInOpen] = useState(false);
  /** Clicked, modal not on screen yet. Drives the button's own pending state. */
  const [signInPending, setSignInPending] = useState(false);
  const [afterSignInPath, setAfterSignInPath] = useState<
    '/leagues/create' | null
  >(null);

  // Signed-out visitors to public content render without Clerk on the page at
  // all; everyone else renders inside it from the first paint, exactly as
  // before. `initialSignedIn` is checked first so a signed-in viewer never
  // takes the anonymous branch on a route that happens to be public.
  const clerkRequired =
    initialSignedIn ||
    !isClerkFreeRoute(pathname) ||
    returningFromClerk ||
    signedInViaModal;

  /** Arrival is decided once per page load, not re-decided on every render. */
  const hasHandledArrivalRef = useRef(false);

  useEffect(() => {
    if (hasHandledArrivalRef.current) {
      return;
    }
    hasHandledArrivalRef.current = true;

    const fromClerk =
      document.referrer.length > 0 &&
      (() => {
        try {
          return new URL(document.referrer).hostname.endsWith('accounts.dev');
        } catch {
          return false;
        }
      })();
    const hasClerkCallback = Array.from(
      new URLSearchParams(window.location.search).keys(),
    ).some((key) => key.startsWith('__clerk'));

    if (fromClerk || hasClerkCallback) {
      setReturningFromClerk(true);
    }
    if (hasClerkCallback) {
      setClerkHandshake(true);
    }

    /**
     * A signed-out arrival on a link we mailed or pushed is a lapsed session,
     * not a new visitor: we only send those to people who already have an
     * account. Open sign-in for them straight away rather than making them find
     * the button, because the thing they came to see (their score, their picks,
     * their standing) is not on the page until they are signed in.
     *
     * Skipped mid-handshake — `hasClerkCallback` is Clerk handing the session
     * back, and re-opening sign-in on top of that fights the curtain.
     *
     * Both auth signals are checked because they fail in different directions:
     * `initialSignedIn` is the SSR cookie read, which is stale if the session
     * ended in another tab, and `hasClerkSessionCookie` is the live read, which
     * is the one that catches a session Clerk has not booted yet. Either
     * saying "signed in" is enough to leave the visitor alone.
     */
    if (
      !hasClerkCallback &&
      !fromClerk &&
      !initialSignedIn &&
      !hasClerkSessionCookie() &&
      isNotificationArrival(window.location.search)
    ) {
      requestSignIn();
    }
    // `initialSignedIn` is read, not watched: the ref above pins this to the
    // arrival, so a later change must not re-open sign-in.
  }, [initialSignedIn]);

  /**
   * Mount the provider without opening anything. Fired by hover/focus/touch on
   * a sign-in control, which lands a few hundred milliseconds before the click
   * and covers the runtime chunk, `clerk.browser.js`, `ui.browser.js`,
   * `/v1/environment` and `/v1/client` in that window.
   *
   * This is deliberately the *only* thing that pulls Clerk in. An idle preload
   * after load looked free and was not: the runtime chunk drags @clerk/react
   * behind it, so every landing visit downloaded and executed ~93 KB for a
   * visitor who might never sign in. It also bought nothing, because no real
   * click arrives without a pointerover, focus or touchstart in front of it.
   */
  function warmSignIn() {
    void preloadClerkRuntime();
    setRuntimeWarm(true);
  }

  function requestSignIn(nextPath?: '/leagues/create') {
    void preloadClerkRuntime();
    setAfterSignInPath(nextPath ?? null);
    setRuntimeWarm(true);
    setSignInPending(true);
    // Opening is a background handoff, not a navigation. A transition keeps the
    // page interactive underneath instead of letting the lazy boundary swap in
    // a fallback while the chunk resolves.
    startTransition(() => {
      setSignInOpen(true);
    });
  }

  function signInOpened() {
    setSignInPending(false);
  }

  const runtimeControl = {
    active: clerkRequired,
    openSignInOnMount: signInOpen,
    signInPending,
    afterSignInPath,
    requestSignIn,
    warmSignIn,
    signInOpened,
    clearAfterSignInPath: () => setAfterSignInPath(null),
  };

  if (!clerkRequired) {
    return (
      <ClerkRuntimeControlProvider value={{ ...runtimeControl, active: false }}>
        <ViewerSessionProvider
          value={{
            isSignedIn: false,
            confirmedSignedIn: false,
            isLoaded: true,
          }}
        >
          <ConvexProviderWithAuth
            client={convex}
            useAuth={useAnonymousConvexAuth}
          >
            <AppConvexQueryCache>{children}</AppConvexQueryCache>
            {/* Clerk's modal portals to document.body, so the provider does not
                have to wrap the page for it to render. Mounting it as a leaf
                sibling instead of a parent is the whole point: this slot can
                appear, boot and disappear without React unmounting a single
                node of the page behind it. The slot itself is always here so
                the children keep their position in this array. */}
            {runtimeWarm ? (
              <Suspense fallback={null}>
                <ClerkSignInOverlay
                  open={signInOpen}
                  onOpened={signInOpened}
                  onSignedIn={() => setSignedInViaModal(true)}
                />
              </Suspense>
            ) : null}
          </ConvexProviderWithAuth>
        </ViewerSessionProvider>
      </ClerkRuntimeControlProvider>
    );
  }

  /**
   * A sign-in has landed and the authenticated app is still assembling: the
   * runtime chunk, Clerk's own boot, the route's lazy page and its first Convex
   * reads all resolve after this point. Every one of those steps has a
   * signed-out or placeholder rendering, so the curtain covers the lot.
   *
   * Both inputs are set client-side only, so SSR renders `false` for everyone
   * and an anonymous visit is byte-identical to what it was before.
   */
  const authHandoff = signedInViaModal || clerkHandshake;

  return (
    <ClerkRuntimeControlProvider value={runtimeControl}>
      <Suspense
        fallback={
          pathname === '/' ? (
            /* The home route renders its landing page whenever the viewer
               session says signed out, and this fallback has no Clerk to say
               otherwise. For a viewer we already know is signed in that would
               paint the logged-out page for the length of a chunk fetch, so
               they get the curtain instead; everyone else (crawlers included)
               still gets the fully rendered landing page. */
            initialSignedIn || authHandoff ? (
              <RuntimeBootCurtain />
            ) : (
              <AnonymousAppRuntime>{children}</AnonymousAppRuntime>
            )
          ) : null
        }
      >
        <AuthenticatedAppRuntime assumeSignedIn={authHandoff}>
          <AuthCurtainHost handoff={authHandoff}>
            {/* Inside the curtain host rather than beside the runtime's other
                post-sign-in effects, because it has to be able to hold the
                curtain: `useAuthCurtainGate` reads a context this provides, and
                outside it the gate is a silent no-op. */}
            <PendingPickSubmitter />
            {children}
          </AuthCurtainHost>
        </AuthenticatedAppRuntime>
      </Suspense>
    </ClerkRuntimeControlProvider>
  );
}

/**
 * Stand-in for the whole app while the authenticated runtime chunk resolves for
 * someone we already know is signed in. Deliberately not `AnonymousAppRuntime`:
 * this window must not render the app's logged-out face.
 */
function RuntimeBootCurtain() {
  return (
    <div
      className="flex min-h-[var(--app-viewport-height,100dvh)] flex-col items-center justify-center gap-4 bg-page"
      role="status"
      aria-live="polite"
    >
      <Loader2
        className="h-8 w-8 animate-spin text-accent motion-reduce:animate-none"
        aria-hidden
      />
      <p className="text-xs font-semibold tracking-label text-text-muted uppercase">
        Loading your dashboard
      </p>
    </div>
  );
}

/**
 * Signed-out shell for the brief window while the authenticated runtime chunk
 * resolves on a route that needs Clerk from the first paint.
 */
function AnonymousAppRuntime({ children }: PropsWithChildren) {
  return (
    <ViewerSessionProvider
      value={{
        isSignedIn: false,
        confirmedSignedIn: false,
        isLoaded: true,
      }}
    >
      <ConvexProviderWithAuth client={convex} useAuth={useAnonymousConvexAuth}>
        <AppConvexQueryCache>{children}</AppConvexQueryCache>
      </ConvexProviderWithAuth>
    </ViewerSessionProvider>
  );
}

async function fetchAnonymousAccessToken() {
  return null;
}

/**
 * Public pages still need Convex's auth-state context so try-before-signup
 * forms can distinguish "build a draft" from "submit an authenticated
 * mutation." The client remains explicitly signed out until Clerk is loaded
 * after an intentional save/sign-in action.
 */
function useAnonymousConvexAuth() {
  return {
    isLoading: false,
    isAuthenticated: false,
    fetchAccessToken: fetchAnonymousAccessToken,
  };
}

function AuthenticatedDeferredFeature({ children }: PropsWithChildren) {
  const { active } = useClerkRuntimeControl();
  if (!active) {
    return null;
  }
  return <DeferredFeaturesBoundary>{children}</DeferredFeaturesBoundary>;
}

function DeferredFeaturesBoundary({ children }: PropsWithChildren) {
  const [shouldLoad, setShouldLoad] = useState(false);

  useEffect(() => {
    return deferUntilAfterLoad(() => setShouldLoad(true));
  }, []);

  if (!shouldLoad) {
    return null;
  }

  return <Suspense fallback={null}>{children}</Suspense>;
}
