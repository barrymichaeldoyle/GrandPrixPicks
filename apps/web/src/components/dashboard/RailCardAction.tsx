import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

/**
 * The single action at the foot of a rail card.
 *
 * Not a button. An outlined `secondary` button inset by the card's own padding
 * draws a second rounded rectangle in the same stroke as the card it sits in,
 * one step inside it, which is the box-in-a-box look this direction does not
 * want. The row is flush to the card edges instead and separated by the card's
 * own rule, so the card reads as one object with a footer rather than a frame
 * around a smaller frame.
 *
 * It keeps everything the button was carrying: full width, a 44px touch
 * target, a hover state, and accent weight so the action is still the loudest
 * thing in the card.
 *
 * Exported as a class so a `<Link>` can be the row itself. Wrapping a link in
 * a styled div would put the padding on the wrapper and leave the tap target
 * the size of the text.
 */
export const railCardActionClass =
  'flex w-full items-center justify-center gap-2 border-t border-border px-4 py-3 text-sm font-semibold text-accent transition-colors hover:bg-surface-elevated hover:text-accent-hover focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-focus-ring focus-visible:outline-none pointer-coarse:min-h-11';

export function RailCardAction({
  icon: Icon,
  children,
  onClick,
}: {
  icon?: LucideIcon;
  children: ReactNode;
  onClick: () => void;
}) {
  return (
    <button type="button" className={railCardActionClass} onClick={onClick}>
      {Icon ? <Icon className="h-4 w-4 shrink-0" aria-hidden /> : null}
      {children}
    </button>
  );
}
