import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { AudioService } from '../core/audio/audio.service';
import { MemoryPlinkoStore } from '../core/db/plinko-db';
import { PLINKO_STORE } from '../core/db/plinko-store.token';
import { GameService } from './game.service';

// Stub audio so jsdom's unimplemented HTMLMediaElement.play() stays quiet.
const audioStub: Partial<AudioService> = {
  playDrop: () => undefined,
  playBucket: () => undefined,
  unlock: () => undefined,
};
import { GameConfigStore } from './game-config.store';
import { HistoryStore } from './history.store';
import { PlayersStore } from './players.store';

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

  it('debits the stake and credits the payout, leaving net = bet*(multiplier-1)', async () => {
    const { game, players, config, history } = setup();
    players.addPlayer('Ada', 100);
    config.setBet(10);

    await game.play(); // no launcher registered -> settles immediately

    const expectedBalance = players.balance();
    const settled = history.results()[0];
    expect(settled).toBeDefined();
    // balance = 100 - bet + payout = 100 - 10 + 10*multiplier
    expect(expectedBalance).toBeCloseTo(90 + settled.payout, 2);
    expect(settled.win).toBeCloseTo(settled.payout - 10, 2);
    expect(config.activeBalls()).toBe(0);
  });

  it('refuses to play when the bet exceeds the balance', async () => {
    const { game, players, config, history } = setup();
    players.addPlayer('Ada', 5);
    config.setBet(50);
    expect(game.canPlay()).toBe(false);

    await game.play();
    expect(players.balance()).toBe(5);
    expect(history.results()).toHaveLength(0);
  });

  it('records a re-verifiable result (stores seed + nonce)', async () => {
    const { game, players, config, history } = setup();
    players.addPlayer('Ada', 100);
    config.setBet(1);

    await game.play();

    const result = history.results()[0];
    expect(result.serverSeed).toBeTruthy();
    expect(result.nonce).toBeGreaterThan(0);
    expect(result.bucketIndex).toBeGreaterThanOrEqual(0);
    expect(result.bucketIndex).toBeLessThanOrEqual(result.rows);
  });
});
