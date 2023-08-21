import { Button, Tooltip } from "@mui/material"
import { MAX_ACTIVE_BALLS } from "@pages/Plinko/components/Game/config"
import { selectBalance, selectCurrentUserId } from "@store/auth/auth.selectors"
import { decrementBalance } from "@store/auth/auth.slice"
import { selectActiveBalls, selectBet } from "@store/config/config.selectors"
import { setBet } from "@store/config/config.slice"
import { useAppDispatch, useAppSelector } from "@store/hooks/store.hooks"

interface PlayProps {
  run: (betValue: number) => void
}

export function PlayAction({ run }: PlayProps) {
  const bet = useAppSelector(selectBet)
  const activeBalls = useAppSelector(selectActiveBalls)
  const userId = useAppSelector(selectCurrentUserId)
  const balance = useAppSelector(selectBalance)
  const dispatch = useAppDispatch()

  function onRun() {
    if (!userId || activeBalls >= MAX_ACTIVE_BALLS) {
      return
    }

    if (bet > balance) {
      dispatch(setBet({ bet: balance }))

      return
    }

    run(bet)

    if (bet <= 0) return
    dispatch(decrementBalance(bet))
  }

  return (
    <Tooltip title={bet === 0 ? "Please type bet higher than 0" : ""}>
      <span>
        <Button
          type="button"
          disableFocusRipple
          aria-label="Play"
          onClick={onRun}
          disabled={bet === 0}
          variant="outlined"
          sx={{
            fontSize: "25px",
            marginTop: "1rem",
            borderRadius: "10px",
            width: "150px",
            backgroundColor: "#faf5e4",
            color: "#283739",
            fontWeight: 700,
            border: 0,
            ":hover": {
              backgroundColor: "#283739",
              border: 0,
              color: "#fdffab",
            },
            ":disabled": { color: "rgba(0, 0, 0, 0.4)" },
          }}
        >
          Play
        </Button>
      </span>
    </Tooltip>
  )
}
