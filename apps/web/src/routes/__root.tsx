import { useAuth } from '@clerk/react';
import { api } from '@convex-generated/api';
import { convexHttp } from '@/integrations/convex/client';
import { TanStackDevtools } from '@tanstack/react-devtools';
import type { QueryClient } from '@tanstack/react-query';
import {
  createRootRouteWithContext,
  HeadContent,
  Link,
  Scripts,
} from '@tanstack/react-router';
import { TanStackRouterDevtoolsPanel } from '@tanstack/react-router-devtools';
import { useMutation } from 'convex/react';
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
import { AppClerkProvider } from '@/integrations/clerk/provider';
import { AppConvexProvider } from '@/integrations/convex/provider';
import TanStackQueryDevtools from '@/integrations/tanstack-query/devtools';
import { deferUntilAfterLoad } from '@/lib/deferUntilAfterLoad';
import { siteConfig } from '@/lib/site';
import appCss from '@/styles.css?url';

const DeferredShellFeatures = lazy(() =>
  import('@/components/DeferredGlobalFeatures').then((module) => ({
    default: module.DeferredShellFeatures,
  })),
);
const DeferredPredictionBanner = lazy(() =>
  import('@/components/DeferredGlobalFeatures').then((module) => ({
    default: module.DeferredPredictionBanner,
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

/** Syncs the user's Clerk profile to Convex once per app load. */
function ProfileSync() {
  const { isSignedIn } = useAuth();
  const syncProfile = useMutation(api.users.syncProfile);
  const hasSynced = useRef(false);

  useEffect(() => {
    if (isSignedIn && !hasSynced.current) {
      hasSynced.current = true;
      void syncProfile({
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        locale: navigator.language,
      });
    }
  }, [isSignedIn, syncProfile]);

  return null;
}

function RootDocument({ children }: PropsWithChildren) {
  const { initialAuth, nextRace } = Route.useLoaderData();
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
        <AppClerkProvider darkMode={true}>
          <AppConvexProvider>
            <InitialAuthProvider value={initialAuth}>
              <ProfileSync />
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
                    <DeferredFeaturesBoundary>
                      <DeferredPredictionBanner />
                    </DeferredFeaturesBoundary>
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
            </InitialAuthProvider>
          </AppConvexProvider>
        </AppClerkProvider>
        <Scripts />
      </body>
    </html>
  );
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
