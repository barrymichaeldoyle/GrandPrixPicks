import { CalendarDays, Globe, Trophy, Users } from 'lucide-react';

export const TIME_SCOPE_OPTIONS = [
  { value: 'weekend', label: 'Race Weekend', leftIcon: CalendarDays },
  { value: 'season', label: 'Season', leftIcon: Trophy },
] as const;

export const SCOPE_OPTIONS = [
  { value: 'global', label: 'Global', leftIcon: Globe },
  { value: 'following', label: 'Following', leftIcon: Users },
] as const;
