import { Injectable, computed, inject } from '@angular/core';
import { AudioService } from '../core/audio/audio.service';
import { multiplierFor, type RiskMode, type Rows } from '../core/fairness/multipliers';
import { dropOutcome, type DropOutcome } from '../core/fairness/outcome';
import type { GameResult } from '../core/models';
import { roundMoney } from '../core/util/money';
import { GameConfigStore, MIN_BET } from './game-config.store';
import { HistoryStore } from './history.store';
import { PlayersStore } from './players.store';

/** A single ball in flight: its precomputed outcome plus the stake it carries. */
export interface BallDrop {
  id: string;
  outcome: DropOutcome;
  rows: Rows;
  risk: RiskMode;
  bet: number;
  multiplier: number;
}

/** The board registers this to animate a drop and report when the ball lands. */
export type BallLauncher = (drop: BallDrop, onLand: () => void) => void;

const MAX_ACTIVE_BALLS = 50;

/**
 * Orchestrates a drop across the stores: validate → debit the stake →
 * compute the provably-fair outcome → animate → credit the payout on landing.
 */
@Injectable({ providedIn: 'root' })
export class GameService {
  private readonly players = inject(PlayersStore);
  private readonly config = inject(GameConfigStore);
  private readonly history = inject(HistoryStore);
  private readonly audio = inject(AudioService);

  private launcher: BallLauncher | null = null;

  readonly canPlay = computed(
    () =>
      this.players.activePlayerId() !== null &&
      this.config.bet() >= MIN_BET &&
      this.config.bet() <= this.players.balance() &&
      this.config.activeBalls() < MAX_ACTIVE_BALLS,
  );

  registerLauncher(launcher: BallLauncher): void {
    this.launcher = launcher;
  }

  async play(): Promise<void> {
    if (!this.canPlay()) return;

    const bet = this.config.bet();
    const rows = this.config.rows();
    const risk = this.config.risk();
    const seed = this.config.takeSeed();

    // Debit the stake up front so the balance can never go negative.
    this.players.adjustBalance(-bet);
    this.config.addBall();

    const outcome = await dropOutcome(seed, rows);
    const multiplier = multiplierFor(rows, risk, outcome.bucketIndex);
    const drop: BallDrop = { id: crypto.randomUUID(), outcome, rows, risk, bet, multiplier };

    this.audio.playDrop();

    if (this.launcher) {
      this.launcher(drop, () => this.settle(drop));
    } else {
      // Headless fallback (tests, SSR): settle immediately.
      this.settle(drop);
    }
  }

  private settle(drop: BallDrop): void {
    const payout = roundMoney(drop.bet * drop.multiplier);
    const win = roundMoney(payout - drop.bet);

    this.players.adjustBalance(payout);
    this.config.removeBall();
    this.config.setLastWin(win);
    this.audio.playBucket(drop.multiplier);

    const playerId = this.players.activePlayerId();
    if (!playerId) return;

    const result: GameResult = {
      id: drop.id,
      playerId,
      bet: drop.bet,
      rows: drop.rows,
      risk: drop.risk,
      bucketIndex: drop.outcome.bucketIndex,
      multiplier: drop.multiplier,
      payout,
      win,
      serverSeed: drop.outcome.serverSeed,
      clientSeed: drop.outcome.clientSeed,
      nonce: drop.outcome.nonce,
      time: Date.now(),
    };
    this.history.addResult(result);
  }
}
