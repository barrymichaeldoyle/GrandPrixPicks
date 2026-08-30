import { Link } from '@tanstack/react-router';

export function ScoringPolicyNote({ className = '' }: { className?: string }) {
  return (
    <p className={className}>
      Grid penalties don’t change qualifying results.{' '}
      <Link
        to="/results-policy"
        hash="sessions-heading"
        className="gpp-touch-target font-semibold whitespace-nowrap text-text underline decoration-border-strong underline-offset-4 hover:text-accent"
      >
        How scoring works
      </Link>
    </p>
  );
}
