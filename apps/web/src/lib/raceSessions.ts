import type { Doc } from '@convex-generated/dataModel';

import type { SessionType } from './sessions';

export function getRaceSessionLockAt(
  race: Doc<'races'>,
  session: SessionType,
): number {
  switch (session) {
    case 'quali':
      return race.qualiLockAt ?? 0;
    case 'sprint_quali':
      return race.sprintQualiLockAt ?? 0;
    case 'sprint':
      return race.sprintLockAt ?? 0;
    case 'race':
      return race.predictionLockAt;
  }
}

export function getRaceSessionStartAt(
  race: Doc<'races'>,
  session: SessionType,
): number {
  switch (session) {
    case 'quali':
      return race.qualiStartAt ?? race.raceStartAt;
    case 'sprint_quali':
      return race.sprintQualiStartAt ?? race.raceStartAt;
    case 'sprint':
      return race.sprintStartAt ?? race.raceStartAt;
    case 'race':
      return race.raceStartAt;
  }
}
