// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { createWorld, simulateLanding } from './physics';

/** Deterministic, well-distributed PRNG so physics tests are reproducible. */
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

const ROWS = [8, 9, 10, 11, 12, 13, 14, 15, 16] as const;
const W = 360;
const H = 360;

describe('createWorld', () => {
  it('builds a triangular peg field of rows*(rows+1)/2 pegs', () => {
    for (const rows of ROWS) {
      const world = createWorld(rows, W, H);
      expect(world.pegs).toHaveLength((rows * (rows + 1)) / 2);
    }
  });

  it('keeps the ball smaller than the gap between adjacent pegs', () => {
    const world = createWorld(12, W, H);
    expect(world.ballR * 2).toBeLessThan(world.cellW - world.pegR * 2);
  });
});

describe('simulateLanding', () => {
  it('always settles in a valid bucket [0, rows] for every row count', () => {
    for (const rows of ROWS) {
      for (let seed = 1; seed <= 60; seed++) {
        const bucket = simulateLanding(rows, W, H, mulberry32(seed));
        expect(Number.isInteger(bucket), `rows=${rows} seed=${seed}`).toBe(true);
        expect(bucket).toBeGreaterThanOrEqual(0);
        expect(bucket).toBeLessThanOrEqual(rows);
      }
    }
  });

  it('is deterministic for a given seed', () => {
    const a = simulateLanding(12, W, H, mulberry32(42));
    const b = simulateLanding(12, W, H, mulberry32(42));
    expect(a).toBe(b);
  });

  it('produces a centre-weighted (bell-ish) spread, not uniform', () => {
    const rows = 12;
    const counts = new Array(rows + 1).fill(0);
    for (let seed = 1; seed <= 400; seed++) {
      counts[simulateLanding(rows, W, H, mulberry32(seed))]++;
    }
    const centre = counts[rows / 2];
    const edge = counts[0] + counts[rows];
    expect(centre).toBeGreaterThan(edge);
  });
});
