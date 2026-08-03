import { api } from '@convex-generated/api';
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
import { Flag, Home } from 'lucide-react';
import type { PropsWithChildren } from 'react';
import { lazy, startTransition, Suspense, useEffect, useState } from 'react';

import { AppMotionProvider } from '@/components/AppMotionProvider';
import { ErrorBoundary } from '@/components/error/ErrorBoundary';
import { Footer } from '@/components/Footer';
import { Header } from '@/components/Header';
import { OfflineBanner } from '@/components/OfflineBanner';
import { ScrollToTop } from '@/components/ScrollToTop';
import {
  fetchInitialAuth,
  InitialAuthProvider,
} from '@/integrations/clerk/initial-auth';
import { preloadClerkRuntime } from '@/integrations/clerk/preload';
import {
  ClerkRuntimeControlProvider,
  useClerkRuntimeControl,
} from '@/integrations/clerk/runtime-control';
import { ViewerSessionProvider } from '@/integrations/clerk/viewer-session-context';
import { convex, convexHttp } from '@/integrations/convex/client';
import TanStackQueryDevtools from '@/integrations/tanstack-query/devtools';
import { clerkFrontendApiOrigin } from '@/lib/clerkOrigin';
import { deferUntilAfterLoad } from '@/lib/deferUntilAfterLoad';
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

export const Route = createRootRouteWithContext<MyRouterContext>()({
  head: () => ({
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
      ...(CLERK_ORIGIN
        ? [
            {
              rel: 'preconnect',
              href: CLERK_ORIGIN,
              crossOrigin: 'anonymous' as const,
            },
            { rel: 'dns-prefetch', href: CLERK_ORIGIN },
          ]
        : []),
      // Only the two faces that paint above the fold get preloaded: Archivo
      // for all UI text and Plex Mono 500 for the countdown and points. The
      // other Plex weights load on demand.
      {
        rel: 'preload',
        href: '/fonts/archivo-latin-var.woff2',
        as: 'font',
        type: 'font/woff2',
        crossOrigin: 'anonymous',
      },
      {
        rel: 'preload',
        href: '/fonts/ibm-plex-mono-500-latin.woff2',
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
    // Seed the header's "next race" quick link at SSR so it renders on the first
    // paint instead of popping in after the client Convex query resolves. The
    // link is signed-in only, so skip the query for anonymous visitors, and
    // never let it fail the whole app render.
    const nextRace = initialAuth.isSignedIn
      ? await convexHttp.query(api.races.getNextRace).catch(() => null)
      : null;
    return { initialAuth, nextRace };
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
  const { initialAuth, nextRace } = Route.useLoaderData();
  const pathname = useLocation({ select: (location) => location.pathname });

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(console.error);
    }
  }, []);

  useEffect(() => {
    // The conversion page does not render ads. Loading AdSense there added
    // network/CPU work and could mutate <head> before React hydration. Other
    // routes load it only after the document and an idle main-thread window.
    if (
      pathname === '/' ||
      document.querySelector<HTMLScriptElement>('#gpp-adsense-script')
    ) {
      return;
    }

    return deferUntilAfterLoad(() => {
      if (document.querySelector('#gpp-adsense-script')) {
        return;
      }
      const script = document.createElement('script');
      script.id = 'gpp-adsense-script';
      script.async = true;
      script.crossOrigin = 'anonymous';
      script.src =
        'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-3482457944656598';
      document.head.append(script);
    });
  }, [pathname]);

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
        {import.meta.env.PROD ? (
          <>
            {/* Reserve the widget's 36px rail before first paint. StartupBar
                uses a fixed iframe except on iPhone Safari, where it inserts a
                static iframe instead; the CSS reservation handles both modes
                without moving the page when the async loader runs. */}
            <script
              dangerouslySetInnerHTML={{
                __html:
                  "(function(){var u=navigator.userAgent||'';var s=/(iPhone|iPod)/.test(u)&&/Safari/.test(u)&&!/CriOS|FxiOS|EdgiOS|OPiOS|GSA/.test(u);document.documentElement.setAttribute('data-startupbar-mode',s?'static':'fixed')})()",
              }}
            />
            <script
              async
              fetchPriority="low"
              src="https://startupbar.co/widget/loader.js"
              data-startup-id="4a43c3ef-449e-4069-9e46-a534ff4f7130"
              data-theme="dark"
            />
          </>
        ) : null}
      </head>
      <body>
        {/* The screen-blended atmosphere field and grain overlay that used to
            sit here are gone: backgrounds are flat colour in this system, and
            a full-viewport gradient is the single biggest thing standing
            between the app and "calm". */}
        <AppMotionProvider>
          <InitialAuthProvider value={initialAuth}>
            {/* Keep route scroll handling outside the swappable Clerk runtime.
                Activating sign-in from the public picker remounts that runtime,
                but it is not navigation and must not reset the landing page. */}
            <ScrollToTop />
            <AppRuntimeBoundary
              initialSignedIn={initialAuth.isSignedIn}
              pathname={pathname}
            >
              <AuthenticatedDeferredFeature>
                <DeferredObservabilityUserSync />
              </AuthenticatedDeferredFeature>
              <div className="relative z-10 flex min-h-[var(--app-viewport-height,100dvh)] flex-col overflow-x-clip pt-[var(--app-top-overlay-offset,0px)] pb-[var(--app-bottom-overlay-offset,0px)]">
                <a
                  href="#main-content"
                  className="sr-only focus:not-sr-only focus:absolute focus:z-[9999] focus:rounded-sm focus:border focus:border-border focus:bg-surface focus:px-4 focus:py-2 focus:text-text"
                >
                  Skip to main content
                </a>
                <Header initialNextRace={nextRace} />
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
                  <Footer />
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
              </div>
            </AppRuntimeBoundary>
          </InitialAuthProvider>
        </AppMotionProvider>
        <Scripts />
      </body>
    </html>
  );
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

  // Every route except a signed-out landing page renders inside Clerk from the
  // first paint, so for them this boundary is exactly what it always was.
  const clerkRequired =
    initialSignedIn ||
    pathname !== '/' ||
    returningFromClerk ||
    signedInViaModal;

  useEffect(() => {
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
  }, []);

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
            {children}
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

  return (
    <ClerkRuntimeControlProvider value={runtimeControl}>
      <Suspense
        fallback={
          pathname === '/' ? (
            <AnonymousAppRuntime>{children}</AnonymousAppRuntime>
          ) : null
        }
      >
        <AuthenticatedAppRuntime>{children}</AuthenticatedAppRuntime>
      </Suspense>
    </ClerkRuntimeControlProvider>
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
        {children}
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
