import type { RaceWeather } from '@/lib/weatherPresentation';

function formatUpdated(timestamp: number, now: number): string {
  const minutes = Math.max(0, Math.round((now - timestamp) / 60_000));
  if (minutes < 2) {
    return 'just now';
  }
  if (minutes < 60) {
    return `${minutes} min ago`;
  }
  const hours = Math.round(minutes / 60);
  return `${hours} ${hours === 1 ? 'hour' : 'hours'} ago`;
}

/**
 * The provider's credit and licence, which its terms require wherever its
 * numbers appear — so it sits on the card and again in the hours modal, which
 * a reader can have open with the card scrolled away behind it.
 */
export function WeatherAttribution({
  weather,
  now,
  className = '',
}: {
  weather: RaceWeather;
  now: number;
  className?: string;
}) {
  const { forecast, attribution } = weather;
  return (
    <p className={`text-xs leading-5 text-text-muted ${className}`}>
      <a
        href={attribution.url}
        target="_blank"
        rel="noreferrer"
        className="font-semibold text-text underline decoration-border-strong underline-offset-4 hover:text-accent"
      >
        {attribution.name}
      </a>{' '}
      ·{' '}
      <a
        href={attribution.licenseUrl}
        target="_blank"
        rel="noreferrer"
        className="underline decoration-border-strong underline-offset-4 hover:text-text"
      >
        {attribution.licenseName}
      </a>{' '}
      · updated {formatUpdated(forecast.checkedAt, now)}
    </p>
  );
}
