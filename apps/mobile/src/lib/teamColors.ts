// F1 2026 team colors — mirrors apps/web/src/components/DriverBadge.tsx
const TEAM_COLORS: Record<string, string> = {
  Mercedes: '#00D7B6',
  McLaren: '#F47600',
  Ferrari: '#ED1131',
  'Red Bull Racing': '#4781D7',
  Williams: '#1868DB',
  Alpine: '#00A1E8',
  Audi: '#F50537',
  'Racing Bulls': '#6C98FF',
  Haas: '#9C9FA2',
  'Aston Martin': '#229971',
  Cadillac: '#909090',
};

export function getTeamColor(team?: string | null): string {
  return (team && TEAM_COLORS[team]) ?? '#555';
}
