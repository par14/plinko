// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { simulateLanding } from '../../features/game/board/physics';
import { MULTIPLIERS, RISK_MODES, ROWS_OPTIONS, multiplierFor } from './multipliers';

/** Deterministic, well-distributed PRNG for the RTP measurement. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

describe('multiplier tables', () => {
  it('has a bucket entry of length rows+1 for every (rows, risk) combination', () => {
    for (const rows of ROWS_OPTIONS) {
      for (const risk of RISK_MODES) {
        expect(MULTIPLIERS[rows][risk]).toHaveLength(rows + 1);
      }
    }
  });

  it('is symmetric, with the centre paying < 1× (house edge) and the edges the most', () => {
    for (const rows of ROWS_OPTIONS) {
      for (const risk of RISK_MODES) {
        const m = MULTIPLIERS[rows][risk].map((b) => b.multiplier);
        for (let k = 0; k <= rows; k++) {
          expect(m[k], `${rows}/${risk} symmetry`).toBe(m[rows - k]);
        }
        const centre = m[Math.floor(rows / 2)];
        expect(centre, `${rows}/${risk} centre`).toBeLessThan(1);
        expect(m[0], `${rows}/${risk} edge`).toBeGreaterThan(centre);
      }
    }
  });

  it('maps a bucket index to its multiplier value', () => {
    expect(multiplierFor(8, 'high', 0)).toBe(MULTIPLIERS[8].high[0].multiplier);
  });
});

describe('effective RTP under the physics distribution', () => {
  it(
    'keeps every (rows, risk) RTP in a house-favourable band (~0.84–1.03)',
    () => {
      const N = 3000;
      for (const rows of ROWS_OPTIONS) {
        const counts = new Array(rows + 1).fill(0);
        for (let s = 1; s <= N; s++) {
          counts[simulateLanding(rows, 360, 360, mulberry32(s * 104729))]++;
        }
        for (const risk of RISK_MODES) {
          const table = MULTIPLIERS[rows][risk];
          let rtp = 0;
          for (let k = 0; k <= rows; k++) rtp += (counts[k] / N) * table[k].multiplier;
          expect(rtp, `RTP ${rows}/${risk}`).toBeGreaterThan(0.84);
          expect(rtp, `RTP ${rows}/${risk}`).toBeLessThan(1.03);
        }
      }
    },
    30000,
  );
});
