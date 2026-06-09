/**
 * Payout tables, calibrated to the physics simulation.
 *
 * The ball's landing bucket is decided by real physics (see board/physics.ts),
 * which produces a centre-weighted spread that is flatter than a binomial. These
 * multipliers were generated from that measured distribution so every
 * (rows, risk) targets ~92% RTP: m_k = TARGET · p_k^(-α) / Σ p_j^(1-α), where α
 * sets the variance per risk tier (low = flatter, high = spikier). Centre buckets
 * pay < 1× (the house edge); rare edge buckets pay the most.
 *
 * Regenerate if the physics tuning changes (the distribution shifts with it).
 */

export type RiskMode = 'low' | 'normal' | 'high';
export type Rows = 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15 | 16;

export const RISK_MODES: readonly RiskMode[] = ['low', 'normal', 'high'] as const;
export const ROWS_OPTIONS: readonly Rows[] = [8, 9, 10, 11, 12, 13, 14, 15, 16] as const;

export interface Bucket {
  multiplier: number;
  color: string;
}

const MULTIPLIER_VALUES: Record<Rows, Record<RiskMode, number[]>> = {
  8: {
    low: [1.1, 1.1, 0.89, 0.8, 0.77, 0.8, 0.89, 1.1, 1.1],
    normal: [1.3, 1.3, 0.86, 0.69, 0.65, 0.69, 0.86, 1.3, 1.3],
    high: [1.5, 1.5, 0.81, 0.59, 0.54, 0.59, 0.81, 1.5, 1.5],
  },
  9: {
    low: [1.2, 1.2, 0.94, 0.8, 0.74, 0.74, 0.8, 0.94, 1.2, 1.2],
    normal: [1.5, 1.5, 0.93, 0.69, 0.59, 0.59, 0.69, 0.93, 1.5, 1.5],
    high: [1.9, 1.9, 0.89, 0.57, 0.46, 0.46, 0.57, 0.89, 1.9, 1.9],
  },
  10: {
    low: [1.4, 1.4, 1, 0.83, 0.73, 0.71, 0.73, 0.83, 1, 1.4, 1.4],
    normal: [1.8, 1.8, 1, 0.72, 0.58, 0.54, 0.58, 0.72, 1, 1.8, 1.8],
    high: [2.3, 2.3, 1, 0.6, 0.43, 0.39, 0.43, 0.6, 1, 2.3, 2.3],
  },
  11: {
    low: [1.4, 1.4, 1.1, 0.87, 0.76, 0.71, 0.71, 0.76, 0.87, 1.1, 1.4, 1.4],
    normal: [2, 2, 1.1, 0.78, 0.61, 0.54, 0.54, 0.61, 0.78, 1.1, 2, 2],
    high: [2.6, 2.6, 1.1, 0.67, 0.46, 0.38, 0.38, 0.46, 0.67, 1.1, 2.6, 2.6],
  },
  12: {
    low: [1.6, 1.6, 1.2, 0.91, 0.78, 0.71, 0.69, 0.71, 0.78, 0.91, 1.2, 1.6, 1.6],
    normal: [2.3, 2.3, 1.3, 0.84, 0.64, 0.54, 0.5, 0.54, 0.64, 0.84, 1.3, 2.3, 2.3],
    high: [3, 3, 1.4, 0.72, 0.49, 0.38, 0.34, 0.38, 0.49, 0.72, 1.4, 3, 3],
  },
  13: {
    low: [1.7, 1.7, 1.2, 0.98, 0.82, 0.72, 0.68, 0.68, 0.72, 0.82, 0.98, 1.2, 1.7, 1.7],
    normal: [2.7, 2.7, 1.5, 0.95, 0.68, 0.54, 0.49, 0.49, 0.54, 0.68, 0.95, 1.5, 2.7, 2.7],
    high: [3.8, 3.8, 1.6, 0.84, 0.51, 0.37, 0.32, 0.32, 0.37, 0.51, 0.84, 1.6, 3.8, 3.8],
  },
  14: {
    low: [2, 2, 1.4, 1.1, 0.86, 0.74, 0.68, 0.66, 0.68, 0.74, 0.86, 1.1, 1.4, 2, 2],
    normal: [3.3, 3.3, 1.8, 1.1, 0.72, 0.54, 0.48, 0.45, 0.48, 0.54, 0.72, 1.1, 1.8, 3.3, 3.3],
    high: [4.8, 4.8, 2.1, 0.98, 0.54, 0.36, 0.29, 0.27, 0.29, 0.36, 0.54, 0.98, 2.1, 4.8, 4.8],
  },
  15: {
    low: [2.1, 2.1, 1.5, 1.2, 0.93, 0.78, 0.68, 0.65, 0.65, 0.68, 0.78, 0.93, 1.2, 1.5, 2.1, 2.1],
    normal: [3.7, 3.7, 2.1, 1.3, 0.83, 0.59, 0.47, 0.43, 0.43, 0.47, 0.59, 0.83, 1.3, 2.1, 3.7, 3.7],
    high: [5.7, 5.7, 2.5, 1.2, 0.64, 0.39, 0.28, 0.25, 0.25, 0.28, 0.39, 0.64, 1.2, 2.5, 5.7, 5.7],
  },
  16: {
    low: [2.4, 2.4, 1.7, 1.3, 1, 0.84, 0.72, 0.65, 0.62, 0.65, 0.72, 0.84, 1, 1.3, 1.7, 2.4, 2.4],
    normal: [4.5, 4.5, 2.5, 1.5, 0.95, 0.66, 0.5, 0.41, 0.38, 0.41, 0.5, 0.66, 0.95, 1.5, 2.5, 4.5, 4.5],
    high: [7.2, 7.2, 3.1, 1.4, 0.75, 0.44, 0.29, 0.22, 0.2, 0.22, 0.29, 0.44, 0.75, 1.4, 3.1, 7.2, 7.2],
  },
};

/** Colour ramp: green for the common low-paying centre → red for the rare edges. */
function rampColor(index: number, count: number): string {
  const mid = (count - 1) / 2;
  const t = Math.abs(index - mid) / mid; // 0 at centre, 1 at the edges
  const hue = 125 * (1 - t); // 125° green → 0° red
  return `hsl(${hue.toFixed(0)}, 92%, 55%)`;
}

function buildTable(values: number[]): Bucket[] {
  return values.map((multiplier, i) => ({ multiplier, color: rampColor(i, values.length) }));
}

export const MULTIPLIERS = ROWS_OPTIONS.reduce(
  (acc, rows) => {
    acc[rows] = RISK_MODES.reduce(
      (byRisk, risk) => {
        byRisk[risk] = buildTable(MULTIPLIER_VALUES[rows][risk]);
        return byRisk;
      },
      {} as Record<RiskMode, Bucket[]>,
    );
    return acc;
  },
  {} as Record<Rows, Record<RiskMode, Bucket[]>>,
);

export function multiplierFor(rows: Rows, risk: RiskMode, bucketIndex: number): number {
  return MULTIPLIERS[rows][risk][bucketIndex].multiplier;
}
