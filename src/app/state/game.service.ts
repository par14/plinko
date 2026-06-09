import { Injectable, computed, inject } from '@angular/core';
import { AudioService } from '../core/audio/audio.service';
import { multiplierFor, type RiskMode, type Rows } from '../core/fairness/multipliers';
import type { GameResult } from '../core/models';
import { roundMoney } from '../core/util/money';
import { GameConfigStore, MIN_BET } from './game-config.store';
import { HistoryStore } from './history.store';
import { PlayersStore } from './players.store';

/** A single ball in flight and the stake it carries. The landing bucket is
 *  decided by the physics simulation, not predetermined. */
export interface BallDrop {
  id: string;
  rows: Rows;
  risk: RiskMode;
  bet: number;
}

/** The board registers this to animate a drop and report the bucket the ball
 *  physically lands in. */
export type BallLauncher = (drop: BallDrop, onLand: (bucketIndex: number) => void) => void;

const MAX_ACTIVE_BALLS = 50;

/**
 * Orchestrates a drop across the stores: validate → debit the stake → drop the
 * ball → credit the payout for whichever bucket the physics lands it in.
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

  play(): void {
    if (!this.canPlay()) return;

    const bet = this.config.bet();
    const drop: BallDrop = {
      id: crypto.randomUUID(),
      rows: this.config.rows(),
      risk: this.config.risk(),
      bet,
    };

    // Debit the stake up front so the balance can never go negative.
    this.players.adjustBalance(-bet);
    this.config.addBall();
    this.audio.playDrop();

    if (this.launcher) {
      this.launcher(drop, (bucket) => this.settle(drop, bucket));
    } else {
      // Headless fallback (tests/SSR with no board): land in the centre bucket.
      this.settle(drop, Math.floor(drop.rows / 2));
    }
  }

  private settle(drop: BallDrop, bucketIndex: number): void {
    const multiplier = multiplierFor(drop.rows, drop.risk, bucketIndex);
    const payout = roundMoney(drop.bet * multiplier);
    const win = roundMoney(payout - drop.bet);

    this.players.adjustBalance(payout);
    this.config.removeBall();
    this.config.setLastWin(win);
    this.audio.playBucket(multiplier);

    const playerId = this.players.activePlayerId();
    if (!playerId) return;

    const result: GameResult = {
      id: drop.id,
      playerId,
      bet: drop.bet,
      rows: drop.rows,
      risk: drop.risk,
      bucketIndex,
      multiplier,
      payout,
      win,
      time: Date.now(),
    };
    this.history.addResult(result);
  }
}
