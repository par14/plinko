import { useEffect } from "react"
import { Outlet, useNavigate } from "react-router-dom"

import { useAppSelector } from "../hooks/store.hooks"
import { selectCurrentUserId } from "./auth.selectors"

export function AuthGuard() {
  const navigate = useNavigate()
  const userId = useAppSelector(selectCurrentUserId)

  useEffect(() => {
    if (!userId) {
      navigate("/")
    }
  }, [userId])

  if (userId) {
    return <Outlet />
  }
}
