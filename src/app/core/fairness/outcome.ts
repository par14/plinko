import { bitAt, hmacSha256, sha256 } from './rng';

export type Direction = 'L' | 'R';

export interface FairnessSeed {
  serverSeed: string;
  serverSeedHash: string;
  clientSeed: string;
  nonce: number;
}

export interface DropOutcome extends FairnessSeed {
  version: 1;
  rows: number;
  path: Direction[];
  bucketIndex: number;
}

export async function createSeedCommitment(serverSeed: string): Promise<string> {
  return sha256(serverSeed);
}

export async function dropOutcome(seed: FairnessSeed, rows: number): Promise<DropOutcome> {
  const bytes = await hmacSha256(seed.serverSeed, `${seed.clientSeed}:${seed.nonce}:${rows}`);
  const path = Array.from({ length: rows }, (_, index): Direction =>
    bitAt(bytes, index) === 1 ? 'R' : 'L',
  );
  const bucketIndex = path.reduce((rights, direction) => rights + (direction === 'R' ? 1 : 0), 0);
  return { ...seed, version: 1, rows, path, bucketIndex };
}

export async function verifyOutcome(outcome: DropOutcome): Promise<boolean> {
  if ((await createSeedCommitment(outcome.serverSeed)) !== outcome.serverSeedHash) return false;
  const expected = await dropOutcome(outcome, outcome.rows);
  return (
    expected.bucketIndex === outcome.bucketIndex &&
    expected.path.length === outcome.path.length &&
    expected.path.every((direction, index) => direction === outcome.path[index])
  );
}
