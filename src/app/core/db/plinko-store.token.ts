import { InjectionToken } from '@angular/core';
import { createPlinkoStore, type PlinkoStore } from './plinko-db';

/** Injectable handle to the persistence layer (IndexedDB, or in-memory fallback). */
export const PLINKO_STORE = new InjectionToken<PlinkoStore>('PLINKO_STORE', {
  providedIn: 'root',
  factory: () => createPlinkoStore(),
});
