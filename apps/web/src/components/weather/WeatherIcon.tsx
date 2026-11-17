import {
  Cloud,
  CloudFog,
  CloudLightning,
  CloudMoon,
  CloudRain,
  CloudSun,
  Moon,
  Snowflake,
  Sun,
} from 'lucide-react';

import { normalizeConditionCode } from '@/lib/weatherPresentation';

export function WeatherIcon({
  conditionCode,
  className = 'h-5 w-5',
}: {
  conditionCode: string;
  className?: string;
}) {
  const condition = normalizeConditionCode(conditionCode);
  // MET Norway marks the hours after dark. A sun beside Las Vegas qualifying
  // at 8pm, or any night race, says the wrong thing.
  const night = /_night$/i.test(conditionCode);
  const props = { className, 'aria-hidden': true as const };

  if (condition.includes('thunder')) {
    return <CloudLightning {...props} />;
  }
  if (condition.includes('rain')) {
    return <CloudRain {...props} />;
  }
  if (condition.includes('snow') || condition.includes('sleet')) {
    return <Snowflake {...props} />;
  }
  if (condition.includes('fog')) {
    return <CloudFog {...props} />;
  }
  if (condition.includes('partlycloudy') || condition.includes('fair')) {
    return night ? <CloudMoon {...props} /> : <CloudSun {...props} />;
  }
  if (condition.includes('cloudy')) {
    return <Cloud {...props} />;
  }
  return night ? <Moon {...props} /> : <Sun {...props} />;
}
