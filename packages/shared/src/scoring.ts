export type TopFiveScoreBreakdown<DriverId extends string> = {
  driverId: DriverId;
  predictedPosition: number;
  actualPosition: number | undefined;
  points: number;
};

export function scoreTopFive<DriverId extends string>(params: {
  picks: DriverId[];
  classification: DriverId[];
}): {
  total: number;
  breakdown: Array<TopFiveScoreBreakdown<DriverId>>;
} {
  const { picks, classification } = params;
  const actualPositions = new Map<DriverId, number>();

  for (let index = 0; index < classification.length; index++) {
    actualPositions.set(classification[index]!, index + 1);
  }

  let total = 0;
  const breakdown = picks.map((driverId, index) => {
    const predictedPosition = index + 1;
    const actualPosition = actualPositions.get(driverId);
    let points = 0;

    if (actualPosition !== undefined) {
      const difference = Math.abs(actualPosition - predictedPosition);

      if (difference === 0 && actualPosition <= 5) {
        points = 5;
      } else if (difference === 1) {
        points = 3;
      } else if (actualPosition <= 5) {
        points = 1;
      }
    }

    total += points;
    return { driverId, predictedPosition, actualPosition, points };
  });

  return { total, breakdown };
}
