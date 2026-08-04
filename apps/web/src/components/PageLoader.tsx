import { Loader2 } from 'lucide-react';

export function PageLoader() {
  return (
    <div
      role="status"
      className="flex min-h-screen items-center justify-center bg-page"
    >
      <Loader2 className="h-8 w-8 animate-spin text-accent" aria-hidden />
      <span className="sr-only">Loading</span>
    </div>
  );
}
