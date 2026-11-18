import { Link } from '@tanstack/react-router';
import type { LucideIcon } from 'lucide-react';
import { BookOpen, CalendarDays, Menu, Trophy, Users } from 'lucide-react';
import { useEffect, useRef } from 'react';

// Leaderboard and Leagues use the same icons as the signed-in tab bar
// (`APP_NAV_TABS`), so a page looks the same signed in or out.
const destinations: readonly {
  to: string;
  label: string;
  icon: LucideIcon;
}[] = [
  { to: '/races', label: 'Race calendar', icon: CalendarDays },
  { to: '/leaderboard', label: 'Leaderboard', icon: Trophy },
  { to: '/leagues', label: 'Leagues', icon: Users },
  { to: '/how-to-play', label: 'How to play', icon: BookOpen },
];

/** A disclosure with ordinary links, so native tab and link behavior applies. */
export function PublicNavigation() {
  const disclosure = useRef<HTMLDetailsElement>(null);
  useEffect(() => {
    function closeOutside(event: PointerEvent) {
      if (
        event.target instanceof Node &&
        !disclosure.current?.contains(event.target)
      ) {
        disclosure.current?.removeAttribute('open');
      }
    }
    document.addEventListener('pointerdown', closeOutside);
    return () => document.removeEventListener('pointerdown', closeOutside);
  }, []);

  return (
    <details
      ref={disclosure}
      className="relative"
      onKeyDown={(event) => {
        if (event.key === 'Escape' && disclosure.current?.open) {
          disclosure.current.open = false;
          disclosure.current.querySelector('summary')?.focus();
        }
      }}
      // Close only when focus moves to something known to be outside. Safari
      // focuses the <summary> on tap but never focuses a link, so tapping a
      // destination blurs with `relatedTarget` null. Closing then hid the menu
      // between pointerdown and click, and the tap went nowhere. A pointer press
      // outside is handled by `closeOutside` above.
      onBlur={(event) => {
        const next = event.relatedTarget;
        if (next instanceof Node && !event.currentTarget.contains(next)) {
          event.currentTarget.open = false;
        }
      }}
    >
      <summary className="flex min-h-11 min-w-11 cursor-pointer list-none items-center justify-center rounded-sm text-text-muted hover:bg-surface hover:text-text [&::-webkit-details-marker]:hidden">
        <Menu size={20} aria-hidden="true" />
        <span className="sr-only">Browse Grand Prix Picks</span>
      </summary>
      <nav
        aria-label="Browse Grand Prix Picks"
        className="absolute top-full right-0 z-50 mt-2 w-56 max-w-[calc(100vw-2rem)] rounded-lg border border-border bg-surface p-2"
      >
        {destinations.map(({ to, label, icon: Icon }) => (
          <Link
            key={to}
            to={to}
            className="flex min-h-11 items-center gap-3 rounded-sm px-3 text-sm text-text-muted hover:bg-surface-hover hover:text-text"
            activeProps={{ className: 'bg-surface-elevated text-text' }}
            onClick={() => disclosure.current?.removeAttribute('open')}
          >
            <Icon size={18} aria-hidden="true" className="shrink-0" />
            {label}
          </Link>
        ))}
      </nav>
    </details>
  );
}
