import {
  CalendarDays,
  Globe,
  Layers,
  Swords,
  Trophy,
  Users,
} from 'lucide-react';

export const TIME_SCOPE_OPTIONS = [
  { value: 'weekend', label: 'Race Weekend', leftIcon: CalendarDays },
  { value: 'season', label: 'Season', leftIcon: Trophy },
] as const;

export const GAME_MODE_OPTIONS = [
  { value: 'combined', label: 'Combined', leftIcon: Layers },
  { value: 'top5', label: 'Top 5', leftIcon: Trophy },
  { value: 'h2h', label: 'H2H', leftIcon: Swords },
] as const;

export const SCOPE_OPTIONS = [
  { value: 'global', label: 'Global', leftIcon: Globe },
  { value: 'following', label: 'Following', leftIcon: Users },
] as const;
