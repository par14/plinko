import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import type { GameResult, Player } from '../models';
import { IdbPlinkoStore, MemoryPlinkoStore, type PlinkoStore } from './plinko-db';

function player(id: string, balance = 100): Player {
  return { id, name: `P-${id}`, balance, createdAt: 1000 };
}

function result(id: string, playerId: string, time: number, win = 5): GameResult {
  return {
    id,
    playerId,
    bet: 1,
    rows: 8,
    risk: 'low',
    bucketIndex: 0,
    multiplier: 5.6,
    payout: 5.6,
    win,
    serverSeed: 's',
    clientSeed: 'c',
    nonce: 1,
    time,
  };
}

// Run the same contract against both the IndexedDB-backed store and the
// in-memory fallback used in private mode / when IndexedDB is unavailable.
let dbCounter = 0;
const implementations: Array<[string, () => PlinkoStore]> = [
  ['IdbPlinkoStore', () => new IdbPlinkoStore(`plinko-test-${dbCounter++}`)],
  ['MemoryPlinkoStore', () => new MemoryPlinkoStore()],
];

describe.each(implementations)('%s', (_name, create) => {
  let store: PlinkoStore;
  beforeEach(() => {
    store = create();
  });

  it('round-trips a player', async () => {
    await store.putPlayer(player('a', 250));
    const players = await store.getPlayers();
    expect(players).toEqual([player('a', 250)]);
  });

  it('updates a player in place on a second put', async () => {
    await store.putPlayer(player('a', 100));
    await store.putPlayer(player('a', 175));
    const players = await store.getPlayers();
    expect(players).toHaveLength(1);
    expect(players[0].balance).toBe(175);
  });

  it('deletes a player', async () => {
    await store.putPlayer(player('a'));
    await store.deletePlayer('a');
    expect(await store.getPlayers()).toEqual([]);
  });

  it('returns a player results newest-first', async () => {
    await store.addResult(result('r1', 'a', 100));
    await store.addResult(result('r2', 'a', 300));
    await store.addResult(result('r3', 'a', 200));
    const results = await store.getResults('a');
    expect(results.map((r) => r.id)).toEqual(['r2', 'r3', 'r1']);
  });

  it('scopes results to the requested player', async () => {
    await store.addResult(result('r1', 'a', 100));
    await store.addResult(result('r2', 'b', 100));
    const results = await store.getResults('a');
    expect(results.map((r) => r.id)).toEqual(['r1']);
  });

  it('honours a result limit', async () => {
    for (let i = 0; i < 5; i++) await store.addResult(result(`r${i}`, 'a', i));
    const results = await store.getResults('a', 2);
    expect(results.map((r) => r.id)).toEqual(['r4', 'r3']);
  });

  it('clears a player results', async () => {
    await store.addResult(result('r1', 'a', 100));
    await store.clearResults('a');
    expect(await store.getResults('a')).toEqual([]);
  });
});

const cappers: Array<[string, () => PlinkoStore]> = [
  ['IdbPlinkoStore', () => new IdbPlinkoStore(`plinko-cap-${dbCounter++}`, 5)],
  ['MemoryPlinkoStore', () => new MemoryPlinkoStore(5)],
];

describe.each(cappers)('%s results cap', (_name, create) => {
  it('keeps only the newest N results for a player', async () => {
    const store = create();
    for (let i = 0; i < 9; i++) await store.addResult(result(`r${i}`, 'a', i));
    const results = await store.getResults('a');
    expect(results).toHaveLength(5);
    expect(results.map((r) => r.id)).toEqual(['r8', 'r7', 'r6', 'r5', 'r4']);
  });

  it('caps each player independently', async () => {
    const store = create();
    for (let i = 0; i < 7; i++) await store.addResult(result(`a${i}`, 'a', i));
    for (let i = 0; i < 3; i++) await store.addResult(result(`b${i}`, 'b', i));
    expect(await store.getResults('a')).toHaveLength(5);
    expect(await store.getResults('b')).toHaveLength(3);
  });
});
