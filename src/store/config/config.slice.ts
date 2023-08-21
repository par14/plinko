import { createSlice, PayloadAction } from "@reduxjs/toolkit"

import { emptyConfig, initialState } from "./config.constants"
import type { Config } from "./config.interface"

export const configSlice = createSlice({
  name: "config",
  initialState,
  reducers: {
    setBet: (state, action: PayloadAction<Pick<Config, "bet">>) => {
      state.bet = action.payload.bet
      localStorage.setItem("bet", String(state.bet))
    },
    setLinesCount: (
      state,
      action: PayloadAction<Pick<Config, "linesCount">>,
    ) => {
      state.linesCount = action.payload.linesCount
      localStorage.setItem("linesCount", String(state.linesCount))
    },
    setRiskMode: (state, action: PayloadAction<Pick<Config, "riskMode">>) => {
      state.riskMode = action.payload.riskMode
      localStorage.setItem("riskMode", state.riskMode)
    },
    addGameRunning: (state) => {
      state.activeBalls = state.activeBalls + 1
    },
    removeGameRunning: (state) => {
      state.activeBalls = state.activeBalls - 1
    },
    setLastWin: (state, action: PayloadAction<Pick<Config, "lastWin">>) => {
      state.lastWin = action.payload.lastWin
    },
    clearConfig: () => {
      return emptyConfig
    },
  },
})

export const {
  setBet,
  setRiskMode,
  setLinesCount,
  addGameRunning,
  removeGameRunning,
  setLastWin,
  clearConfig,
} = configSlice.actions

export default configSlice.reducer
