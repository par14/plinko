import { computed, inject } from '@angular/core';
import {
  patchState,
  signalStore,
  withComputed,
  withHooks,
  withMethods,
  withState,
} from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { from, of, pipe, switchMap, tap } from 'rxjs';
import { PLINKO_STORE } from '../core/db/plinko-store.token';
import type { GameResult } from '../core/models';
import { PlayersStore } from './players.store';

const HISTORY_CAP = 50;

interface HistoryState {
  results: GameResult[];
  hydrated: boolean;
}

export const HistoryStore = signalStore(
  { providedIn: 'root' },
  withState<HistoryState>({ results: [], hydrated: false }),
  withComputed((store) => ({
    /** Count of each multiplier landed, derived from the loaded results. */
    statistics: computed(() => {
      const counts: Record<number, number> = {};
      for (const r of store.results()) {
        counts[r.multiplier] = (counts[r.multiplier] ?? 0) + 1;
      }
      return counts;
    }),
  })),
  withMethods((store, db = inject(PLINKO_STORE), players = inject(PlayersStore)) => ({
    _loadFor: rxMethod<string | null>(
      pipe(
        switchMap((playerId) =>
          playerId ? from(db.getResults(playerId, HISTORY_CAP)) : of([] as GameResult[]),
        ),
        tap((results) => patchState(store, { results, hydrated: true })),
      ),
    ),
    addResult(result: GameResult): void {
      if (players.activePlayerId() === result.playerId) {
        patchState(store, (s) => ({
          results: [result, ...s.results].slice(0, HISTORY_CAP),
        }));
      }
      void db.addResult(result);
    },
    clear(playerId: string): void {
      patchState(store, { results: [] });
      void db.clearResults(playerId);
    },
  })),
  withHooks({
    onInit(store) {
      // Reload history whenever the active player changes.
      const players = inject(PlayersStore);
      store._loadFor(players.activePlayerId);
    },
  }),
);
