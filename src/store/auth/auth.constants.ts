import type { Auth, User, Wallet } from "@store/auth/auth.interface"

const userInitialState: User = {
  id: localStorage.getItem("uid") ?? "",
  name: localStorage.getItem("name") ?? "",
}

const walletInitialState: Wallet = {
  balance: Number(localStorage.getItem("balance")) || 0,
}

export const initialState: Auth = {
  user: userInitialState,
  wallet: walletInitialState,
}
