import { Tooltip, Typography } from "@mui/material"
import {
  selectCurrentUserId,
  selectCurrentUserName,
} from "@store/auth/auth.selectors"
import { useAppSelector } from "@store/hooks/store.hooks"

import styles from "./index.module.css"

export function PlayerData() {
  const userName = useAppSelector(selectCurrentUserName)
  const userId = useAppSelector(selectCurrentUserId)

  return (
    <div className={styles.playerBlock}>
      <Typography color="#9fd3c7" fontSize="25px" paddingRight="1rem">
        Player:
      </Typography>
      <Tooltip title={`${userName}; GUID: ${userId}`}>
        <Typography
          color="#feffdf"
          fontSize="30px"
          fontWeight="600"
          className={styles.playerName}
        >
          {userName}
        </Typography>
      </Tooltip>
    </div>
  )
}
