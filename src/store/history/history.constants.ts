import type { HistoryItems } from "@store/history/history.interface";
import { getHistoryFromLocalStorage, getStatisticsFromLocalStorage } from "@store/history/history.utils";

export const initialState: HistoryItems = {
  items: getHistoryFromLocalStorage(),
  statisticItems: getStatisticsFromLocalStorage()
};
