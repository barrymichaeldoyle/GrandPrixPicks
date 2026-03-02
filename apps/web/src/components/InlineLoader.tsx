import { Loader2 } from 'lucide-react';

/** Centered spinner for inline/section loading states (e.g. while a query is loading). */
export function InlineLoader() {
  return (
    <div className="flex items-center justify-center py-12">
      <Loader2 className="h-6 w-6 animate-spin text-accent" />
    </div>
  );
}
