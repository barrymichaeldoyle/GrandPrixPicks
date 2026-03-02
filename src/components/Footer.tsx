import { Link } from '@tanstack/react-router';
import { Flag } from 'lucide-react';

import { footerExploreLinks } from '../lib/navigation';

function XIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className={className}
      fill="currentColor"
    >
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

function LinkedInIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className={className}
      fill="currentColor"
    >
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
    </svg>
  );
}

export function Footer() {
  const year = new Date().getFullYear();
  const footerLinkClass =
    'font-semibold text-accent transition-colors hover:text-accent-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 focus-visible:ring-offset-2 focus-visible:ring-offset-surface rounded-sm';

  return (
    <footer className="mt-auto border-t border-border bg-surface pb-[max(1rem,env(safe-area-inset-bottom,0px))] sm:pb-6">
      <div className="mx-auto max-w-5xl px-4 py-8">
        <div className="grid grid-cols-1 gap-8 text-sm text-text-muted sm:grid-cols-3">
          <div className="space-y-3">
            <p className="flex items-center gap-2 text-base font-semibold text-text">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-accent/10">
                <Flag
                  className="relative left-0.25 h-4 w-4 text-accent"
                  aria-hidden="true"
                />
              </span>
              <span className="font-title tracking-tight">Grand Prix Picks</span>
            </p>
            <p className="max-w-sm text-xs text-text-muted">
              Fan-made prediction game for Formula 1 race weekends. No gambling
              or real-money betting.
            </p>
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <span>Made by</span>
              <a
                href="https://barrymichaeldoyle.com"
                target="_blank"
                rel="noopener noreferrer"
                className={footerLinkClass}
              >
                Barry Michael Doyle
              </a>
              <span
                aria-hidden
                className="inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-border"
              />
              <a
                href="https://x.com/barrymdoyle"
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-md p-2 text-accent transition-colors hover:bg-accent-muted/50 hover:text-accent-hover focus-visible:ring-2 focus-visible:ring-accent/60 focus-visible:ring-offset-2 focus-visible:ring-offset-surface focus-visible:outline-none"
                aria-label="X (Twitter)"
              >
                <XIcon className="h-4 w-4" />
              </a>
              <a
                href="https://www.linkedin.com/in/barry-michael-doyle-11369683/"
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-md p-2 text-accent transition-colors hover:bg-accent-muted/50 hover:text-accent-hover focus-visible:ring-2 focus-visible:ring-accent/60 focus-visible:ring-offset-2 focus-visible:ring-offset-surface focus-visible:outline-none"
                aria-label="LinkedIn"
              >
                <LinkedInIcon className="h-4 w-4" />
              </a>
            </div>
          </div>

          <div className="space-y-3">
            <h2 className="text-xs font-semibold tracking-wide text-text uppercase">
              Explore
            </h2>
            <nav
              aria-label="Footer site navigation"
              className="flex flex-col gap-2 text-sm"
            >
              {footerExploreLinks.map((link) => (
                <Link key={link.to} to={link.to} className={footerLinkClass}>
                  {link.label}
                </Link>
              ))}
            </nav>
          </div>

          <div className="space-y-3">
            <h2 className="text-xs font-semibold tracking-wide text-text uppercase">
              Legal & Support
            </h2>
            <nav
              aria-label="Footer legal navigation"
              className="flex flex-col gap-2 text-sm"
            >
              <Link to="/pricing" className={footerLinkClass}>
                Pricing
              </Link>
              <Link to="/refund-policy" className={footerLinkClass}>
                Refund Policy
              </Link>
              <Link to="/support" className={footerLinkClass}>
                Support
              </Link>
              <Link to="/terms" className={footerLinkClass}>
                Terms of Service
              </Link>
              <Link to="/privacy" className={footerLinkClass}>
                Privacy Policy
              </Link>
            </nav>
          </div>
        </div>

        <div className="mt-8 border-t border-border pt-4 text-xs text-text-muted">
          {year} Barry Michael Doyle Software Solutions (Pty) Ltd
        </div>
      </div>
    </footer>
  );
}
