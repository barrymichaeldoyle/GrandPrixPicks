import { useRouter } from '@tanstack/react-router';
import { ArrowLeft } from 'lucide-react';
import type { MouseEvent, ReactNode } from 'react';

type InAppBackLinkProps = {
  fallbackHref: string;
  children: ReactNode;
  className?: string;
};

/**
 * Returns to the previous client-side location when there is one. Direct visits
 * and search landings use the supplied parent route instead.
 */
export function InAppBackLink({
  fallbackHref,
  children,
  className,
}: InAppBackLinkProps) {
  const router = useRouter();

  function handleClick(event: MouseEvent<HTMLAnchorElement>) {
    if (event.defaultPrevented || event.button !== 0) {
      return;
    }
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
      return;
    }

    const state = window.history.state as { __TSR_index?: number } | null;
    if ((state?.__TSR_index ?? 0) <= 0) {
      return;
    }

    event.preventDefault();
    router.history.back();
  }

  return (
    <a href={fallbackHref} onClick={handleClick} className={className}>
      <ArrowLeft className="h-4 w-4" aria-hidden />
      {children}
    </a>
  );
}
