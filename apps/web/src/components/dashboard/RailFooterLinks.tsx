import { Link, useLocation } from '@tanstack/react-router';

import { showsGlobalFooter } from '@/lib/globalFooter';
import { useViewerSession } from '@/integrations/clerk/useViewerSession';
import { railFooterLinks } from '@/lib/navigation';
import { siteConfig } from '@/lib/site';
import { PrivacyChoicesButton } from '@/components/PrivacyChoicesButton';
import { FriendGameLink } from '@/components/FriendGameLink';

/**
 * Deliberately sized to WCAG 2.2 AA (24x24 CSS px) rather than the 44px touch
 * target the rest of the dashboard uses.
 *
 * Eight wrapped small-print links at 44px each would be a footer several
 * hundred pixels tall on a phone, dwarfing the content above it, and these are
 * rarely-tapped legal destinations rather than anything on the primary path.
 * The links were 18px, which failed both bars; `py-2` clears the accessibility
 * minimum with room to spare while keeping the small-print look.
 *
 * That padding is not gated on `pointer-coarse`. It was, and the effect was to
 * meet 2.5.8 on phones and miss it everywhere else: the success criterion is
 * about pointer targets, not touch targets, so a mouse user reading the rail at
 * 18px tall rows failed the same check a thumb passed. `inline-flex` comes
 * along for the ride because vertical padding on an inline `<a>` paints without
 * changing the line box it is measured in.
 */
const linkClass =
  'inline-flex items-center rounded-sm py-2 transition-colors hover:text-text focus-visible:ring-2 focus-visible:ring-accent/60 focus-visible:outline-none';

/**
 * Small print for the signed-in rail: one wrapped run of links with the
 * copyright as the last item, no group headings. Grouping is for the public
 * footer, where the extra structure earns its height.
 *
 * Renders nothing on the pages that keep the real footer. Several rail layouts
 * mount this, and most of them sit on pages that also end in the global footer,
 * which stacked the same links twice. Deciding here rather than at each call
 * site means a rail cannot reintroduce the duplicate by being added to one more
 * page: see {@link showsGlobalFooter}.
 */
export function RailFooterLinks() {
  const pathname = useLocation({ select: (location) => location.pathname });
  const { isSignedIn } = useViewerSession();
  const year = new Date().getFullYear();

  if (showsGlobalFooter(pathname, isSignedIn)) {
    return null;
  }

  return (
    // The border and top padding moved off the <nav> when the outbound link
    // joined it: the rule separates the rail's content from all of the small
    // print, not just from the navigation half of it.
    <div className="space-y-1 border-t border-border pt-4 text-[11px] leading-relaxed text-text-muted">
      <FriendGameLink linkClassName={linkClass} />
      <nav
        aria-label="Site information"
        // Taller rows on touch need the wrap gap opened up too, so two stacked
        // rows of links do not present adjacent hit areas with nothing between.
        className="flex flex-wrap gap-x-2.5 gap-y-1 pointer-coarse:gap-x-4 pointer-coarse:gap-y-0"
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
    </div>
  );
}
