// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { dividerReleaseVelocity, finalGapVelocity, pegBounceVelocity } from './bounce-guidance';

describe('peg bounce guidance', () => {
  it('kicks toward the committed direction', () => {
    expect(pegBounceVelocity('R', 1, 0, -0.4, false)).toBeGreaterThan(0);
    expect(pegBounceVelocity('L', -1, 0, 0.4, false)).toBeLessThan(0);
  });

  it('uses a stronger bounded recovery only for a missed contact', () => {
    expect(Math.abs(pegBounceVelocity('R', 0.1, 0, 0, true))).toBeGreaterThan(
      Math.abs(pegBounceVelocity('R', 0.1, 0, 0, false)),
    );
    expect(Math.abs(pegBounceVelocity('R', 20, 0, 20, true))).toBeLessThanOrEqual(3.2);
  });

  it('uses a restrained one-off velocity after the final peg', () => {
    expect(finalGapVelocity('R', 0.5, 0, 0)).toBeGreaterThan(0);
    expect(finalGapVelocity('L', -0.5, 0, 0)).toBeLessThan(0);
    expect(Math.abs(finalGapVelocity('R', 20, 0, -20))).toBeLessThanOrEqual(1.45);
  });

  it('releases a stalled ball toward its bucket without a position jump', () => {
    expect(dividerReleaseVelocity(1, 0)).toBeGreaterThan(0);
    expect(dividerReleaseVelocity(-1, 0)).toBeLessThan(0);
    expect(Math.abs(dividerReleaseVelocity(20, 0))).toBeLessThanOrEqual(0.7);
  });
});
