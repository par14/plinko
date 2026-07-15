import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AudioService } from '../core/audio/audio.service';
import { MemoryPlinkoStore } from '../core/db/plinko-db';
import { PLINKO_STORE } from '../core/db/plinko-store.token';
import type { BallDrop } from './game.service';
import { GameService } from './game.service';
import { GameConfigStore } from './game-config.store';
import { HistoryStore } from './history.store';
import { PlayersStore } from './players.store';

const audioStub: Partial<AudioService> = {
  playDrop: () => undefined,
  playPegHit: () => undefined,
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

  it('settles the predetermined outcome and persists its proof', async () => {
    const { game, players, config, history } = setup();
    players.addPlayer('Ada', 100);
    config.setBet(10);
    config.setRows(8);
    await vi.waitFor(() => expect(game.canPlay()).toBe(true));
    let launched: BallDrop | undefined;
    game.registerLauncher((drop, onLand) => {
      launched = drop;
      onLand();
      onLand();
    });

    await game.play();

    const settled = history.results()[0];
    expect(settled.bucketIndex).toBe(launched?.outcome.bucketIndex);
    expect(settled.multiplier).toBe(launched?.multiplier);
    expect(settled.payout).toBeCloseTo(10 * settled.multiplier, 2);
    expect(settled.fairnessProof?.serverSeedHash).not.toBe('');
    expect(players.balance()).toBeCloseTo(90 + settled.payout, 2);
    expect(config.activeBalls()).toBe(0);
    expect(history.results()).toHaveLength(1);
  });

  it('refuses to play when the bet exceeds the balance', async () => {
    const { game, players, config, history } = setup();
    players.addPlayer('Ada', 5);
    config.setBet(50);
    await game.play();
    expect(players.balance()).toBe(5);
    expect(history.results()).toHaveLength(0);
  });

  it('reserves the stake before the asynchronous outcome completes', async () => {
    const { game, players, config } = setup();
    players.addPlayer('Ada', 10);
    config.setBet(10);
    await vi.waitFor(() => expect(game.canPlay()).toBe(true));
    game.registerLauncher(() => undefined);

    const playing = game.play();
    expect(players.balance()).toBe(0);
    expect(game.canPlay()).toBe(false);
    await playing;
  });

  it('credits the player who launched the ball even after switching profiles', async () => {
    const { game, players, config, history } = setup();
    const ada = players.addPlayer('Ada', 100);
    const grace = players.addPlayer('Grace', 200);
    players.selectPlayer(ada.id);
    config.setBet(10);
    await vi.waitFor(() => expect(game.canPlay()).toBe(true));

    let land: (() => void) | undefined;
    let launched: BallDrop | undefined;
    game.registerLauncher((drop, onLand) => {
      launched = drop;
      land = onLand;
    });
    await game.play();
    players.selectPlayer(grace.id);
    land?.();

    const adaBalance = players.players().find((player) => player.id === ada.id)?.balance;
    expect(adaBalance).toBeCloseTo(90 + 10 * launched!.multiplier, 2);
    expect(players.balance()).toBe(200);
    expect(history.results()).toEqual([]);
  });

  it('refunds the original player when launching the animation throws', async () => {
    const { game, players, config } = setup();
    players.addPlayer('Ada', 100);
    config.setBet(10);
    await vi.waitFor(() => expect(game.canPlay()).toBe(true));
    game.registerLauncher(() => {
      throw new Error('renderer failed');
    });

    await expect(game.play()).rejects.toThrow('renderer failed');
    expect(players.balance()).toBe(100);
    expect(config.activeBalls()).toBe(0);
  });
});
