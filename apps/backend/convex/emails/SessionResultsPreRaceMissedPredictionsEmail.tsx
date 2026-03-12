import type { ResultsEmailShellProps } from './ResultsEmail.shared';
import { ResultsEmailShell } from './ResultsEmail.shared';

export type SessionResultsPreRaceMissedPredictionsEmailProps = {
  raceName?: string;
  sessionLabel?: string;
  raceUrl?: string;
  settingsUrl?: string;
  logoUrl?: string;
  round?: number;
  countryCode?: string | null;
  hasSprint?: boolean;
};

export function SessionResultsPreRaceMissedPredictionsEmail({
  raceName = 'Australian Grand Prix',
  sessionLabel = 'Qualifying',
  raceUrl = 'https://grandprixpicks.com/races/australia-2026?tab=race',
  settingsUrl = 'https://grandprixpicks.com/settings',
  logoUrl = 'https://grandprixpicks.com/logo-email.png',
  round = 1,
  countryCode = 'au',
  hasSprint = false,
}: SessionResultsPreRaceMissedPredictionsEmailProps) {
  const props: ResultsEmailShellProps = {
    previewText: `${sessionLabel} is done. Race predictions are still open.`,
    headline: `${sessionLabel} is done. Race picks are still open.`,
    intro: `The next points are still on the table. Open Grand Prix Picks and lock in your race predictions while you still can.`,
    raceName,
    raceUrl,
    settingsUrl,
    logoUrl,
    round,
    countryCode,
    hasSprint,
    primaryCtaLabel: 'Make Race Picks',
    helperText: 'You can still change your race picks until the race starts.',
    footerText:
      "You're receiving this because you have email notifications enabled.",
  };

  return <ResultsEmailShell {...props} />;
}

export default function Preview() {
  return <SessionResultsPreRaceMissedPredictionsEmail />;
}
