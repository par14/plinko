import type { RiskMode, Rows } from '../fairness/multipliers';
import type { Direction } from '../fairness/outcome';

export type { RiskMode, Rows } from '../fairness/multipliers';

/** A locally-stored player. Balances are kept rounded to avoid float drift. */
export interface Player {
  id: string;
  name: string;
  balance: number;
  createdAt: number;
}

/** One settled drop, persisted so the leaderboard and history survive reloads. */
export interface GameResult {
  id: string;
  playerId: string;
  bet: number;
  rows: Rows;
  risk: RiskMode;
  bucketIndex: number;
  multiplier: number;
  payout: number;
  /** Net profit/loss = payout - bet. */
  win: number;
  /** Missing on results created before the deterministic fairness engine. */
  fairnessProof?: {
    version: 1;
    serverSeed: string;
    serverSeedHash: string;
    clientSeed: string;
    nonce: number;
    path: Direction[];
  };
  time: number;
}
