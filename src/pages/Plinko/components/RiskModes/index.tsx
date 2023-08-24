import BrightnessMediumIcon from "@mui/icons-material/BrightnessMedium"
import IcecreamIcon from "@mui/icons-material/Icecream"
import WhatshotIcon from "@mui/icons-material/Whatshot"
import { Button, Typography } from "@mui/material"
import { MODE_OPTIONS } from "@pages/Plinko/components/Game/config"
import { selectCurrentUserId } from "@store/auth/auth.selectors"
import type { RiskModes } from "@store/config/config.interface"
import {
  selectActiveBalls,
  selectRiskMode,
} from "@store/config/config.selectors"
import { setRiskMode } from "@store/config/config.slice"
import { clearStatistics } from "@store/history/history.slice"
import { useAppDispatch, useAppSelector } from "@store/hooks/store.hooks"
import { useMediaQuery } from "usehooks-ts"

import styles from "./index.module.css"

export function RiskModesWrapper() {
  const matches = useMediaQuery("(max-width: 535px)")
  const riskMode = useAppSelector(selectRiskMode)
  const activeBalls = useAppSelector(selectActiveBalls)
  const userId = useAppSelector(selectCurrentUserId)
  const dispatch = useAppDispatch()

  function handleChangeRiskMode(mode: RiskModes) {
    if (!userId) return

    dispatch(setRiskMode({ riskMode: mode }))
    dispatch(clearStatistics())
  }

  return (
    <div className={styles.riskModeWrapper}>
      <Typography
        color="#ffc93c"
        fontSize={matches ? "12px" : "16px"}
        fontWeight="bold"
      >
        Risk Level
      </Typography>
      <div className={styles.riskModeGroup}>
        {MODE_OPTIONS.map((mode, i) => (
          <Button
            aria-label="choose risk mode"
            sx={{
              minWidth: matches ? "30px" : "60px",
              padding: "4px",
              paddingLeft: matches ? "0.5rem" : "1rem",
              paddingRight: matches ? "0.5rem" : "1rem",
              fontSize: matches ? "12px" : "18px",
              color: "white",
              fontWeight: 600,
              backgroundColor: riskMode === mode ? "#9fd3c7" : "",
              ":hover": { backgroundColor: "#5c5470" },
              ":disabled": { color: "rgba(0, 0, 0, 0.5)" },
            }}
            key={i}
            startIcon={
              mode === "high" ? (
                <WhatshotIcon />
              ) : mode === "normal" ? (
                <BrightnessMediumIcon />
              ) : (
                <IcecreamIcon />
              )
            }
            disabled={riskMode === mode || activeBalls > 0}
            type="button"
            onClick={() => handleChangeRiskMode(mode)}
          >
            {mode}
          </Button>
        ))}
      </div>
    </div>
  )
}
