import { Injectable, computed, inject } from '@angular/core';
import { AudioService } from '../core/audio/audio.service';
import { multiplierFor, type RiskMode, type Rows } from '../core/fairness/multipliers';
import { dropOutcome, type DropOutcome } from '../core/fairness/outcome';
import type { GameResult } from '../core/models';
import { roundMoney } from '../core/util/money';
import { GameConfigStore, MIN_BET } from './game-config.store';
import { HistoryStore } from './history.store';
import { PlayersStore } from './players.store';

/** A single ball in flight and its precomputed, verifiable outcome. */
export interface BallDrop {
  id: string;
  playerId: string;
  rows: Rows;
  risk: RiskMode;
  bet: number;
  multiplier: number;
  outcome: DropOutcome;
}

/** The board reports only that the predetermined drop finished animating. */
export type BallLauncher = (drop: BallDrop, onLand: () => void) => void;

const MAX_ACTIVE_BALLS = 50;

/**
 * Orchestrates a drop across the stores: validate → debit the stake → drop the
 * compute the committed outcome → animate → credit its predetermined payout.
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
      this.config.serverSeedHash() !== '' &&
      this.config.bet() >= MIN_BET &&
      this.config.bet() <= this.players.balance() &&
      this.config.activeBalls() < MAX_ACTIVE_BALLS,
  );

  registerLauncher(launcher: BallLauncher | null): void {
    this.launcher = launcher;
  }

  async play(): Promise<void> {
    if (!this.canPlay()) return;

    const playerId = this.players.activePlayerId();
    if (!playerId) return;
    const bet = this.config.bet();
    const rows = this.config.rows();
    const risk = this.config.risk();
    const seed = this.config.takeSeed();

    // Reserve funds before any async crypto work so concurrent clicks cannot overspend.
    this.players.adjustPlayerBalance(playerId, -bet);
    this.config.addBall();

    let outcome: DropOutcome;
    try {
      outcome = await dropOutcome(seed, rows);
    } catch (error) {
      this.players.adjustPlayerBalance(playerId, bet);
      this.config.removeBall();
      throw error;
    }
    const drop: BallDrop = {
      id: crypto.randomUUID(),
      playerId,
      rows,
      risk,
      bet,
      outcome,
      multiplier: multiplierFor(rows, risk, outcome.bucketIndex),
    };

    this.audio.playDrop();

    try {
      if (this.launcher) {
        this.launcher(drop, () => this.settle(drop));
      } else {
        this.settle(drop);
      }
    } catch (error) {
      if (!this.settledIds.has(drop.id)) {
        this.players.adjustPlayerBalance(playerId, bet);
        this.config.removeBall();
      }
      throw error;
    }
  }

  private readonly settledIds = new Set<string>();

  private settle(drop: BallDrop): void {
    if (this.settledIds.has(drop.id)) return;
    this.settledIds.add(drop.id);
    const payout = roundMoney(drop.bet * drop.multiplier);
    const win = roundMoney(payout - drop.bet);

    this.players.adjustPlayerBalance(drop.playerId, payout);
    this.config.removeBall();
    this.config.setLastWin(win);
    this.audio.playBucket(drop.multiplier);

    const result: GameResult = {
      id: drop.id,
      playerId: drop.playerId,
      bet: drop.bet,
      rows: drop.rows,
      risk: drop.risk,
      bucketIndex: drop.outcome.bucketIndex,
      multiplier: drop.multiplier,
      payout,
      win,
      fairnessProof: {
        version: drop.outcome.version,
        serverSeed: drop.outcome.serverSeed,
        serverSeedHash: drop.outcome.serverSeedHash,
        clientSeed: drop.outcome.clientSeed,
        nonce: drop.outcome.nonce,
        path: drop.outcome.path,
      },
      time: Date.now(),
    };
    this.history.addResult(result);
  }
}
