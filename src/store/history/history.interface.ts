export interface HistoryItem {
  id: string
  bet: string
  payout: number
  time: string
  win: number
}

export type StatisticItems = { [key: number]: number } | null

export type HistoryItems = {
  items: HistoryItem[]
  statisticItems: StatisticItems
}
