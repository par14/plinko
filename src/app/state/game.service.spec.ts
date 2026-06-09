import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { AudioService } from '../core/audio/audio.service';
import { MemoryPlinkoStore } from '../core/db/plinko-db';
import { PLINKO_STORE } from '../core/db/plinko-store.token';
import { multiplierFor } from '../core/fairness/multipliers';
import { GameService } from './game.service';
import { GameConfigStore } from './game-config.store';
import { HistoryStore } from './history.store';
import { PlayersStore } from './players.store';

// Stub audio so jsdom's unimplemented HTMLMediaElement.play() stays quiet.
const audioStub: Partial<AudioService> = {
  playDrop: () => undefined,
  playBucket: () => undefined,
  unlock: () => undefined,
};

function setup() {
  TestBed.configureTestingModule({
    providers: [
      { provide: PLINKO_STORE, useValue: new MemoryPlinkoStore() },
      { provide: AudioService, useValue: audioStub },
    ],
  });
  return {
    game: TestBed.inject(GameService),
    players: TestBed.inject(PlayersStore),
    config: TestBed.inject(GameConfigStore),
    history: TestBed.inject(HistoryStore),
  };
}

describe('GameService', () => {
  beforeEach(() => localStorage.clear());

  it('debits the stake and credits the payout for the bucket the board reports', () => {
    const { game, players, config, history } = setup();
    players.addPlayer('Ada', 100);
    config.setBet(10);
    config.setRows(8);
    config.setRisk('low');
    // Board stub: report that the ball landed in bucket 0 (8-row low = 5.6×).
    game.registerLauncher((_drop, onLand) => onLand(0));

    game.play();

    const expectedMultiplier = multiplierFor(8, 'low', 0);
    const settled = history.results()[0];
    expect(settled.bucketIndex).toBe(0);
    expect(settled.multiplier).toBe(expectedMultiplier);
    expect(settled.payout).toBeCloseTo(10 * expectedMultiplier, 2);
    expect(settled.win).toBeCloseTo(10 * expectedMultiplier - 10, 2);
    // balance = 100 - 10 (stake) + payout
    expect(players.balance()).toBeCloseTo(90 + settled.payout, 2);
    expect(config.activeBalls()).toBe(0);
  });

  it('refuses to play when the bet exceeds the balance', () => {
    const { game, players, config, history } = setup();
    players.addPlayer('Ada', 5);
    config.setBet(50);
    game.registerLauncher((_drop, onLand) => onLand(4));
    expect(game.canPlay()).toBe(false);

    game.play();
    expect(players.balance()).toBe(5);
    expect(history.results()).toHaveLength(0);
  });

  it('records a result within a valid bucket range', () => {
    const { game, players, config, history } = setup();
    players.addPlayer('Ada', 100);
    config.setBet(1);
    config.setRows(12);
    game.registerLauncher((_drop, onLand) => onLand(6));

    game.play();

    const result = history.results()[0];
    expect(result.bucketIndex).toBeGreaterThanOrEqual(0);
    expect(result.bucketIndex).toBeLessThanOrEqual(result.rows);
  });
});
