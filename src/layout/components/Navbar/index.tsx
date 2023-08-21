import ExitToAppIcon from "@mui/icons-material/ExitToApp"
import { IconButton, Tooltip } from "@mui/material"
import { selectCurrentUserId } from "@store/auth/auth.selectors"
import { signOut } from "@store/auth/auth.slice"
import { clearConfig } from "@store/config/config.slice"
import { clearHistory, clearStatistics } from "@store/history/history.slice"
import { useAppDispatch, useAppSelector } from "@store/hooks/store.hooks"

import { Logo } from "../Logo"
import { PlayerData } from "../PlayerData"
import styles from "./index.module.css"

export function Navbar() {
  const dispatch = useAppDispatch()
  const userId = useAppSelector(selectCurrentUserId)

  function handleSignOut() {
    dispatch(signOut())
    dispatch(clearHistory())
    dispatch(clearStatistics())
    dispatch(clearConfig())
  }

  return (
    <nav className={styles.nav}>
      <Logo />
      {userId && (
        <div className={styles.playerWrapper}>
          <PlayerData />
          <Tooltip title="SignOut">
            <IconButton
              sx={{ color: "#9fd3c7", fontSize: "80px" }}
              aria-label="sign-out"
              onClick={handleSignOut}
            >
              <ExitToAppIcon fontSize="large" />
            </IconButton>
          </Tooltip>
        </div>
      )}
    </nav>
  )
}
