import type { ResultsEmailShellProps } from './ResultsEmail.shared';
import { ResultsEmailShell } from './ResultsEmail.shared';

export type SessionResultsPreRaceMadePredictionsEmailProps = {
  raceName?: string;
  sessionLabel?: string;
  raceUrl?: string;
  racePredictionUrl?: string;
  settingsUrl?: string;
  logoUrl?: string;
  round?: number;
  countryCode?: string | null;
  hasSprint?: boolean;
  racePredictionCtaLabel?: string;
};

export function SessionResultsPreRaceMadePredictionsEmail({
  raceName = 'Australian Grand Prix',
  sessionLabel = 'Qualifying',
  raceUrl = 'https://grandprixpicks.com/races/australia-2026',
  racePredictionUrl = 'https://grandprixpicks.com/races/australia-2026?tab=race',
  settingsUrl = 'https://grandprixpicks.com/settings',
  logoUrl = 'https://grandprixpicks.com/logo-email.png',
  round = 1,
  countryCode = 'au',
  hasSprint = false,
  racePredictionCtaLabel = 'Review Race Picks',
}: SessionResultsPreRaceMadePredictionsEmailProps) {
  const props: ResultsEmailShellProps = {
    previewText: `${sessionLabel} results are ready in Grand Prix Picks`,
    headline: `Your ${sessionLabel} results are ready`,
    intro: `Open Grand Prix Picks to see how your ${sessionLabel.toLowerCase()} picks landed, then make any last race changes before the start.`,
    raceName,
    raceUrl,
    settingsUrl,
    logoUrl,
    round,
    countryCode,
    hasSprint,
    primaryCtaLabel: 'See My Score',
    secondaryCtaLabel: racePredictionUrl ? racePredictionCtaLabel : undefined,
    secondaryCtaUrl: racePredictionUrl,
    helperText: racePredictionUrl
      ? 'You can still change your race picks until the race starts.'
      : undefined,
    footerText:
      "You're receiving this because you have result notifications enabled.",
  };

  return <ResultsEmailShell {...props} />;
}

export default function Preview() {
  return <SessionResultsPreRaceMadePredictionsEmail />;
}
