import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { MemoryPlinkoStore } from '../core/db/plinko-db';
import { PLINKO_STORE } from '../core/db/plinko-store.token';
import { PlayersStore } from './players.store';

function setup() {
  TestBed.configureTestingModule({
    providers: [{ provide: PLINKO_STORE, useValue: new MemoryPlinkoStore() }],
  });
  return TestBed.inject(PlayersStore);
}

describe('PlayersStore', () => {
  beforeEach(() => localStorage.clear());

  it('adds a player, makes them active, and exposes their balance', () => {
    const store = setup();
    store.addPlayer('Ada', 250);
    expect(store.players()).toHaveLength(1);
    expect(store.activePlayer()?.name).toBe('Ada');
    expect(store.balance()).toBe(250);
  });

  it('adjusts the active player balance and rounds it', () => {
    const store = setup();
    store.addPlayer('Ada', 100);
    store.adjustBalance(-33.333);
    expect(store.balance()).toBe(66.67);
    store.adjustBalance(10);
    expect(store.balance()).toBe(76.67);
  });

  it('switches the active player', () => {
    const store = setup();
    store.addPlayer('Ada', 100);
    const grace = store.addPlayer('Grace', 500);
    store.selectPlayer(grace.id);
    expect(store.balance()).toBe(500);
    expect(localStorage.getItem('plinko.activePlayerId')).toBe(grace.id);
  });

  it('adjusts a specific player without changing the active profile', () => {
    const store = setup();
    const ada = store.addPlayer('Ada', 100);
    const grace = store.addPlayer('Grace', 500);
    store.adjustPlayerBalance(ada.id, 25);

    expect(store.activePlayerId()).toBe(grace.id);
    expect(store.balance()).toBe(500);
    expect(store.players().find((player) => player.id === ada.id)?.balance).toBe(125);
  });

  it('clears the active player when it is deleted', () => {
    const store = setup();
    const ada = store.addPlayer('Ada', 100);
    store.deletePlayer(ada.id);
    expect(store.players()).toEqual([]);
    expect(store.activePlayerId()).toBeNull();
    expect(store.balance()).toBe(0);
  });
});
