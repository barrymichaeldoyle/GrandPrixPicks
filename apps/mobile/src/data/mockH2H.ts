import type { H2HMatchup } from '../types';

export const mockH2HMatchups: ReadonlyArray<H2HMatchup> = [
  { driverAId: 'nor', driverBId: 'pia', id: 'h2h-mcl', team: 'McLaren' },
  { driverAId: 'lec', driverBId: 'ham', id: 'h2h-fer', team: 'Ferrari' },
  {
    driverAId: 'ver',
    driverBId: 'tsu',
    id: 'h2h-rbr',
    team: 'Red Bull Racing',
  },
  { driverAId: 'rus', driverBId: 'ant', id: 'h2h-mer', team: 'Mercedes' },
  { driverAId: 'alo', driverBId: 'str', id: 'h2h-ast', team: 'Aston Martin' },
  { driverAId: 'gas', driverBId: 'doo', id: 'h2h-alp', team: 'Alpine' },
  { driverAId: 'alb', driverBId: 'sai', id: 'h2h-wil', team: 'Williams' },
  {
    driverAId: 'law',
    driverBId: 'had',
    id: 'h2h-rb',
    team: 'Racing Bulls',
  },
  { driverAId: 'hul', driverBId: 'bor', id: 'h2h-aud', team: 'Audi' },
  { driverAId: 'oco', driverBId: 'bea', id: 'h2h-haa', team: 'Haas' },
];
