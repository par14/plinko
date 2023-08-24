import { Typography } from "@mui/material"
import { MAX_ACTIVE_BALLS } from "@pages/Plinko/components/Game/config"
import { selectActiveBalls } from "@store/config/config.selectors"
import { useAppSelector } from "@store/hooks/store.hooks"
import { useMediaQuery } from "usehooks-ts"

import styles from "./index.module.css"

export function ActiveBalls() {
  const matches = useMediaQuery("(max-width: 535px)")
  const activeBalls = useAppSelector(selectActiveBalls)

  return (
    <div className={styles.activeBallsWrapper}>
      <Typography
        color="#ffc93c"
        fontWeight="600"
        fontSize={matches ? "12px" : "16px"}
      >
        Active
      </Typography>
      <Typography
        color="#feffdf"
        fontWeight="700"
        fontSize={matches ? "18px" : "25px"}
      >
        {activeBalls}/{MAX_ACTIVE_BALLS}
      </Typography>
    </div>
  )
}
