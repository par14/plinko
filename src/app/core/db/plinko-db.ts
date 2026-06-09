import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { GameResult, Player } from '../models';

/** Storage contract shared by the IndexedDB store and the in-memory fallback. */
export interface PlinkoStore {
  putPlayer(player: Player): Promise<void>;
  getPlayers(): Promise<Player[]>;
  deletePlayer(id: string): Promise<void>;
  addResult(result: GameResult): Promise<void>;
  /** Newest-first; optionally capped to `limit`. */
  getResults(playerId: string, limit?: number): Promise<GameResult[]>;
  clearResults(playerId: string): Promise<void>;
}

interface PlinkoSchema extends DBSchema {
  players: { key: string; value: Player };
  results: { key: string; value: GameResult; indexes: { 'by-player': string } };
}

const DB_VERSION = 1;

export class IdbPlinkoStore implements PlinkoStore {
  private readonly dbPromise: Promise<IDBPDatabase<PlinkoSchema>>;

  constructor(name = 'plinko') {
    this.dbPromise = openDB<PlinkoSchema>(name, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('players')) {
          db.createObjectStore('players', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('results')) {
          const results = db.createObjectStore('results', { keyPath: 'id' });
          results.createIndex('by-player', 'playerId');
        }
      },
    });
  }

  async putPlayer(player: Player): Promise<void> {
    await (await this.dbPromise).put('players', player);
  }

  async getPlayers(): Promise<Player[]> {
    return (await this.dbPromise).getAll('players');
  }

  async deletePlayer(id: string): Promise<void> {
    await (await this.dbPromise).delete('players', id);
  }

  async addResult(result: GameResult): Promise<void> {
    await (await this.dbPromise).put('results', result);
  }

  async getResults(playerId: string, limit?: number): Promise<GameResult[]> {
    const all = await (await this.dbPromise).getAllFromIndex('results', 'by-player', playerId);
    return sortAndLimit(all, limit);
  }

  async clearResults(playerId: string): Promise<void> {
    const db = await this.dbPromise;
    const tx = db.transaction('results', 'readwrite');
    const index = tx.store.index('by-player');
    for await (const cursor of index.iterate(playerId)) {
      await cursor.delete();
    }
    await tx.done;
  }
}

/** Used when IndexedDB is unavailable (private mode, quota errors, SSR). */
export class MemoryPlinkoStore implements PlinkoStore {
  private readonly players = new Map<string, Player>();
  private readonly results = new Map<string, GameResult>();

  async putPlayer(player: Player): Promise<void> {
    this.players.set(player.id, { ...player });
  }

  async getPlayers(): Promise<Player[]> {
    return [...this.players.values()].map((p) => ({ ...p }));
  }

  async deletePlayer(id: string): Promise<void> {
    this.players.delete(id);
  }

  async addResult(result: GameResult): Promise<void> {
    this.results.set(result.id, { ...result });
  }

  async getResults(playerId: string, limit?: number): Promise<GameResult[]> {
    const all = [...this.results.values()].filter((r) => r.playerId === playerId);
    return sortAndLimit(all, limit);
  }

  async clearResults(playerId: string): Promise<void> {
    for (const [id, r] of this.results) {
      if (r.playerId === playerId) this.results.delete(id);
    }
  }
}

function sortAndLimit(results: GameResult[], limit?: number): GameResult[] {
  const sorted = [...results].sort((a, b) => b.time - a.time);
  return limit === undefined ? sorted : sorted.slice(0, limit);
}

/** Picks the IndexedDB store when available, falling back to in-memory. */
export function createPlinkoStore(name = 'plinko'): PlinkoStore {
  try {
    if (typeof indexedDB !== 'undefined') {
      return new IdbPlinkoStore(name);
    }
  } catch {
    // fall through to memory
  }
  return new MemoryPlinkoStore();
}
