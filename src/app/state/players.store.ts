import { computed, inject } from '@angular/core';
import { patchState, signalStore, withComputed, withHooks, withMethods, withState } from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { from, pipe, switchMap, tap } from 'rxjs';
import { PLINKO_STORE } from '../core/db/plinko-store.token';
import type { Player } from '../core/models';
import { roundMoney } from '../core/util/money';

const ACTIVE_KEY = 'plinko.activePlayerId';

function readActiveId(): string | null {
  try {
    return localStorage.getItem(ACTIVE_KEY);
  } catch {
    return null;
  }
}

function writeActiveId(id: string | null): void {
  try {
    if (id) localStorage.setItem(ACTIVE_KEY, id);
    else localStorage.removeItem(ACTIVE_KEY);
  } catch {
    /* ignore (private mode) */
  }
}

interface PlayersState {
  players: Player[];
  activePlayerId: string | null;
  hydrated: boolean;
}

export const PlayersStore = signalStore(
  { providedIn: 'root' },
  withState<PlayersState>(() => ({
    players: [],
    // Read synchronously so the route guard never sees a hydration race.
    activePlayerId: readActiveId(),
    hydrated: false,
  })),
  withComputed((store) => ({
    activePlayer: computed(
      () => store.players().find((p) => p.id === store.activePlayerId()) ?? null,
    ),
    balance: computed(
      () => store.players().find((p) => p.id === store.activePlayerId())?.balance ?? 0,
    ),
  })),
  withMethods((store, db = inject(PLINKO_STORE)) => ({
    _load: rxMethod<void>(
      pipe(
        switchMap(() => from(db.getPlayers())),
        // Merge rather than replace: a player added before hydration resolved
        // must not be clobbered by the (older) persisted snapshot.
        tap((loaded) =>
          patchState(store, (s) => {
            const byId = new Map(loaded.map((p) => [p.id, p]));
            for (const p of s.players) byId.set(p.id, p);
            return { players: [...byId.values()], hydrated: true };
          }),
        ),
      ),
    ),
    addPlayer(name: string, startingBalance: number): Player {
      const player: Player = {
        id: crypto.randomUUID(),
        name: name.trim(),
        balance: roundMoney(startingBalance),
        createdAt: Date.now(),
      };
      patchState(store, (s) => ({
        players: [...s.players, player],
        activePlayerId: player.id,
      }));
      writeActiveId(player.id);
      void db.putPlayer(player);
      return player;
    },
    selectPlayer(id: string): void {
      patchState(store, { activePlayerId: id });
      writeActiveId(id);
    },
    /** Adds (or subtracts) from the active player's balance and persists. */
    adjustBalance(delta: number): void {
      const id = store.activePlayerId();
      if (!id) return;
      patchState(store, (s) => ({
        players: s.players.map((p) =>
          p.id === id ? { ...p, balance: roundMoney(p.balance + delta) } : p,
        ),
      }));
      const updated = store.players().find((p) => p.id === id);
      if (updated) void db.putPlayer(updated);
    },
    deletePlayer(id: string): void {
      patchState(store, (s) => ({
        players: s.players.filter((p) => p.id !== id),
        activePlayerId: s.activePlayerId === id ? null : s.activePlayerId,
      }));
      if (store.activePlayerId() === null) writeActiveId(null);
      void db.deletePlayer(id);
      void db.clearResults(id);
    },
  })),
  withHooks({
    onInit(store) {
      store._load();
    },
  }),
);
