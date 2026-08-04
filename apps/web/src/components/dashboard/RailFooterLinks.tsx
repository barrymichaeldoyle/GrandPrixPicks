import { Link } from '@tanstack/react-router';

import { railFooterLinks } from '@/lib/navigation';
import { siteConfig } from '@/lib/site';
import { PrivacyChoicesButton } from '@/components/PrivacyChoicesButton';

/**
 * Deliberately sized to WCAG 2.2 AA (24x24 CSS px) rather than the 44px touch
 * target the rest of the dashboard uses.
 *
 * Eight wrapped small-print links at 44px each would be a footer several
 * hundred pixels tall on a phone, dwarfing the content above it, and these are
 * rarely-tapped legal destinations rather than anything on the primary path.
 * The links were 18px, which failed both bars; `py-2` clears the accessibility
 * minimum with room to spare while keeping the small-print look.
 */
const linkClass =
  'rounded-sm transition-colors hover:text-text focus-visible:ring-2 focus-visible:ring-accent/60 focus-visible:outline-none pointer-coarse:inline-flex pointer-coarse:items-center pointer-coarse:py-2';

/**
 * Small print for the signed-in rail: one wrapped run of links with the
 * copyright as the last item, no group headings. Grouping is for the public
 * footer, where the extra structure earns its height.
 */
export function RailFooterLinks() {
  const year = new Date().getFullYear();

  return (
    <nav
      aria-label="Site information"
      // Taller rows on touch need the wrap gap opened up too, so two stacked
      // rows of links do not present adjacent hit areas with nothing between.
      className="flex flex-wrap gap-x-2.5 gap-y-1 border-t border-border pt-4 text-[11px] leading-relaxed text-text-muted pointer-coarse:gap-x-4 pointer-coarse:gap-y-0"
    >
      {railFooterLinks.map((link) => (
        <Link key={link.to} to={link.to} className={linkClass}>
          {link.label}
        </Link>
      ))}
      <PrivacyChoicesButton className={linkClass} />
      <span>
        © {year} {siteConfig.title}
      </span>
    </nav>
  );
}
