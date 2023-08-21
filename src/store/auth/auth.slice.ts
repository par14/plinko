import { createSlice, PayloadAction } from "@reduxjs/toolkit"
import { initialState } from "@store/auth/auth.constants"
import type { User } from "@store/auth/auth.interface"
import { roundNumber, storeUser } from "@store/auth/auth.utils"
import { v4 as uuidv4 } from "uuid"

export const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    signIn: (state, action: PayloadAction<Pick<User, "name">>) => {
      const user = {
        id: uuidv4(),
        name: action.payload.name,
      }

      state.user = user
      storeUser(user)
    },
    signOut: (state) => {
      state.user = null
      state.wallet = {
        balance: 0,
      }
      localStorage.clear()
    },
    setBalance: (state, action: PayloadAction<string>) => {
      state.wallet.balance = roundNumber(+action.payload)
      localStorage.setItem("balance", action.payload)
    },
    incrementBalance: (state, action: PayloadAction<number>) => {
      const balance = roundNumber(state.wallet.balance + action.payload)
      state.wallet.balance = balance
      localStorage.setItem("balance", JSON.stringify(balance))
    },
    decrementBalance: (state, action: PayloadAction<number>) => {
      const balance = roundNumber(state.wallet.balance - action.payload)
      state.wallet.balance = balance
      localStorage.setItem("balance", JSON.stringify(balance))
    },
  },
})

export const {
  signIn,
  signOut,
  incrementBalance,
  decrementBalance,
  setBalance,
} = authSlice.actions

export default authSlice.reducer
