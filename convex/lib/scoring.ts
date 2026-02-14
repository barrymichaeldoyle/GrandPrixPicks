import type { Id } from '../_generated/dataModel';

export function scoreTopFive(params: {
  picks: Array<Id<'drivers'>>; // length 5
  classification: Array<Id<'drivers'>>; // ordered
}) {
  const { picks, classification } = params;

  const actualPos = new Map<Id<'drivers'>, number>();
  for (let i = 0; i < classification.length; i++) {
    actualPos.set(classification[i], i + 1);
  }

  let total = 0;

  const breakdown = picks.map((driverId, index) => {
    const predictedPosition = index + 1;
    const actualPosition = actualPos.get(driverId);

    let points = 0;

    if (actualPosition !== undefined) {
      const diff = Math.abs(actualPosition - predictedPosition);

      if (actualPosition <= 5) {
        if (diff === 0) {
          points = 5;
        } else if (diff === 1) {
          points = 3;
        } else {
          points = 1;
        }
      }
    }

    total += points;

    return {
      driverId,
      predictedPosition,
      actualPosition,
      points,
    };
  });

  return { total, breakdown };
}
