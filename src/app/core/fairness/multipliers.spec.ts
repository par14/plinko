// @vitest-environment node
import { describe, expect, it } from 'vitest';
import {
  MULTIPLIERS,
  RISK_MODES,
  ROWS_OPTIONS,
  TARGET_RTP,
  expectedReturn,
  multiplierFor,
  profitableHitRate,
} from './multipliers';

describe('binomial multiplier tables', () => {
  it('has a symmetric rows + 1 table for every risk mode', () => {
    for (const rows of ROWS_OPTIONS) {
      for (const risk of RISK_MODES) {
        const values = MULTIPLIERS[rows][risk].map((bucket) => bucket.multiplier);
        expect(values).toHaveLength(rows + 1);
        for (let bucket = 0; bucket <= rows; bucket++) {
          expect(values[bucket]).toBe(values[rows - bucket]);
        }
        expect(values[0]).toBeGreaterThan(values[Math.floor(rows / 2)]);
      }
    }
  });

  it('keeps every exact binomial RTP within rounding distance of 94%', () => {
    for (const rows of ROWS_OPTIONS) {
      for (const risk of RISK_MODES) {
        expect(expectedReturn(rows, risk), `${rows}/${risk}`).toBeCloseTo(TARGET_RTP, 2);
      }
    }
  });

  it('makes profitable hits less frequent as risk increases', () => {
    for (const rows of ROWS_OPTIONS) {
      const low = profitableHitRate(rows, 'low');
      const normal = profitableHitRate(rows, 'normal');
      const high = profitableHitRate(rows, 'high');

      expect(low, `${rows}/low`).toBeGreaterThan(normal);
      expect(normal, `${rows}/normal`).toBeGreaterThan(high);
    }
  });

  it('trades hit frequency for a larger maximum payout', () => {
    for (const rows of ROWS_OPTIONS) {
      const maximum = (risk: (typeof RISK_MODES)[number]) =>
        Math.max(...MULTIPLIERS[rows][risk].map((bucket) => bucket.multiplier));

      expect(maximum('normal')).toBeGreaterThan(maximum('low'));
      expect(maximum('high')).toBeGreaterThan(maximum('normal'));
    }
  });

  it('maps a bucket index to its displayed multiplier', () => {
    expect(multiplierFor(8, 'high', 0)).toBe(MULTIPLIERS[8].high[0].multiplier);
  });
});
