import { useAuth } from '@clerk/clerk-react';
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
import { Flag, Home, Trophy } from 'lucide-react';
import type { PropsWithChildren } from 'react';
import { useEffect, useRef } from 'react';

import { api } from '../../convex/_generated/api';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { Footer } from '../components/Footer';
import { Header } from '../components/Header';
import { ScrollToTop } from '../components/ScrollToTop';
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
      { property: 'og:type', content: 'website' },
      { property: 'og:url', content: siteConfig.url },
      { property: 'og:site_name', content: siteConfig.title },
      { name: 'twitter:card', content: 'summary_large_image' },
      { name: 'twitter:url', content: siteConfig.url },
      { name: 'twitter:creator', content: '@barrymdoyle' },
    ],
    links: [
      { rel: 'stylesheet', href: appCss },
      { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' },
      { rel: 'apple-touch-icon', href: '/favicon.svg' },
      { rel: 'manifest', href: '/manifest.json' },
      { rel: 'canonical', href: siteConfig.url },
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
  return (
    <div className="flex min-h-[50vh] items-center justify-center px-4">
      <div className="w-full max-w-md text-center">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-warning-muted">
          <Flag className="h-8 w-8 text-warning" />
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
            <Home className="h-4 w-4" />
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
  const mainRef = useRef<HTMLDivElement>(null);
  const { isDark, setTheme } = useTheme();
  const { mobileMenuOpen, onMobileMenuOpenChange } = useMobileMenu(mainRef);

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
        <AppClerkProvider darkMode={isDark}>
          <AppConvexProvider>
            <ProfileSync />
            <div className="flex h-[100dvh] h-screen flex-col overflow-hidden">
              <Header
                mobileMenuOpen={mobileMenuOpen}
                onMobileMenuOpenChange={onMobileMenuOpenChange}
                themeKey={THEME_KEY}
                isDark={isDark}
                onThemeChange={setTheme}
              />
              <div
                ref={mainRef}
                className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto"
              >
                <ScrollToTop scrollContainerRef={mainRef} />
                <div className="flex min-h-full flex-col">
                  <main className="min-h-0 flex-1">
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
