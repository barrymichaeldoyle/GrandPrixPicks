import {
  ArrowLeftRight,
  CalendarDays,
  ListOrdered,
  MapPin,
  Swords,
  Timer,
} from 'lucide-react';
import { Link } from '@tanstack/react-router';

/**
 * Destinations with no other home in the signed-in chrome.
 *
 * Leaderboard and Leagues used to sit here too, and left when they became
 * header tabs (and mobile tab bar items); "My Results" left with them, since it
 * pointed at `/me` — the same profile page the account menu's Profile row
 * opens. A rail card that repeats the navigation bar above it is just a second
 * chance to click the same thing.
 */
const gameLinks = [
  { to: '/races' as const, label: 'Race calendar', icon: CalendarDays },
];

/**
 * Real F1 reference pages, promoted out of the rail footer: they are
 * destinations a signed-in fan actually visits, not small print.
 */
const f1Links = [
  { to: '/f1-standings' as const, label: 'F1 standings', icon: ListOrdered },
  {
    to: '/f1-qualifying-standings' as const,
    label: 'Qualifying championship',
    icon: Timer,
  },
  {
    to: '/f1-team-mate-battles' as const,
    label: 'Team-mate battles',
    icon: Swords,
  },
  { to: '/circuits' as const, label: 'F1 circuits', icon: MapPin },
  {
    to: '/f1-2027-driver-line-up' as const,
    label: '2027 driver line-up',
    icon: ArrowLeftRight,
  },
];

// Nav rows land at 37px from padding alone, which is short of the touch
// target for a list people scan and tap one-handed.
const itemClass =
  'flex items-center gap-2.5 rounded-sm px-2.5 py-2 text-sm font-medium text-text transition-colors hover:bg-surface-muted/60 hover:text-accent pointer-coarse:min-h-11';

export function QuickLinksCard() {
  return (
    <nav
      aria-label="Quick links"
      className="rounded-lg border border-border bg-surface p-2"
    >
      <ul className="space-y-0.5">
        {gameLinks.map(({ to, label, icon: Icon }) => (
          <li key={to}>
            <Link to={to} className={itemClass}>
              <Icon className="h-4 w-4 shrink-0 text-text-muted" aria-hidden />
              {label}
            </Link>
          </li>
        ))}
      </ul>
      <ul className="mt-1 space-y-0.5 border-t border-border pt-1">
        {f1Links.map(({ to, label, icon: Icon }) => (
          <li key={to}>
            <Link to={to} className={itemClass}>
              <Icon className="h-4 w-4 shrink-0 text-text-muted" aria-hidden />
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
