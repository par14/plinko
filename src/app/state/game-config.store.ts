import { signalStore, patchState, withMethods, withState } from '@ngrx/signals';
import type { RiskMode, Rows } from '../core/fairness/multipliers';
import { roundMoney } from '../core/util/money';

export const MIN_BET = 1;
const PREFS_KEY = 'plinko.config';

interface Prefs {
  bet: number;
  rows: Rows;
  risk: RiskMode;
}

function readPrefs(): Prefs {
  const fallback: Prefs = { bet: 1, rows: 8, risk: 'low' };
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    return raw ? { ...fallback, ...JSON.parse(raw) } : fallback;
  } catch {
    return fallback;
  }
}

function writePrefs(prefs: Prefs): void {
  try {
    localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
  } catch {
    /* ignore */
  }
}

interface GameConfigState extends Prefs {
  activeBalls: number;
  lastWin: number | null;
}

export const GameConfigStore = signalStore(
  { providedIn: 'root' },
  withState<GameConfigState>(() => ({
    ...readPrefs(),
    activeBalls: 0,
    lastWin: null,
  })),
  withMethods((store) => {
    const persist = () =>
      writePrefs({ bet: store.bet(), rows: store.rows(), risk: store.risk() });
    return {
      setBet(bet: number): void {
        patchState(store, { bet: roundMoney(Math.max(0, bet)) });
        persist();
      },
      setRows(rows: Rows): void {
        patchState(store, { rows });
        persist();
      },
      setRisk(risk: RiskMode): void {
        patchState(store, { risk });
        persist();
      },
      /** Clamp the bet between MIN_BET and the player's balance. */
      clampBet(balance: number): void {
        patchState(store, { bet: roundMoney(Math.min(Math.max(store.bet(), MIN_BET), balance)) });
        persist();
      },
      betFraction(fraction: number, balance: number): void {
        const next = Math.min(roundMoney(store.bet() * fraction), balance);
        patchState(store, { bet: Math.max(MIN_BET, next) });
        persist();
      },
      betMax(balance: number): void {
        patchState(store, { bet: roundMoney(balance) });
        persist();
      },
      setLastWin(lastWin: number): void {
        patchState(store, { lastWin });
      },
      addBall(): void {
        patchState(store, (s) => ({ activeBalls: s.activeBalls + 1 }));
      },
      removeBall(): void {
        patchState(store, (s) => ({ activeBalls: Math.max(0, s.activeBalls - 1) }));
      },
    };
  }),
);
