import type { RiskMode, Rows } from '../fairness/multipliers';

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
  /** Provably-fair inputs, stored so any past drop can be re-verified. */
  serverSeed: string;
  clientSeed: string;
  nonce: number;
  time: number;
}
