import type { Driver } from '../types';

export const mockDrivers: ReadonlyArray<Driver> = [
  { code: 'NOR', fullName: 'Lando Norris', id: 'nor', team: 'McLaren' },
  { code: 'PIA', fullName: 'Oscar Piastri', id: 'pia', team: 'McLaren' },
  { code: 'LEC', fullName: 'Charles Leclerc', id: 'lec', team: 'Ferrari' },
  { code: 'HAM', fullName: 'Lewis Hamilton', id: 'ham', team: 'Ferrari' },
  {
    code: 'VER',
    fullName: 'Max Verstappen',
    id: 'ver',
    team: 'Red Bull Racing',
  },
  { code: 'TSU', fullName: 'Yuki Tsunoda', id: 'tsu', team: 'Red Bull Racing' },
  { code: 'RUS', fullName: 'George Russell', id: 'rus', team: 'Mercedes' },
  {
    code: 'ANT',
    fullName: 'Andrea Kimi Antonelli',
    id: 'ant',
    team: 'Mercedes',
  },
  { code: 'ALO', fullName: 'Fernando Alonso', id: 'alo', team: 'Aston Martin' },
  { code: 'STR', fullName: 'Lance Stroll', id: 'str', team: 'Aston Martin' },
  { code: 'GAS', fullName: 'Pierre Gasly', id: 'gas', team: 'Alpine' },
  { code: 'DOO', fullName: 'Jack Doohan', id: 'doo', team: 'Alpine' },
  { code: 'ALB', fullName: 'Alexander Albon', id: 'alb', team: 'Williams' },
  { code: 'SAI', fullName: 'Carlos Sainz', id: 'sai', team: 'Williams' },
  { code: 'LAW', fullName: 'Liam Lawson', id: 'law', team: 'Racing Bulls' },
  { code: 'HAD', fullName: 'Isack Hadjar', id: 'had', team: 'Racing Bulls' },
  { code: 'HUL', fullName: 'Nico Hulkenberg', id: 'hul', team: 'Audi' },
  { code: 'BOR', fullName: 'Gabriel Bortoleto', id: 'bor', team: 'Audi' },
  { code: 'OCO', fullName: 'Esteban Ocon', id: 'oco', team: 'Haas' },
  { code: 'BEA', fullName: 'Oliver Bearman', id: 'bea', team: 'Haas' },
];
