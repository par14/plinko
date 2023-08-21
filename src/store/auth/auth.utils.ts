import type { User } from "@store/auth/auth.interface"

export const storeUser = (user: User) => {
  localStorage.setItem("uid", user.id)
  localStorage.setItem("name", user.name)
}

export const roundNumber = (num: number) => {
  return Math.round(num * 100) / 100
}
