import { selectActiveBalls } from "@store/config/config.selectors"
import { useAppSelector } from "@store/hooks/store.hooks"
import { useEffect } from "react"

import { Game } from "./components/Game"
import { History } from "./components/History"
import styles from "./index.module.css"

export function PlinkoGamePage() {
  const activeBalls = useAppSelector(selectActiveBalls)

  const alertUser = (e: BeforeUnloadEvent) => {
    if (activeBalls > 0) {
      e.preventDefault()
      e.returnValue = ""
    }
  }

  useEffect(() => {
    window.addEventListener("beforeunload", alertUser)

    return () => {
      window.removeEventListener("beforeunload", alertUser)
    }
  }, [activeBalls])

  return (
    <section className={styles.game}>
      <History />
      <Game />
    </section>
  )
}
