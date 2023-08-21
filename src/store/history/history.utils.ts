import type { HistoryItem } from "@store/history/history.interface"
import { StatisticItems } from "@store/history/history.interface"

export const getHistoryFromLocalStorage = (): HistoryItem[] => {
  const history = localStorage.getItem("history")

  if (history) {
    return JSON.parse(history) as HistoryItem[]
  }

  return []
}

export const getStatisticsFromLocalStorage = (): StatisticItems => {
  const statistic = localStorage.getItem("statisticCount")

  if (statistic) {
    return JSON.parse(statistic) as StatisticItems
  }

  return null
}
