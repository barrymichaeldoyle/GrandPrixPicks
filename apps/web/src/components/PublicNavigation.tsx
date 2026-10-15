import { Link } from '@tanstack/react-router';
import { Menu } from 'lucide-react';
import { useEffect, useRef } from 'react';

const destinations = [
  { to: '/races', label: 'Race calendar' },
  { to: '/leaderboard', label: 'Leaderboard' },
  { to: '/leagues', label: 'Leagues' },
  { to: '/how-to-play', label: 'How to play' },
] as const;

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
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) {
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
        {destinations.map(({ to, label }) => (
          <Link
            key={to}
            to={to}
            className="flex min-h-11 items-center rounded-sm px-3 text-sm text-text-muted hover:bg-surface-hover hover:text-text"
            activeProps={{ className: 'bg-surface-elevated text-text' }}
            onClick={() => disclosure.current?.removeAttribute('open')}
          >
            {label}
          </Link>
        ))}
      </nav>
    </details>
  );
}
