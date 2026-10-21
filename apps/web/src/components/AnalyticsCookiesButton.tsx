import { setAnalyticsCookies, useAnalyticsCookieChoice } from '@/lib/consent';

/**
 * Footer control for visitors inside the EEA, the UK and Switzerland, who are
 * measured cookieless unless they allow a cookie here. It renders nothing for
 * everyone else, and nothing until the region is known, so there is never a
 * dead control. The state is in the label because a toggle with no label
 * would need a sentence beside it to say what it toggles.
 */
export function AnalyticsCookiesButton({ className }: { className?: string }) {
  const { inScope, cookies } = useAnalyticsCookieChoice();
  if (!inScope) {
    return null;
  }
  return (
    <button
      type="button"
      className={className}
      aria-pressed={cookies}
      onClick={() => setAnalyticsCookies(!cookies)}
    >
      Analytics cookies: {cookies ? 'on' : 'off'}
    </button>
  );
}
