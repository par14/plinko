// @vitest-environment node
import { describe, expect, it } from 'vitest';
import {
  MULTIPLIERS,
  RISK_MODES,
  ROWS_OPTIONS,
  expectedReturn,
  multiplierFor,
} from './multipliers';

describe('multiplier tables', () => {
  it('has a bucket entry of length rows+1 for every (rows, risk) combination', () => {
    for (const rows of ROWS_OPTIONS) {
      for (const risk of RISK_MODES) {
        expect(MULTIPLIERS[rows][risk]).toHaveLength(rows + 1);
      }
    }
  });

  it('maps a bucket index to its multiplier value', () => {
    // 8 lines, high risk: edges are 29x, centre is 0.2x (ported verbatim).
    expect(multiplierFor(8, 'high', 0)).toBe(29);
    expect(multiplierFor(8, 'high', 8)).toBe(29);
    expect(multiplierFor(8, 'high', 4)).toBe(0.2);
  });
});

describe('expectedReturn (RTP)', () => {
  it('matches the hand-computed 8-line RTPs', () => {
    expect(expectedReturn(8, 'high')).toBeCloseTo(0.9906, 3);
    expect(expectedReturn(8, 'normal')).toBeCloseTo(0.9891, 3);
    expect(expectedReturn(8, 'low')).toBeCloseTo(0.9898, 3);
  });

  it('keeps every (rows, risk) RTP inside a fair house-edge band (~0.94–1.00)', () => {
    for (const rows of ROWS_OPTIONS) {
      for (const risk of RISK_MODES) {
        const rtp = expectedReturn(rows, risk);
        expect(rtp, `RTP for ${rows} rows / ${risk}`).toBeGreaterThanOrEqual(0.94);
        expect(rtp, `RTP for ${rows} rows / ${risk}`).toBeLessThanOrEqual(1.0);
      }
    }
  });
});
