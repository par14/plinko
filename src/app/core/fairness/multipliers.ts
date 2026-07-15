/** Casino-style payout tables derived from the exact Binomial(rows, 0.5) distribution. */
export type RiskMode = 'low' | 'normal' | 'high';
export type Rows = 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15 | 16;

export const RISK_MODES: readonly RiskMode[] = ['low', 'normal', 'high'] as const;
export const ROWS_OPTIONS: readonly Rows[] = [8, 9, 10, 11, 12, 13, 14, 15, 16] as const;

/** A 6% mathematical house edge, applied equally to every board and risk mode. */
export const TARGET_RTP = 0.94;

export interface Bucket {
  multiplier: number;
  color: string;
}

interface RiskProfile {
  targetHitRate: number;
  centerMultiplier: number;
  nearWinMultiplier: number;
  jackpotGrowth: number;
}

const RISK_PROFILES: Record<RiskMode, RiskProfile> = {
  low: {
    targetHitRate: 0.4,
    centerMultiplier: 0.65,
    nearWinMultiplier: 0.9,
    jackpotGrowth: 1.25,
  },
  normal: {
    targetHitRate: 0.16,
    centerMultiplier: 0.35,
    nearWinMultiplier: 0.7,
    jackpotGrowth: 1.7,
  },
  high: {
    targetHitRate: 0.03,
    centerMultiplier: 0.1,
    nearWinMultiplier: 0.4,
    jackpotGrowth: 2.4,
  },
};

function binomialProbability(rows: number, bucket: number): number {
  let combinations = 1;
  for (let i = 1; i <= bucket; i++) combinations = (combinations * (rows - bucket + i)) / i;
  return combinations / 2 ** rows;
}

function rampColor(index: number, count: number): string {
  const mid = (count - 1) / 2;
  const distance = Math.abs(index - mid) / mid;
  return `hsl(${(125 * (1 - distance)).toFixed(0)}, 92%, 55%)`;
}

/** Pick the symmetric outer region whose exact probability is closest to the profile target. */
function winningDistance(rows: Rows, probabilities: readonly number[], target: number): number {
  const midpoint = rows / 2;
  let bestDistance = midpoint;
  let bestDifference = Number.POSITIVE_INFINITY;

  for (let distance = Math.ceil(midpoint); distance > 0; distance--) {
    const rate = probabilities.reduce(
      (sum, probability, bucket) =>
        sum + (Math.abs(bucket - midpoint) >= distance ? probability : 0),
      0,
    );
    const difference = Math.abs(rate - target);
    if (difference < bestDifference) {
      bestDifference = difference;
      bestDistance = distance;
    }
  }

  return bestDistance;
}

function buildTable(rows: Rows, risk: RiskMode): Bucket[] {
  const probabilities = Array.from({ length: rows + 1 }, (_, bucket) =>
    binomialProbability(rows, bucket),
  );
  const midpoint = rows / 2;
  const profile = RISK_PROFILES[risk];
  const winDistance = winningDistance(rows, probabilities, profile.targetHitRate);

  const multipliers = probabilities.map((_, bucket) => {
    const distance = Math.abs(bucket - midpoint);
    if (distance >= winDistance) return 0;
    const progress = winDistance === 0 ? 0 : distance / winDistance;
    return (
      profile.centerMultiplier +
      (profile.nearWinMultiplier - profile.centerMultiplier) * progress
    );
  });

  const losingReturn = probabilities.reduce(
    (sum, probability, bucket) => sum + probability * multipliers[bucket],
    0,
  );
  const winnerWeights = probabilities.map((_, bucket) => {
    const distance = Math.abs(bucket - midpoint);
    return distance >= winDistance
      ? profile.jackpotGrowth ** Math.max(0, distance - winDistance)
      : 0;
  });
  const weightedWinProbability = probabilities.reduce(
    (sum, probability, bucket) => sum + probability * winnerWeights[bucket],
    0,
  );
  const winningProbability = probabilities.reduce(
    (sum, probability, bucket) => sum + (winnerWeights[bucket] > 0 ? probability : 0),
    0,
  );
  const minimumWin = 1.01;
  const winnerScale =
    (TARGET_RTP - losingReturn - winningProbability * minimumWin) / weightedWinProbability;

  return multipliers.map((multiplier, index) => ({
    multiplier:
      Math.round(
        (multiplier || minimumWin + winnerWeights[index] * winnerScale) * 100,
      ) / 100,
    color: rampColor(index, probabilities.length),
  }));
}

export const MULTIPLIERS = ROWS_OPTIONS.reduce(
  (byRows, rows) => {
    byRows[rows] = RISK_MODES.reduce(
      (byRisk, risk) => {
        byRisk[risk] = buildTable(rows, risk);
        return byRisk;
      },
      {} as Record<RiskMode, Bucket[]>,
    );
    return byRows;
  },
  {} as Record<Rows, Record<RiskMode, Bucket[]>>,
);

export function multiplierFor(rows: Rows, risk: RiskMode, bucketIndex: number): number {
  return MULTIPLIERS[rows][risk][bucketIndex].multiplier;
}

export function expectedReturn(rows: Rows, risk: RiskMode): number {
  return MULTIPLIERS[rows][risk].reduce(
    (rtp, bucket, index) => rtp + binomialProbability(rows, index) * bucket.multiplier,
    0,
  );
}

export function profitableHitRate(rows: Rows, risk: RiskMode): number {
  return MULTIPLIERS[rows][risk].reduce(
    (rate, bucket, index) =>
      rate + (bucket.multiplier > 1 ? binomialProbability(rows, index) : 0),
    0,
  );
}
