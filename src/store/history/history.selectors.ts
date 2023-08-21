import type { RootState } from "@store/store";

export const selectHistoryItems = (state: RootState) => state.history.items;
export const selectStatisticItems = (state: RootState) => state.history?.statisticItems
