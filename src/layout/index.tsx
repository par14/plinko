import { selectCurrentUserId } from "@store/auth/auth.selectors"
import { useAppSelector } from "@store/hooks/store.hooks"
import { Outlet } from "react-router-dom"

import { Navbar } from "./components/Navbar"
import styles from "./index.module.css"

export function Layout() {
  const userId = useAppSelector(selectCurrentUserId)

  return (
    <div
      className={`${styles.container} ${
        userId ? styles.bgGame : styles.bgLogin
      }`}
    >
      <Navbar />

      <div className={styles.game}>
        <div className={styles.outlet}>{<Outlet />}</div>
      </div>
    </div>
  )
}
