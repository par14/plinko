import { createSlice, PayloadAction } from "@reduxjs/toolkit"
import { initialState } from "@store/history/history.constants"
import type { HistoryItem } from "@store/history/history.interface"

export const historySlice = createSlice({
  name: "history",
  initialState,
  reducers: {
    addItemToHistory: (state, action: PayloadAction<HistoryItem>) => {
      if (state.items.length > 50) {
        state.items.shift()
      }

      state.items.push(action.payload)
      localStorage.setItem("history", JSON.stringify(state.items))
    },
    addItemToStatistic: (state, action: PayloadAction<number>) => {
      const value = action.payload

      if (state?.statisticItems?.[value]) {
        state.statisticItems[value] += 1
      } else {
        state.statisticItems = {
          ...state.statisticItems,
          [value]: 1,
        }
      }

      localStorage.setItem(
        "statisticCount",
        JSON.stringify(state.statisticItems),
      )
    },
    clearHistory: (state) => {
      state.items = []
      localStorage.removeItem("history")
    },
    clearStatistics: (state) => {
      state.statisticItems = null
      localStorage.removeItem("statisticCount")
    },
  },
})

export const {
  clearHistory,
  addItemToHistory,
  addItemToStatistic,
  clearStatistics,
} = historySlice.actions

export default historySlice.reducer
