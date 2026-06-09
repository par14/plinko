import { bitAt, hmacSha256 } from './rng';

export type Direction = 'L' | 'R';

/** Provably-fair seed triple. The server seed is the secret; nonce increments per drop. */
export interface Seed {
  serverSeed: string;
  clientSeed: string;
  nonce: number;
}

export interface DropOutcome extends Seed {
  rows: number;
  /** Left/right decision at each peg row (length === rows). */
  path: Direction[];
  /** Final bucket = number of right moves, in [0, rows]. Binomial(rows, 0.5). */
  bucketIndex: number;
}

async function computePath(seed: Seed, rows: number): Promise<Direction[]> {
  const bytes = await hmacSha256(seed.serverSeed, `${seed.clientSeed}:${seed.nonce}`);
  const path: Direction[] = [];
  for (let i = 0; i < rows; i++) {
    path.push(bitAt(bytes, i) === 1 ? 'R' : 'L');
  }
  return path;
}

/** Computes the deterministic outcome for a drop. The path doubles as the animation track. */
export async function dropOutcome(seed: Seed, rows: number): Promise<DropOutcome> {
  const path = await computePath(seed, rows);
  const bucketIndex = path.filter((d) => d === 'R').length;
  return { ...seed, rows, path, bucketIndex };
}

/** Recomputes a stored outcome from its seed/nonce and confirms it is untampered. */
export async function verifyOutcome(outcome: DropOutcome): Promise<boolean> {
  const expected = await dropOutcome(
    {
      serverSeed: outcome.serverSeed,
      clientSeed: outcome.clientSeed,
      nonce: outcome.nonce,
    },
    outcome.rows,
  );
  return (
    expected.bucketIndex === outcome.bucketIndex &&
    expected.path.length === outcome.path.length &&
    expected.path.every((d, i) => d === outcome.path[i])
  );
}
