// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { createSeedCommitment, dropOutcome, verifyOutcome } from './outcome';

async function seed(nonce = 1) {
  const serverSeed = 'server-secret';
  return {
    serverSeed,
    serverSeedHash: await createSeedCommitment(serverSeed),
    clientSeed: 'client-seed',
    nonce,
  };
}

describe('deterministic outcome', () => {
  it('repeats the same path and bucket for the same proof', async () => {
    const proof = await seed();
    const first = await dropOutcome(proof, 16);
    const second = await dropOutcome(proof, 16);
    expect(first).toEqual(second);
    expect(first.bucketIndex).toBe(first.path.filter((direction) => direction === 'R').length);
  });

  it('verifies the commitment and rejects tampering', async () => {
    const outcome = await dropOutcome(await seed(), 12);
    expect(await verifyOutcome(outcome)).toBe(true);
    expect(await verifyOutcome({ ...outcome, bucketIndex: (outcome.bucketIndex + 1) % 13 })).toBe(
      false,
    );
    expect(await verifyOutcome({ ...outcome, serverSeedHash: 'tampered' })).toBe(false);
  });

  it('produces a centre-weighted binomial population across nonces', async () => {
    const rows = 8;
    const counts = new Array(rows + 1).fill(0) as number[];
    for (let nonce = 1; nonce <= 600; nonce++) {
      const outcome = await dropOutcome(await seed(nonce), rows);
      counts[outcome.bucketIndex]++;
    }
    expect(counts[rows / 2]).toBeGreaterThan(counts[0] + counts[rows]);
  });
});
