import type { ResultsEmailShellProps } from './ResultsEmail.shared';
import { ResultsEmailShell } from './ResultsEmail.shared';

export type SessionResultsPostRaceMadePredictionsEmailProps = {
  raceName?: string;
  sessionLabel?: string;
  raceUrl?: string;
  nextRaceName?: string;
  nextRaceUrl?: string;
  settingsUrl?: string;
  logoUrl?: string;
  round?: number;
  countryCode?: string | null;
  hasSprint?: boolean;
};

export function SessionResultsPostRaceMadePredictionsEmail({
  raceName = 'Australian Grand Prix',
  sessionLabel = 'Race',
  raceUrl = 'https://grandprixpicks.com/races/australia-2026',
  nextRaceName,
  nextRaceUrl,
  settingsUrl = 'https://grandprixpicks.com/settings',
  logoUrl = 'https://grandprixpicks.com/logo-email.png',
  round = 1,
  countryCode = 'au',
  hasSprint = false,
}: SessionResultsPostRaceMadePredictionsEmailProps) {
  const props: ResultsEmailShellProps = {
    previewText: `${sessionLabel} results are ready in Grand Prix Picks`,
    headline: `Your ${sessionLabel} results are ready`,
    intro: nextRaceName
      ? `Open Grand Prix Picks to see how the weekend finished, then get straight into ${nextRaceName}. Predictions for the next race are already open.`
      : 'Open Grand Prix Picks to see how the weekend finished and where you landed.',
    raceName,
    raceUrl,
    settingsUrl,
    logoUrl,
    round,
    countryCode,
    hasSprint,
    primaryCtaLabel: 'See Weekend Result',
    secondaryCtaLabel: nextRaceUrl ? 'Make Next Race Picks' : undefined,
    secondaryCtaUrl: nextRaceUrl,
    helperText: nextRaceName
      ? `${nextRaceName} is open for predictions now.`
      : undefined,
    footerText:
      "You're receiving this because you have result notifications enabled.",
  };

  return <ResultsEmailShell {...props} />;
}

export default function Preview() {
  return <SessionResultsPostRaceMadePredictionsEmail />;
}
