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
import { ConvexProvider } from 'convex/react';
import { Flag, Home } from 'lucide-react';
import type { PropsWithChildren } from 'react';
import { lazy, Suspense, useEffect, useRef, useState } from 'react';

import { ErrorBoundary } from '@/components/error/ErrorBoundary';
import { Footer } from '@/components/Footer';
import { Header } from '@/components/Header';
import { OfflineBanner } from '@/components/OfflineBanner';
import { ScrollToTop } from '@/components/ScrollToTop';
import { useMobileMenu } from '@/hooks/useMobileMenu';
import {
  fetchInitialAuth,
  InitialAuthProvider,
} from '@/integrations/clerk/initial-auth';
import {
  ClerkRuntimeControlProvider,
  useClerkRuntimeControl,
} from '@/integrations/clerk/runtime-control';
import { ViewerSessionProvider } from '@/integrations/clerk/viewer-session-context';
import { convex, convexHttp } from '@/integrations/convex/client';
import TanStackQueryDevtools from '@/integrations/tanstack-query/devtools';
import { deferUntilAfterLoad } from '@/lib/deferUntilAfterLoad';
import { siteConfig } from '@/lib/site';
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

interface MyRouterContext {
  queryClient: QueryClient;
}

// Structured data for SEO (JSON-LD)
const structuredData = {
  '@context': 'https://schema.org',
  '@type': 'WebApplication',
  name: siteConfig.title,
  description: siteConfig.description,
  url: siteConfig.url,
  applicationCategory: 'GameApplication',
  operatingSystem: 'Any',
  sameAs: [siteConfig.social.x.url],
  author: {
    '@type': 'Person',
    name: siteConfig.author.name,
    url: siteConfig.author.url,
  },
  offers: {
    '@type': 'Offer',
    price: '0',
    priceCurrency: 'USD',
  },
};

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
        content:
          'Grand Prix Picks: make F1 predictions and climb the 2026 leaderboard.',
      },
      { name: 'twitter:card', content: 'summary_large_image' },
      {
        name: 'twitter:image:alt',
        content:
          'Grand Prix Picks: make F1 predictions and climb the 2026 leaderboard.',
      },
      { name: 'twitter:site', content: siteConfig.social.x.handle },
    ],
    links: [
      {
        rel: 'preload',
        href: '/fonts/orbitron-v35-latin.woff2',
        as: 'font',
        type: 'font/woff2',
        crossOrigin: 'anonymous',
      },
      { rel: 'stylesheet', href: appCss },
      {
        rel: 'icon',
        type: 'image/png',
        sizes: '32x32',
        href: '/favicon-32x32.png?v=20260224',
      },
      {
        rel: 'icon',
        type: 'image/png',
        sizes: '16x16',
        href: '/favicon-16x16.png?v=20260224',
      },
      {
        rel: 'apple-touch-icon',
        sizes: '180x180',
        href: '/apple-touch-icon.png?v=20260224',
      },
      { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg?v=20260224' },
      { rel: 'manifest', href: '/manifest.json?v=20260224' },
      // canonical link is set per-route — do NOT add a global one here
    ],
    scripts: [
      {
        type: 'application/ld+json',
        children: JSON.stringify(structuredData),
      },
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

        <h1 className="mb-2 text-2xl font-bold text-text">Page not found</h1>

        <p className="mb-8 text-text-muted">
          Looks like you've taken a wrong turn. This page doesn't exist or has
          been moved.
        </p>

        <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <Link
            to="/"
            className="inline-flex items-center gap-2 rounded-lg bg-button-accent px-6 py-2.5 font-semibold text-white transition-colors hover:bg-button-accent-hover"
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
  const mainRef = useRef<HTMLDivElement>(null);
  const { mobileMenuOpen, onMobileMenuOpenChange } = useMobileMenu(mainRef);

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(console.error);
    }
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
        <div
          aria-hidden="true"
          className="app-atmosphere pointer-events-none fixed inset-0 z-[11] overflow-hidden"
        >
          <div className="app-atmosphere-field absolute inset-0" />
          <div className="app-atmosphere-grain absolute inset-0" />
        </div>
        <InitialAuthProvider value={initialAuth}>
          <AppRuntimeBoundary
            initialSignedIn={initialAuth.isSignedIn}
            pathname={pathname}
          >
            <AuthenticatedDeferredFeature>
              <DeferredObservabilityUserSync />
            </AuthenticatedDeferredFeature>
            <div className="relative z-10 flex h-[var(--app-viewport-height,100dvh)] flex-col overflow-hidden pt-[var(--app-top-overlay-offset,0px)] pb-[var(--app-bottom-overlay-offset,0px)]">
              <a
                href="#main-content"
                className="sr-only focus:not-sr-only focus:absolute focus:z-[9999] focus:rounded-md focus:bg-surface focus:px-4 focus:py-2 focus:text-text focus:shadow-lg"
              >
                Skip to main content
              </a>
              <Header
                mobileMenuOpen={mobileMenuOpen}
                onMobileMenuOpenChange={onMobileMenuOpenChange}
                initialNextRace={nextRace}
              />
              <OfflineBanner />
              <DeferredFeaturesBoundary>
                <DeferredShellFeatures />
              </DeferredFeaturesBoundary>
              <div
                ref={mainRef}
                className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto"
              >
                <ScrollToTop scrollContainerRef={mainRef} />
                <div className="flex min-h-full flex-col">
                  <AuthenticatedDeferredFeature>
                    <DeferredPredictionBanner />
                  </AuthenticatedDeferredFeature>
                  <main id="main-content" className="min-h-0 flex-1">
                    <ErrorBoundary>{children}</ErrorBoundary>
                  </main>
                  <Footer />
                </div>
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
  const [runtimeRequested, setRuntimeRequested] = useState(false);
  const [openSignInOnMount, setOpenSignInOnMount] = useState(false);
  const runtimeActive = initialSignedIn || pathname !== '/' || runtimeRequested;

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
      setRuntimeRequested(true);
    }
  }, []);

  function requestSignIn() {
    setOpenSignInOnMount(true);
    setRuntimeRequested(true);
  }
  function signInOpened() {
    setOpenSignInOnMount(false);
  }
  const runtimeControl = {
    active: runtimeActive,
    openSignInOnMount,
    requestSignIn,
    signInOpened,
  };

  if (!runtimeActive) {
    return (
      <AnonymousAppRuntime
        requestSignIn={requestSignIn}
        signInOpened={signInOpened}
      >
        {children}
      </AnonymousAppRuntime>
    );
  }

  return (
    <ClerkRuntimeControlProvider value={runtimeControl}>
      <Suspense
        fallback={
          pathname === '/' ? (
            <AnonymousAppRuntime
              disabled
              requestSignIn={requestSignIn}
              signInOpened={signInOpened}
            >
              {children}
            </AnonymousAppRuntime>
          ) : null
        }
      >
        <AuthenticatedAppRuntime>{children}</AuthenticatedAppRuntime>
      </Suspense>
    </ClerkRuntimeControlProvider>
  );
}

function AnonymousAppRuntime({
  children,
  disabled = false,
  requestSignIn,
  signInOpened,
}: PropsWithChildren<{
  disabled?: boolean;
  requestSignIn: () => void;
  signInOpened: () => void;
}>) {
  const runtimeControl = {
    active: false,
    openSignInOnMount: false,
    requestSignIn: disabled ? () => undefined : requestSignIn,
    signInOpened,
  };

  return (
    <ClerkRuntimeControlProvider value={runtimeControl}>
      <ViewerSessionProvider
        value={{
          isSignedIn: false,
          confirmedSignedIn: false,
          isLoaded: true,
        }}
      >
        <ConvexProvider client={convex}>{children}</ConvexProvider>
      </ViewerSessionProvider>
    </ClerkRuntimeControlProvider>
  );
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
