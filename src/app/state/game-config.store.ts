import { signalStore, patchState, withHooks, withMethods, withState } from '@ngrx/signals';
import { RISK_MODES, ROWS_OPTIONS, type RiskMode, type Rows } from '../core/fairness/multipliers';
import { createSeedCommitment, type FairnessSeed } from '../core/fairness/outcome';
import { randomHex } from '../core/fairness/rng';
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
    if (!raw) return fallback;

    const saved = JSON.parse(raw) as Partial<Prefs>;
    return {
      bet:
        typeof saved.bet === 'number' && Number.isFinite(saved.bet) && saved.bet >= 0
          ? saved.bet
          : fallback.bet,
      rows: ROWS_OPTIONS.includes(saved.rows as Rows) ? (saved.rows as Rows) : fallback.rows,
      risk: RISK_MODES.includes(saved.risk as RiskMode) ? (saved.risk as RiskMode) : fallback.risk,
    };
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
  serverSeed: string;
  serverSeedHash: string;
  clientSeed: string;
  nonce: number;
}

const initialServerSeed = randomHex();

export const GameConfigStore = signalStore(
  { providedIn: 'root' },
  withState<GameConfigState>(() => ({
    ...readPrefs(),
    activeBalls: 0,
    lastWin: null,
    serverSeed: initialServerSeed,
    serverSeedHash: '',
    clientSeed: randomHex(8),
    nonce: 0,
  })),
  withMethods((store) => {
    const persist = () => writePrefs({ bet: store.bet(), rows: store.rows(), risk: store.risk() });
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
      setServerSeedHash(serverSeedHash: string): void {
        patchState(store, { serverSeedHash });
      },
      /** Reserves the committed seed for one drop and rotates the next commitment. */
      takeSeed(): FairnessSeed {
        const seed: FairnessSeed = {
          serverSeed: store.serverSeed(),
          serverSeedHash: store.serverSeedHash(),
          clientSeed: store.clientSeed(),
          nonce: store.nonce() + 1,
        };
        const nextServerSeed = randomHex();
        patchState(store, { serverSeed: nextServerSeed, serverSeedHash: '', nonce: seed.nonce });
        void createSeedCommitment(nextServerSeed).then((hash) =>
          patchState(store, { serverSeedHash: hash }),
        );
        return seed;
      },
    };
  }),
  withHooks({
    onInit(store) {
      void createSeedCommitment(store.serverSeed()).then((hash) => store.setServerSeedHash(hash));
    },
  }),
);
