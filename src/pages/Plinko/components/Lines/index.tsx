import { Button, Typography } from "@mui/material"
import { LINE_OPTIONS } from "@pages/Plinko/components/Game/config"
import { LinesType } from "@pages/Plinko/components/Game/interfaces"
import { selectCurrentUserId } from "@store/auth/auth.selectors"
import {
  selectActiveBalls,
  selectLinesCount,
} from "@store/config/config.selectors"
import { setLinesCount } from "@store/config/config.slice"
import { clearStatistics } from "@store/history/history.slice"
import { useAppDispatch, useAppSelector } from "@store/hooks/store.hooks"

import styles from "./index.module.css"

export function Lines() {
  const linesCount = useAppSelector(selectLinesCount)
  const activeBalls = useAppSelector(selectActiveBalls)
  const userId = useAppSelector(selectCurrentUserId)
  const dispatch = useAppDispatch()

  function handleChangeLine(line: LinesType) {
    if (!userId) return

    dispatch(setLinesCount({ linesCount: line }))
    dispatch(clearStatistics())
  }

  return (
    <div className={styles.linesWrapper}>
      <Typography color="#ffc93c" fontSize="16px" fontWeight="bold">
        Lines
      </Typography>
      <div className={styles.linesGroup}>
        {LINE_OPTIONS.map((line, i) => (
          <Button
            aria-label="choose line"
            sx={{
              minWidth: "60px",
              padding: 0,
              fontSize: "18px",
              color: "white",
              fontWeight: 600,
              backgroundColor: linesCount === line ? "#9fd3c7" : "",
              ":hover": { backgroundColor: "#5c5470" },
              ":disabled": { color: "rgba(0, 0, 0, 0.4)" },
            }}
            key={i}
            disabled={linesCount === line || activeBalls > 0}
            type="button"
            onClick={() => handleChangeLine(line)}
          >
            {line}
          </Button>
        ))}
      </div>
    </div>
  )
}
