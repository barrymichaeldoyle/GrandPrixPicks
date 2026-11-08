import { ChevronDown } from 'lucide-react';
import { useState, type ReactNode } from 'react';

/**
 * An editorial section that folds on a phone and reads in full elsewhere.
 *
 * The leaderboard and leagues pages close with a few paragraphs of prose
 * that earn their place on a wide screen and ran a phone past 5,000px after
 * the thing the player came for. The heading becomes the control below
 * `sm`; above it the heading is a plain `h2` and the copy is open. The copy
 * is in the HTML in both states, so what a crawler reads does not change.
 */
export function ProseFold({
  id,
  title,
  className = '',
  children,
}: {
  /** Ties the control to the folded copy for assistive tech. */
  id: string;
  title: string;
  className?: string;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <section className={className}>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen((value) => !value)}
        className="font-title flex min-h-11 w-full items-center justify-between gap-3 border-y border-border text-left text-lg font-semibold text-text sm:hidden"
      >
        {title}
        <ChevronDown
          className={`h-5 w-5 shrink-0 text-text-muted transition-transform ${open ? 'rotate-180' : ''}`}
          aria-hidden
        />
      </button>
      <h2 className="font-title hidden text-2xl font-semibold text-text sm:block">
        {title}
      </h2>
      <div id={id} className={open ? '' : 'max-sm:hidden'}>
        {children}
      </div>
    </section>
  );
}
