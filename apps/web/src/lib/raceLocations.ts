/**
 * Circuit locations for SportsEvent structured data (JSON-LD) on race pages.
 * Google requires `location` for event rich results. Keyed by the race slug
 * without its season suffix ("britain-2026" → "britain") so entries carry
 * over between seasons. New venues need a new entry here.
 */

export type RaceLocation = {
  circuit: string;
  locality: string;
  country: string;
};

const RACE_LOCATIONS: Record<string, RaceLocation> = {
  australia: {
    circuit: 'Albert Park Circuit',
    locality: 'Melbourne',
    country: 'Australia',
  },
  china: {
    circuit: 'Shanghai International Circuit',
    locality: 'Shanghai',
    country: 'China',
  },
  japan: {
    circuit: 'Suzuka International Racing Course',
    locality: 'Suzuka',
    country: 'Japan',
  },
  bahrain: {
    circuit: 'Bahrain International Circuit',
    locality: 'Sakhir',
    country: 'Bahrain',
  },
  'saudi-arabia': {
    circuit: 'Jeddah Corniche Circuit',
    locality: 'Jeddah',
    country: 'Saudi Arabia',
  },
  miami: {
    circuit: 'Miami International Autodrome',
    locality: 'Miami',
    country: 'United States',
  },
  emilia: {
    circuit: 'Autodromo Enzo e Dino Ferrari',
    locality: 'Imola',
    country: 'Italy',
  },
  canada: {
    circuit: 'Circuit Gilles Villeneuve',
    locality: 'Montreal',
    country: 'Canada',
  },
  monaco: {
    circuit: 'Circuit de Monaco',
    locality: 'Monte Carlo',
    country: 'Monaco',
  },
  spain: {
    circuit: 'Circuit de Barcelona-Catalunya',
    locality: 'Barcelona',
    country: 'Spain',
  },
  austria: {
    circuit: 'Red Bull Ring',
    locality: 'Spielberg',
    country: 'Austria',
  },
  britain: {
    circuit: 'Silverstone Circuit',
    locality: 'Silverstone',
    country: 'United Kingdom',
  },
  belgium: {
    circuit: 'Circuit de Spa-Francorchamps',
    locality: 'Stavelot',
    country: 'Belgium',
  },
  hungary: {
    circuit: 'Hungaroring',
    locality: 'Budapest',
    country: 'Hungary',
  },
  netherlands: {
    circuit: 'Circuit Zandvoort',
    locality: 'Zandvoort',
    country: 'Netherlands',
  },
  italy: {
    circuit: 'Autodromo Nazionale Monza',
    locality: 'Monza',
    country: 'Italy',
  },
  madrid: {
    circuit: 'Madring',
    locality: 'Madrid',
    country: 'Spain',
  },
  azerbaijan: {
    circuit: 'Baku City Circuit',
    locality: 'Baku',
    country: 'Azerbaijan',
  },
  singapore: {
    circuit: 'Marina Bay Street Circuit',
    locality: 'Singapore',
    country: 'Singapore',
  },
  usa: {
    circuit: 'Circuit of the Americas',
    locality: 'Austin',
    country: 'United States',
  },
  mexico: {
    circuit: 'Autódromo Hermanos Rodríguez',
    locality: 'Mexico City',
    country: 'Mexico',
  },
  brazil: {
    circuit: 'Autódromo José Carlos Pace',
    locality: 'São Paulo',
    country: 'Brazil',
  },
  'las-vegas': {
    circuit: 'Las Vegas Strip Circuit',
    locality: 'Las Vegas',
    country: 'United States',
  },
  qatar: {
    circuit: 'Lusail International Circuit',
    locality: 'Lusail',
    country: 'Qatar',
  },
  'abu-dhabi': {
    circuit: 'Yas Marina Circuit',
    locality: 'Abu Dhabi',
    country: 'United Arab Emirates',
  },
};

export function getRaceLocation(slug: string): RaceLocation | null {
  return RACE_LOCATIONS[slug.replace(/-\d{4}$/, '')] ?? null;
}
