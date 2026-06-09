// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { dropOutcome, verifyOutcome, type Seed } from './outcome';

const seed: Seed = {
  serverSeed: 'server-secret-abc',
  clientSeed: 'client-xyz',
  nonce: 1,
};

describe('dropOutcome', () => {
  it('is deterministic: same seed+nonce+rows yields the same bucket and path', async () => {
    const a = await dropOutcome(seed, 16);
    const b = await dropOutcome(seed, 16);
    expect(a.bucketIndex).toBe(b.bucketIndex);
    expect(a.path).toEqual(b.path);
  });

  it('produces a path of length rows and a bucket equal to the count of right moves', async () => {
    const rows = 12;
    const outcome = await dropOutcome(seed, rows);
    expect(outcome.path).toHaveLength(rows);
    const rights = outcome.path.filter((d) => d === 'R').length;
    expect(outcome.bucketIndex).toBe(rights);
    expect(outcome.bucketIndex).toBeGreaterThanOrEqual(0);
    expect(outcome.bucketIndex).toBeLessThanOrEqual(rows);
  });

  it('changes the result when the nonce changes', async () => {
    const a = await dropOutcome({ ...seed, nonce: 1 }, 16);
    const b = await dropOutcome({ ...seed, nonce: 2 }, 16);
    // Path almost certainly differs across nonces for 16 rows.
    expect(a.path).not.toEqual(b.path);
  });
});

describe('distribution', () => {
  it('lands in a binomial spread centred on rows/2 across many nonces', async () => {
    const rows = 8;
    const counts = new Array(rows + 1).fill(0);
    const draws = 1500;
    for (let nonce = 0; nonce < draws; nonce++) {
      const { bucketIndex } = await dropOutcome({ ...seed, nonce }, rows);
      counts[bucketIndex]++;
    }
    const mean = counts.reduce((sum, c, i) => sum + c * i, 0) / draws;
    expect(mean).toBeGreaterThan(rows / 2 - 0.4);
    expect(mean).toBeLessThan(rows / 2 + 0.4);
    // Centre bucket must be far more common than an edge bucket (binomial shape).
    expect(counts[rows / 2]).toBeGreaterThan(counts[0]);
  });
});

describe('verifyOutcome', () => {
  it('verifies a genuine outcome', async () => {
    const outcome = await dropOutcome(seed, 10);
    expect(await verifyOutcome(outcome)).toBe(true);
  });

  it('rejects an outcome whose bucketIndex was tampered with', async () => {
    const outcome = await dropOutcome(seed, 10);
    const tampered = { ...outcome, bucketIndex: outcome.bucketIndex === 10 ? 0 : 10 };
    expect(await verifyOutcome(tampered)).toBe(false);
  });
});
