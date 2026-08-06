import { Link } from '@tanstack/react-router';

import {
  footerF1Links,
  footerLegalLinks,
  footerPlayLinks,
  footerSupportLinks,
} from '@/lib/navigation';
import { siteConfig } from '@/lib/site';
import { PrivacyChoicesButton } from './PrivacyChoicesButton';
import { BrandMark } from './BrandMark.tsx';
import { XLogoIcon } from './ShareOnXButton';

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

function RedditIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="13" r="7" />
      <circle cx="9.5" cy="12.5" r="0.75" fill="currentColor" stroke="none" />
      <circle cx="14.5" cy="12.5" r="0.75" fill="currentColor" stroke="none" />
      <path d="M8.75 15.25c1.8 1.25 4.7 1.25 6.5 0" />
      <path d="m13.5 6.2.9-3 3.1.75" />
      <circle cx="18.75" cy="4.25" r="1.25" />
      <path d="M5.4 10.6a2 2 0 0 0-1.9 2c0 .85.5 1.6 1.25 1.9M18.6 10.6a2 2 0 0 1 1.9 2c0 .85-.5 1.6-1.25 1.9" />
    </svg>
  );
}

function InstagramIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.25" cy="6.75" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

const socialLinks = [
  {
    key: 'x',
    href: siteConfig.social.x.url,
    label: siteConfig.social.x.handle,
    ariaLabel: `Follow Grand Prix Picks ${siteConfig.social.x.handle} on X`,
    icon: <XLogoIcon className="h-3.5 w-3.5" />,
  },
  {
    key: 'reddit',
    href: siteConfig.social.reddit.url,
    label: siteConfig.social.reddit.name,
    ariaLabel: `Join Grand Prix Picks on Reddit at ${siteConfig.social.reddit.name}`,
    icon: <RedditIcon className="h-4 w-4" />,
  },
  {
    key: 'instagram',
    href: siteConfig.social.instagram.url,
    label: siteConfig.social.instagram.handle,
    ariaLabel: `Follow Grand Prix Picks ${siteConfig.social.instagram.handle} on Instagram`,
    icon: <InstagramIcon className="h-4 w-4" />,
  },
] as const;

const socialLinkClass =
  'inline-flex min-h-6 items-center gap-1 rounded-sm text-text-muted transition-colors hover:text-text focus-visible:ring-2 focus-visible:ring-accent/60 focus-visible:outline-none';

function MadeByCredit({
  className,
  linkClassName,
}: {
  className?: string;
  linkClassName: string;
}) {
  return (
    <div
      className={`items-center gap-2 text-text-muted ${className ?? 'flex'}`}
    >
      <span>Made by</span>
      <a
        href="https://barrymichaeldoyle.com"
        target="_blank"
        rel="noopener noreferrer"
        className={linkClassName}
      >
        Barry Michael Doyle
      </a>
      <a
        href="https://www.linkedin.com/in/barry-michael-doyle-11369683/"
        target="_blank"
        rel="noopener noreferrer"
        className="flex h-8 w-8 items-center justify-center rounded-sm text-text-muted transition-colors hover:bg-surface-muted hover:text-text focus-visible:ring-2 focus-visible:ring-accent/60 focus-visible:outline-none"
        aria-label="Barry Michael Doyle on LinkedIn"
      >
        <LinkedInIcon className="h-3.5 w-3.5" />
      </a>
    </div>
  );
}

