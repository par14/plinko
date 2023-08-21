import type { Action, ThunkAction } from "@reduxjs/toolkit"
import { configureStore } from "@reduxjs/toolkit"

import authReducer from "./auth/auth.slice"
import configReducer from "./config/config.slice"
import historyReducer from "./history/history.slice"

export const store = configureStore({
  reducer: {
    auth: authReducer,
    history: historyReducer,
    config: configReducer,
  },
})

export type AppDispatch = typeof store.dispatch
export type RootState = ReturnType<typeof store.getState>
export type AppThunk<ReturnType = void> = ThunkAction<
  ReturnType,
  RootState,
  unknown,
  Action<string>
>
