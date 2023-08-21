import type { RootState } from "@store/store";

export const selectBet = (state: RootState) => state.config.bet;
export const selectLinesCount = (state: RootState) => state.config.linesCount;
export const selectRiskMode = (state: RootState) => state.config.riskMode;
export const selectActiveBalls = (state: RootState) => state.config.activeBalls;
export const selectLastWin = (state: RootState) => Math.abs(state.config.lastWin);

