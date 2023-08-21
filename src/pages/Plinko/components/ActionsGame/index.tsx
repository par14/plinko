import { Button, TextField, Typography } from "@mui/material"
import { ACTIONS_OPTIONS } from "@pages/Plinko/components/Game/config"
import { ActionOption } from "@pages/Plinko/components/Game/interfaces"
import { selectBalance, selectCurrentUserId } from "@store/auth/auth.selectors"
import { roundNumber } from "@store/auth/auth.utils"
import { selectActiveBalls, selectBet } from "@store/config/config.selectors"
import { setBet } from "@store/config/config.slice"
import { useAppDispatch, useAppSelector } from "@store/hooks/store.hooks"
import type { ChangeEvent } from "react"
import { NumericFormat } from "react-number-format"

import styles from "./index.module.css"

export function ActionsGame() {
  const currentBalance = useAppSelector(selectBalance)
  const userId = useAppSelector(selectCurrentUserId)
  const activeBalls = useAppSelector(selectActiveBalls)
  const betValue = useAppSelector(selectBet)
  const dispatch = useAppDispatch()

  function handleChangeBetValue(e: ChangeEvent<HTMLInputElement>) {
    if (!userId) return

    e.preventDefault()
    const value = +e.target.value
    const newBetValue = value >= currentBalance ? currentBalance : value
    dispatch(setBet({ bet: roundNumber(newBetValue) }))
  }

  function changeBetViaAction(action: ActionOption) {
    if (!userId) return

    let value = 0

    if (action.label === "max") {
      value = currentBalance
    } else if (action.label === "min") {
      value = 1
    } else {
      value = roundNumber(betValue * action.value)
    }

    if (value >= currentBalance) {
      dispatch(setBet({ bet: currentBalance }))

      return
    }

    const newBetValue = value <= 0 ? 0 : roundNumber(value)
    dispatch(setBet({ bet: newBetValue }))
  }

  return (
    <div className={styles.actionsWrapper}>
      <div className={styles.betWrapper}>
        <Typography
          color="white"
          fontWeight="600"
          fontSize="20px"
          marginRight="8px"
        >
          Current Bet:
        </Typography>
        <Typography color="white" fontWeight="600" fontSize="20px">
          {betValue}
        </Typography>
      </div>
      <div className={styles.inputBetWrapper}>
        <NumericFormat
          InputProps={{
            sx: {
              color: "#e7eaf6",
              fontWeight: 600,
              height: "50px",
              fontSize: "20px",
              backgroundColor: "#132743",
            },
          }}
          value={betValue}
          min={1}
          max={currentBalance}
          onChange={handleChangeBetValue}
          customInput={TextField}
          variant="outlined"
          disabled={activeBalls > 0}
        />
        {ACTIONS_OPTIONS.map((action, i) => (
          <Button
            aria-label="choose active for bet"
            sx={{
              padding: "2px",
              marginLeft: "4px",
              fontSize: "14px",
              color: "white",
              fontWeight: 600,
              backgroundColor: "#132743",
              ":hover": { backgroundColor: "#5c5470" },
              ":disabled": { color: "rgba(0, 0, 0, 0.5)" },
            }}
            key={i}
            disabled={activeBalls > 0}
            type="button"
            onClick={() => changeBetViaAction(action)}
          >
            {action.label}
          </Button>
        ))}
      </div>
    </div>
  )
}
