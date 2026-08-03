import { Link } from '@tanstack/react-router';
import { CheckCircle2, Ticket } from 'lucide-react';
import { SettingsSection } from '@/components/SettingsSection';

export function SeasonPassSection({
  season,
  hasSeasonPass,
}: {
  season: number;
  hasSeasonPass: boolean | undefined;
}) {
  if (hasSeasonPass !== true) {
    return null;
  }

  return (
    <SettingsSection
      id="season-pass"
      title="Season Pass"
      icon={<Ticket className="h-5 w-5 text-accent" />}
      headerRight={
        <Link
          to="/leagues"
          className="text-sm font-medium text-accent hover:underline"
        >
          Manage leagues
        </Link>
      }
    >
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
    </SettingsSection>
  );
}
