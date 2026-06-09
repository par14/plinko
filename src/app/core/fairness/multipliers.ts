/**
 * Payout tables ported verbatim from the React app
 * (src/pages/Plinko/components/Game/constants/holesForLines.ts).
 *
 * For `rows` peg rows there are `rows + 1` buckets (index 0..rows). The values
 * are tuned so the expected return under a Binomial(rows, 0.5) landing is ~99%
 * (see expectedReturn + multipliers.spec.ts). In the old app the ball landed by
 * physics, so this RTP was never actually realised; here the seeded outcome is
 * binomial by construction, making the house edge real and provable.
 */

export type RiskMode = 'low' | 'normal' | 'high';
export type Rows = 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15 | 16;

export const RISK_MODES: readonly RiskMode[] = ['low', 'normal', 'high'] as const;
export const ROWS_OPTIONS: readonly Rows[] = [8, 9, 10, 11, 12, 13, 14, 15, 16] as const;

export interface Bucket {
  multiplier: number;
  color: string;
}

function buckets(multipliers: number[], colors: string[]): Bucket[] {
  return multipliers.map((multiplier, i) => ({ multiplier, color: colors[i] }));
}

export const MULTIPLIERS: Record<Rows, Record<RiskMode, Bucket[]>> = {
  8: {
    high: buckets(
      [29, 4, 1.5, 0.3, 0.2, 0.3, 1.5, 4, 29],
      ['#FF2F01', '#FF9500', '#CDF900', '#66FF00', '#03FF00', '#66FF00', '#CDF900', '#FF9500', '#FF2F01'],
    ),
    normal: buckets(
      [13, 3, 1.3, 0.7, 0.4, 0.7, 1.3, 3, 13],
      ['#FF9C00', '#FFE700', '#CDF900', '#66FF00', '#03FF00', '#66FF00', '#CDF900', '#FFE700', '#FF9C00'],
    ),
    low: buckets(
      [5.6, 2.1, 1.1, 1, 0.5, 1, 1.1, 2.1, 5.6],
      ['#E0FF00', '#ABFF02', '#73FF03', '#3AFF00', '#03FF00', '#3AFF00', '#73FF03', '#ABFF02', '#E0FF00'],
    ),
  },
  9: {
    high: buckets(
      [43, 7, 2, 0.6, 0.2, 0.2, 0.6, 2, 7, 43],
      ['#FF2F01', '#FF8800', '#E3E300', '#88FF00', '#2CFF00', '#2CFF00', '#88FF00', '#E3E300', '#FF8800', '#FF2F01'],
    ),
    normal: buckets(
      [18, 4, 1.7, 0.9, 0.5, 0.5, 0.9, 1.7, 4, 18],
      ['#FF9B00', '#FFDD04', '#E3FF04', '#88FF00', '#2CFF00', '#2CFF00', '#88FF00', '#E3FF04', '#FFDD04', '#FF9B00'],
    ),
    low: buckets(
      [5.6, 2, 1.6, 1, 0.7, 0.7, 1, 1.6, 2, 5.6],
      ['#E5FF03', '#B2FF00', '#7FFF01', '#4CFF01', '#18FF00', '#18FF00', '#4CFF01', '#7FFF01', '#B2FF00', '#E5FF03'],
    ),
  },
  10: {
    high: buckets(
      [76, 10, 3, 0.9, 0.3, 0.2, 0.3, 0.9, 3, 10, 76],
      ['#FF2900', '#FF7B02', '#F8CE01', '#A4FF00', '#51FF00', '#03FF00', '#51FF00', '#A4FF00', '#F8CE01', '#FF7B02', '#FF2900'],
    ),
    normal: buckets(
      [22, 5, 2, 1.4, 0.6, 0.4, 0.6, 1.4, 2, 5, 22],
      ['#FF9800', '#FFD400', '#F8FF00', '#A4FF00', '#51FF00', '#03FF00', '#51FF00', '#A4FF00', '#F8FF00', '#FFD400', '#FF9800'],
    ),
    low: buckets(
      [8.9, 3, 1.4, 1.1, 1, 0.5, 1, 1.1, 1.4, 3, 8.9],
      ['#E6FF02', '#B9FF00', '#8AFF00', '#5CFF00', '#2CFF00', '#03FF00', '#2CFF00', '#5CFF00', '#8AFF00', '#B9FF00', '#E6FF02'],
    ),
  },
  11: {
    high: buckets(
      [120, 14, 5.2, 1.4, 0.4, 0.2, 0.2, 0.4, 1.4, 5.2, 14, 120],
      ['#FF2500', '#FF7201', '#FFBD01', '#BDFF00', '#71FF03', '#28FF00', '#28FF00', '#71FF03', '#BDFF00', '#FFBD01', '#FF7201', '#FF2500'],
    ),
    normal: buckets(
      [24, 6, 3, 1.8, 0.7, 0.5, 0.5, 0.7, 1.8, 3, 6, 24],
      ['#FF9500', '#FFCD00', '#FFFF00', '#BDFF00', '#71FF03', '#28FF00', '#28FF00', '#71FF03', '#BDFF00', '#FFFF00', '#FFCD00', '#FF9500'],
    ),
    low: buckets(
      [8.4, 3, 1.9, 1.3, 1, 0.7, 0.7, 1, 1.3, 1.9, 3, 8.4],
      ['#E9FF01', '#BFFF00', '#95FF03', '#6AFF00', '#40FF04', '#18FF00', '#18FF00', '#40FF04', '#6AFF00', '#95FF03', '#BFFF00', '#E9FF01'],
    ),
  },
  12: {
    high: buckets(
      [170, 24, 8.1, 2, 0.7, 0.2, 0.2, 0.2, 0.7, 2, 8.1, 24, 170],
      ['#F72002', '#FF6800', '#FFAD02', '#D1F500', '#8CFF00', '#45FF02', '#45FF02', '#45FF02', '#8CFF00', '#D1F500', '#FFAD02', '#FF6800', '#F72002'],
    ),
    normal: buckets(
      [33, 11, 4, 2, 1.1, 0.6, 0.3, 0.6, 1.1, 2, 4, 11, 33],
      ['#FF9301', '#FFC700', '#FFF903', '#D1FF00', '#8CFF00', '#45FF02', '#03FF00', '#45FF02', '#8CFF00', '#D1FF00', '#FFF903', '#FFC700', '#FF9301'],
    ),
    low: buckets(
      [10, 3, 1.6, 1.4, 1.1, 1, 0.5, 1, 1.1, 1.4, 1.6, 3, 10],
      ['#EBFF00', '#C3FF03', '#9DFF00', '#75FF03', '#4CFF01', '#28FF00', '#03FF00', '#28FF00', '#4CFF01', '#75FF03', '#9DFF00', '#C3FF03', '#EBFF00'],
    ),
  },
  13: {
    high: buckets(
      [260, 37, 11, 4, 1, 0.2, 0.2, 0.2, 0.2, 1, 4, 11, 37, 260],
      ['#FF1F02', '#FF6101', '#FFA100', '#E3E300', '#A2FF00', '#62FF00', '#62FF00', '#62FF00', '#62FF00', '#A2FF00', '#E3E300', '#FFA100', '#FF6101', '#FF1F02'],
    ),
    normal: buckets(
      [43, 13, 6, 3, 1.3, 0.7, 0.4, 0.4, 0.7, 1.3, 3, 6, 13, 43],
      ['#FF9202', '#FFC102', '#FEF100', '#E3FF04', '#A2FF00', '#62FF00', '#1EFF00', '#1EFF00', '#62FF00', '#A2FF00', '#E3FF04', '#FEF100', '#FFC102', '#FF9202'],
    ),
    low: buckets(
      [8.1, 4, 3, 1.9, 1.2, 0.9, 0.7, 0.7, 0.9, 1.2, 1.9, 3, 4, 8.1],
      ['#EBFF00', '#C7FF02', '#A4FF00', '#7FFF01', '#5AFF00', '#37FF00', '#0FFF00', '#0FFF00', '#37FF00', '#5AFF00', '#7FFF01', '#A4FF00', '#C7FF02', '#EBFF00'],
    ),
  },
  14: {
    high: buckets(
      [420, 56, 18, 5, 1.9, 0.3, 0.2, 0.2, 0.2, 0.3, 1.9, 5, 18, 56, 420],
      ['#FF1D00', '#FF5A00', '#FF9700', '#F2D401', '#B7FF00', '#7AFF02', '#3CFE00', '#3CFE00', '#3CFE00', '#7AFF02', '#B7FF00', '#F2D401', '#FF9700', '#FF5A00', '#FF1D00'],
    ),
    normal: buckets(
      [58, 15, 7, 4, 1.9, 1, 0.5, 0.2, 0.5, 1, 1.9, 4, 7, 15, 58],
      ['#FF9100', '#FFBC00', '#FFE802', '#F1FF00', '#B7FF00', '#7AFF02', '#3EFF00', '#03FF00', '#3EFF00', '#7AFF02', '#B7FF00', '#F1FF00', '#FFE802', '#FFBC00', '#FF9100'],
    ),
    low: buckets(
      [7.1, 4, 1.9, 1.4, 1.3, 1.1, 1, 0.5, 1, 1.1, 1.3, 1.4, 1.9, 4, 7.1],
      ['#EDFF00', '#CCFF00', '#AAFF03', '#87FF00', '#66FF00', '#42FF02', '#23FF00', '#03FF00', '#23FF00', '#42FF02', '#66FF00', '#87FF00', '#AAFF03', '#CCFF00', '#EDFF00'],
    ),
  },
  15: {
    high: buckets(
      [620, 83, 27, 8, 3, 0.5, 0.2, 0.2, 0.2, 0.2, 0.5, 3, 8, 27, 83, 620],
      ['#FF1D00', '#FF5600', '#FF8D02', '#FFC600', '#C7FF02', '#8DFF00', '#1EFF00', '#1EFF00', '#1EFF00', '#1EFF00', '#8DFF00', '#C7FF02', '#FFC600', '#FF8D02', '#FF5600', '#FF1D00'],
    ),
    normal: buckets(
      [88, 18, 11, 5, 3, 1.3, 0.5, 0.3, 0.3, 0.5, 1.3, 3, 5, 11, 18, 88],
      ['#FE8E01', '#FFB800', '#FFE103', '#FFFF00', '#C7FF02', '#8DFF00', '#53FF00', '#1EFF00', '#1EFF00', '#53FF00', '#8DFF00', '#C7FF02', '#FFFF00', '#FFE103', '#FFB800', '#FE8E01'],
    ),
    low: buckets(
      [15, 8, 3, 2, 1.5, 1.1, 1, 0.7, 0.7, 1, 1.1, 1.5, 2, 3, 8, 15],
      ['#EEFF00', '#CFFF00', '#AEFF02', '#8FFF00', '#6FFF00', '#4FFF01', '#30FF00', '#0FFF00', '#0FFF00', '#30FF00', '#4FFF01', '#6FFF00', '#8FFF00', '#AEFF02', '#CFFF00', '#EEFF00'],
    ),
  },
  16: {
    high: buckets(
      [1000, 130, 26, 9, 4, 2, 0.2, 0.2, 0.2, 0.2, 0.2, 2, 4, 9, 26, 130, 1000],
      ['#FF1B00', '#FF5101', '#FF8600', '#FFBB00', '#D6F000', '#A0FF00', '#34FF00', '#34FF00', '#34FF00', '#34FF00', '#34FF00', '#A0FF00', '#D6F000', '#FFBB00', '#FF8600', '#FF5101', '#FF1B00'],
    ),
    normal: buckets(
      [110, 41, 10, 5, 3, 1.5, 1, 0.5, 0.3, 0.5, 1, 1.5, 3, 5, 10, 41, 110],
      ['#FF8D02', '#FFB400', '#FFDC00', '#FFFF00', '#D6FF01', '#A0FF00', '#6CFF00', '#34FF00', '#03FF00', '#34FF00', '#6CFF00', '#A0FF00', '#D6FF01', '#FFFF00', '#FFDC00', '#FFB400', '#FF8D02'],
    ),
    low: buckets(
      [16, 9, 2, 1.4, 1.4, 1.2, 1.1, 1, 0.5, 1, 1.1, 1.2, 1.4, 1.4, 2, 9, 16],
      ['#EFFF00', '#D2FF03', '#B2FF00', '#95FF03', '#78FF02', '#58FF00', '#3EFF00', '#1EFF00', '#03FF00', '#1EFF00', '#3EFF00', '#58FF00', '#78FF02', '#95FF03', '#B2FF00', '#D2FF03', '#EFFF00'],
    ),
  },
};

export function multiplierFor(rows: Rows, risk: RiskMode, bucketIndex: number): number {
  return MULTIPLIERS[rows][risk][bucketIndex].multiplier;
}

function binomialCoefficient(n: number, k: number): number {
  let result = 1;
  for (let i = 0; i < k; i++) {
    result = (result * (n - i)) / (i + 1);
  }
  return result;
}

/** Expected return (RTP) for a fair Binomial(rows, 0.5) landing: Σ C(rows,k)/2^rows · multiplier[k]. */
export function expectedReturn(rows: Rows, risk: RiskMode): number {
  const table = MULTIPLIERS[rows][risk];
  const total = 2 ** rows;
  let ev = 0;
  for (let k = 0; k <= rows; k++) {
    ev += (binomialCoefficient(rows, k) / total) * table[k].multiplier;
  }
  return ev;
}
