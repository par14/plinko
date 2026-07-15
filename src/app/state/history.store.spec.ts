import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { MemoryPlinkoStore } from '../core/db/plinko-db';
import { PLINKO_STORE } from '../core/db/plinko-store.token';
import type { GameResult } from '../core/models';
import { HistoryStore } from './history.store';
import { PlayersStore } from './players.store';

function result(id: string, multiplier: number, playerId: string): GameResult {
  return {
    id,
    playerId,
    bet: 1,
    rows: 8,
    risk: 'low',
    bucketIndex: 0,
    multiplier,
    payout: multiplier,
    win: multiplier - 1,
    time: 1,
  };
}

function setup() {
  TestBed.configureTestingModule({
    providers: [{ provide: PLINKO_STORE, useValue: new MemoryPlinkoStore() }],
  });
  const players = TestBed.inject(PlayersStore);
  const player = players.addPlayer('Ada', 100);
  return { store: TestBed.inject(HistoryStore), playerId: player.id };
}

describe('HistoryStore', () => {
  beforeEach(() => localStorage.clear());

  it('prepends results newest-first', () => {
    const { store, playerId } = setup();
    store.addResult(result('r1', 2, playerId));
    store.addResult(result('r2', 5, playerId));
    expect(store.results().map((r) => r.id)).toEqual(['r2', 'r1']);
  });

  it('caps the in-memory history at 50 entries', () => {
    const { store, playerId } = setup();
    for (let i = 0; i < 60; i++) store.addResult(result(`r${i}`, 1, playerId));
    expect(store.results()).toHaveLength(50);
    expect(store.results()[0].id).toBe('r59');
  });

  it('derives multiplier statistics from the results', () => {
    const { store, playerId } = setup();
    store.addResult(result('r1', 2, playerId));
    store.addResult(result('r2', 2, playerId));
    store.addResult(result('r3', 5, playerId));
    expect(store.statistics()).toEqual({ 2: 2, 5: 1 });
  });
});
