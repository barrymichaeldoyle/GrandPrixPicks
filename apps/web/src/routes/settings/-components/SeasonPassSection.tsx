import { Link } from '@tanstack/react-router';
import { ArrowRight, CheckCircle2, Ticket } from 'lucide-react';

import { Button } from '@/components/Button/Button';
import { SettingsSection } from '@/components/SettingsSection';

export function SeasonPassSection({
  season,
  hasSeasonPass,
}: {
  season: number;
  hasSeasonPass: boolean | undefined;
}) {
  const isLoading = hasSeasonPass === undefined;
  const isActive = hasSeasonPass === true;

  return (
    <SettingsSection
      id="season-pass"
      title="Season Pass"
      icon={<Ticket className="h-5 w-5 text-text-muted" />}
      headerRight={
        isActive ? (
          <Link
            to="/leagues"
            className="text-sm font-medium text-accent hover:underline"
          >
            Manage leagues
          </Link>
        ) : null
      }
    >
      {isActive ? (
        <div className="space-y-3">
          <div className="flex items-start gap-2 text-success">
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />
            <div>
              <p className="font-semibold text-text">Active for {season}</p>
              <p className="text-sm text-text-muted">
                Your season pass is active. Unlimited league joins and public
                league creation are unlocked.
              </p>
            </div>
          </div>
        </div>
      ) : isLoading ? (
        <div className="space-y-3">
          <div className="h-4 w-2/3 animate-pulse rounded bg-surface-muted" />
          <div className="h-9 w-52 animate-pulse rounded-lg bg-surface-muted" />
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-sm text-text-muted">
            Upgrade to unlock unlimited league joins and public league creation
            for the full {season} season.
          </p>
          <Button asChild size="sm" rightIcon={ArrowRight}>
            <Link to="/pricing">See Season Pass Pricing</Link>
          </Button>
        </div>
      )}
    </SettingsSection>
  );
}