export function Footer() {
  const year = new Date().getFullYear();
  const footerLinkClass =
    'inline-flex min-h-6 items-center rounded-sm text-text-muted transition-colors hover:text-text focus-visible:ring-2 focus-visible:ring-accent/60 focus-visible:ring-offset-2 focus-visible:ring-offset-surface focus-visible:outline-none';

  return (
    <footer className="relative mt-auto overflow-hidden border-t border-border bg-surface pb-[calc(var(--bottom-overlay-offset,0px)+var(--app-bottom-overlay-offset,0px)+max(1rem,env(safe-area-inset-bottom,0px)))] sm:pb-[calc(var(--bottom-overlay-offset,0px)+var(--app-bottom-overlay-offset,0px)+1rem)]">
      {/* Same frame as the header and every page container
          (`max-w-(--page-max) px-4`). This was `max-w-6xl`, 128px narrower,
          so the footer columns sat 64px inboard of the nav and of the page
          content above them on any viewport past 1152px. */}
      <div className="relative mx-auto w-full max-w-(--page-max) px-4 py-8">
        <div className="grid grid-cols-1 gap-8 text-sm text-text-muted min-[360px]:grid-cols-2 min-[360px]:gap-x-6 sm:gap-10 lg:grid-cols-[1.35fr_0.9fr_1fr_1.05fr]">
          <div className="space-y-3 min-[360px]:col-span-2 lg:col-span-1">
            <Link
              to="/"
              className="group flex items-center gap-1.5 rounded-sm text-base text-text focus-visible:ring-2 focus-visible:ring-accent/60 focus-visible:outline-none"
            >
              <BrandMark className="h-4 w-6 shrink-0 text-accent" />
              <span className="font-semibold tracking-[0.06em] uppercase transition-colors group-hover:text-accent">
                Grand Prix Picks
              </span>
            </Link>
            <p className="max-w-sm text-sm text-text-muted">
              A free-to-play F1 prediction game for every race weekend.
            </p>
            <div className="space-y-2 pt-1 text-xs">
              <div className="flex flex-wrap items-center gap-x-4">
                {socialLinks.map((link) => (
                  <a
                    key={link.key}
                    href={link.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={socialLinkClass}
                    aria-label={link.ariaLabel}
                  >
                    {link.icon}
                    <span>{link.label}</span>
                  </a>
                ))}
              </div>
              {/* Desktop: sits with the brand column. Mobile puts this at the
                  foot of the stack — nav and legal matter more when space is
                  tight (see the bottom bar below). */}
              <MadeByCredit
                linkClassName={footerLinkClass}
                className="hidden sm:flex"
              />
            </div>
          </div>

          <div className="space-y-3">
            <h2 className="font-title text-xs font-semibold tracking-label text-text uppercase">
              Play
            </h2>
            <nav
              aria-label="Footer game navigation"
              className="flex flex-col gap-2 text-sm"
            >
              {footerPlayLinks.map((link) => (
                <Link key={link.to} to={link.to} className={footerLinkClass}>
                  {link.label}
                </Link>
              ))}
            </nav>
          </div>

          <div className="space-y-3">
            <h2 className="font-title text-xs font-semibold tracking-label text-text uppercase">
              F1 data
            </h2>
            <nav
              aria-label="Footer Formula 1 navigation"
              className="flex flex-col gap-2 text-sm"
            >
              {footerF1Links.map((link) => (
                <Link key={link.to} to={link.to} className={footerLinkClass}>
                  {link.label}
                </Link>
              ))}
            </nav>
          </div>

          <div className="space-y-3">
            <h2 className="font-title text-xs font-semibold tracking-label text-text uppercase">
              Support
            </h2>
            <nav
              aria-label="Footer support navigation"
              className="flex flex-col gap-2 text-sm"
            >
              {footerSupportLinks.map((link) => (
                <Link key={link.to} to={link.to} className={footerLinkClass}>
                  {link.label}
                </Link>
              ))}
            </nav>
          </div>
        </div>

        <div className="mt-7 flex flex-col gap-3 border-t border-border pt-4 text-xs text-text-muted sm:flex-row sm:items-center sm:justify-between">
          <p>© {year} Barry Michael Doyle Software Solutions (Pty) Ltd</p>
          <nav
            aria-label="Footer legal navigation"
            className="flex flex-wrap gap-x-3 gap-y-1 text-[11px]"
          >
            {footerLegalLinks.map((link) => (
              <Link key={link.to} to={link.to} className={footerLinkClass}>
                {link.label}
              </Link>
            ))}
            <PrivacyChoicesButton className={footerLinkClass} />
          </nav>
          <MadeByCredit
            linkClassName={footerLinkClass}
            className="flex sm:hidden"
          />
        </div>

        <p className="mt-4 text-center text-[11px] leading-relaxed text-text-muted">
          This website is unofficial and is not associated in any way with the
          Formula 1 companies. F1, FORMULA ONE, FORMULA 1, FIA FORMULA ONE WORLD
          CHAMPIONSHIP, GRAND PRIX and related marks are trade marks of Formula
          One Licensing B.V.
        </p>
      </div>
    </footer>
  );
}
