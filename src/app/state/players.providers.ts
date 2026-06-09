import { inject, provideAppInitializer } from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import { type CanActivateFn, Router } from '@angular/router';
import { filter, firstValueFrom, take } from 'rxjs';
import { PlayersStore } from './players.store';

/** Blocks navigation to the game until a player is selected. */
export const activePlayerGuard: CanActivateFn = () => {
  const players = inject(PlayersStore);
  const router = inject(Router);
  return players.activePlayerId() !== null ? true : router.createUrlTree(['/']);
};

/**
 * Waits for the players store to hydrate from IndexedDB before the app renders,
 * so the guard and balance never flash empty (the hydration-race fix).
 */
export function provideHydratedPlayers() {
  return provideAppInitializer(() => {
    const players = inject(PlayersStore);
    return firstValueFrom(
      toObservable(players.hydrated).pipe(
        filter((hydrated) => hydrated),
        take(1),
      ),
    );
  });
}
