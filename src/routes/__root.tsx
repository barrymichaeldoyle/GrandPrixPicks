import { useAuth, useUser } from '@clerk/clerk-react';
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
import posthog from 'posthog-js';
import type { PropsWithChildren } from 'react';
import { useEffect, useRef } from 'react';

import { api } from '../../convex/_generated/api';
import { CookieConsent } from '../components/CookieConsent';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { Footer } from '../components/Footer';
import { Header } from '../components/Header';
import { ScrollToTop } from '../components/ScrollToTop';
import { UpcomingPredictionBanner } from '../components/UpcomingPredictionBanner';
import { useMobileMenu } from '../hooks/useMobileMenu';
import { THEME_KEY, useTheme } from '../hooks/useTheme';
import { AppClerkProvider } from '../integrations/clerk/provider';
import { AppConvexProvider } from '../integrations/convex/provider';
import TanStackQueryDevtools from '../integrations/tanstack-query/devtools';
import { siteConfig } from '../lib/site';
import appCss from '../styles.css?url';

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
          'Grand Prix Picks — make F1 predictions and climb the 2026 leaderboard.',
      },
      { name: 'twitter:card', content: 'summary_large_image' },
      {
        name: 'twitter:image:alt',
        content:
          'Grand Prix Picks — make F1 predictions and climb the 2026 leaderboard.',
      },
      { name: 'twitter:creator', content: '@barrymdoyle' },
    ],
    links: [
      { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
      { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossOrigin: '' },
      {
        rel: 'stylesheet',
        href: 'https://fonts.googleapis.com/css2?family=Orbitron:wght@500;700;800;900&display=swap',
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

/** Identifies signed-in Clerk users in PostHog and resets on sign-out. */
function PostHogUserSync() {
  const { user, isLoaded } = useUser();
  const prevIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!isLoaded) {
      return;
    }
    if (user) {
      if (prevIdRef.current !== user.id) {
        prevIdRef.current = user.id;
        posthog.identify(user.id, {
          email: user.primaryEmailAddress?.emailAddress,
          name: user.fullName,
          username: user.username,
        });
      }
    } else {
      if (prevIdRef.current !== null) {
        prevIdRef.current = null;
        posthog.reset();
      }
    }
  }, [user, isLoaded]);

  return null;
}

function RootDocument({ children }: PropsWithChildren) {
  const mainRef = useRef<HTMLDivElement>(null);
  const { isDark, setTheme } = useTheme();
  const { mobileMenuOpen, onMobileMenuOpenChange } = useMobileMenu(mainRef);

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(console.error);
    }
  }, []);

  return (
    <html lang="en" className="dark" data-theme="dark">
      <head>
        <HeadContent />
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem("${THEME_KEY}");var d=t==="dark"||(t!=="light"&&window.matchMedia("(prefers-color-scheme:dark)").matches);document.documentElement.classList.toggle("dark",d);document.documentElement.setAttribute("data-theme",d?"dark":"light")}catch(e){}})()`,
          }}
        />
      </head>
      <body>
        <div
          aria-hidden="true"
          className="pointer-events-none fixed inset-x-0 top-0 z-[11] h-[34rem] overflow-hidden"
        >
          <div className="global-flare-a absolute top-0 left-1/2 h-80 w-80 -translate-x-1/2 rounded-full bg-accent/15 blur-3xl" />
          <div className="global-flare-b absolute top-24 right-8 h-72 w-72 rounded-full bg-success/10 blur-3xl" />
          <div className="global-flare-c absolute top-36 left-8 h-64 w-64 rounded-full bg-warning/10 blur-3xl" />
        </div>
        <AppClerkProvider darkMode={isDark}>
          <AppConvexProvider>
            <ProfileSync />
            <PostHogUserSync />
            <div className="relative z-10 flex h-[100dvh] h-screen flex-col overflow-hidden">
              <a
                href="#main-content"
                className="sr-only focus:not-sr-only focus:absolute focus:z-[9999] focus:rounded-md focus:bg-surface focus:px-4 focus:py-2 focus:text-text focus:shadow-lg"
              >
                Skip to main content
              </a>
              <Header
                mobileMenuOpen={mobileMenuOpen}
                onMobileMenuOpenChange={onMobileMenuOpenChange}
                themeKey={THEME_KEY}
                isDark={isDark}
                onThemeChange={setTheme}
              />
              <UpcomingPredictionBanner />
              <CookieConsent />
              <div
                ref={mainRef}
                className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto"
              >
                <ScrollToTop scrollContainerRef={mainRef} />
                <div className="flex min-h-full flex-col">
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
          </AppConvexProvider>
        </AppClerkProvider>
        <Scripts />
      </body>
    </html>
  );
}
