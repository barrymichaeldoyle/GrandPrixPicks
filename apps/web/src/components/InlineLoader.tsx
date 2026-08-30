import { Loader2 } from 'lucide-react';

/**
 * Centered spinner for inline / section loading states.
 *
 * The house style for "this part of the page has not answered yet" is a single
 * quiet circle, not a mosaic of pulsing bars. Block skeletons were tried on the
 * dashboard and the feed and read as the real thing arriving twice: a shape
 * appears, throbs, then is replaced by different content. One spinner says
 * "wait" once and swaps out cleanly.
 *
 * Space is still reserved by the caller wherever a shift would be expensive
 * (see `WeekendCardSkeleton`); this component only draws the wait itself.
 */
export function InlineLoader({
  /** Announced to assistive tech; say what is loading when the context is not obvious. */
  label = 'Loading',
  /** Vertical room the spinner sits in. Override to match the block it stands in for. */
  className = 'py-12',
  size = 'md',
}: {
  label?: string;
  className?: string;
  size?: 'sm' | 'md';
} = {}) {
  return (
    <div
      className={`flex items-center justify-center ${className}`}
      role="status"
      aria-label={label}
    >
      <Loader2
        className={`${size === 'sm' ? 'h-4 w-4' : 'h-6 w-6'} animate-spin text-accent motion-reduce:animate-none`}
        aria-hidden
      />
    </div>
  );
}
