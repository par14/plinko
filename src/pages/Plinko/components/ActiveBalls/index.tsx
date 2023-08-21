import { Typography } from "@mui/material"
import { MAX_ACTIVE_BALLS } from "@pages/Plinko/components/Game/config"
import { selectActiveBalls } from "@store/config/config.selectors"
import { useAppSelector } from "@store/hooks/store.hooks"

import styles from "./index.module.css"

export function ActiveBalls() {
  const activeBalls = useAppSelector(selectActiveBalls)

  return (
    <div className={styles.activeBallsWrapper}>
      <Typography color="white" fontWeight="600" fontSize="16px">
        Active
      </Typography>
      <Typography color="#feffdf" fontWeight="700" fontSize="25px">
        {activeBalls}/{MAX_ACTIVE_BALLS}
      </Typography>
    </div>
  )
}
