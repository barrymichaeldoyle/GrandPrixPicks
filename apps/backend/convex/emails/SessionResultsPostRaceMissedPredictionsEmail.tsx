import {
  ResultsEmailShell,
  type ResultsEmailShellProps,
} from './ResultsEmail.shared';

export type SessionResultsPostRaceMissedPredictionsEmailProps = {
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

export function SessionResultsPostRaceMissedPredictionsEmail({
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
}: SessionResultsPostRaceMissedPredictionsEmailProps) {
  const props: ResultsEmailShellProps = {
    previewText: nextRaceName
      ? `${sessionLabel} is done. ${nextRaceName} predictions are open.`
      : `${sessionLabel} is done in Grand Prix Picks`,
    headline: nextRaceName
      ? `${sessionLabel} is done. The next race is open.`
      : `${sessionLabel} is done`,
    intro: nextRaceName
      ? `${nextRaceName} is already open for predictions. Open Grand Prix Picks, catch up on the weekend, and get your next picks in early.`
      : 'Open Grand Prix Picks to catch up on the weekend and get ready for the next one.',
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
    footerText: "You're receiving this because you have email notifications enabled.",
  };

  return <ResultsEmailShell {...props} />;
}

export default function Preview() {
  return <SessionResultsPostRaceMissedPredictionsEmail />;
}
