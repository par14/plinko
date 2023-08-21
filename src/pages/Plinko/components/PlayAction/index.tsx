import { Button } from "@mui/material";
import { useAppDispatch, useAppSelector } from "@store/hooks/store.hooks";
import { setBet } from "@store/config/config.slice";
import { selectActiveBalls, selectBet } from "@store/config/config.selectors";
import { selectBalance, selectCurrentUserId } from "@store/auth/auth.selectors";
import { decrementBalance } from "@store/auth/auth.slice";
import { MAX_ACTIVE_BALLS } from "@pages/Plinko/components/Game/config";

interface PlayProps {
  run: (betValue: number) => void;
}

export function PlayAction({ run }: PlayProps) {
  const bet = useAppSelector(selectBet);
  const activeBalls = useAppSelector(selectActiveBalls);
  const userId = useAppSelector(selectCurrentUserId);
  const balance = useAppSelector(selectBalance);
  const dispatch = useAppDispatch();

  function onRun() {
    if (!userId || activeBalls >= MAX_ACTIVE_BALLS) {
      return;
    }

    if (bet > balance) {
      dispatch(setBet({ bet: balance }));

      return;
    }

    run(bet);

    if (bet <= 0) return;
    dispatch(decrementBalance(bet));
  }

  return (
    <Button type="button"
            disableFocusRipple
            aria-label="Play"
            onClick={onRun}
            variant="outlined"
            sx={{
              fontSize: "25px",
              borderRadius: "10px",
              width: "150px",
              backgroundColor: "#faf5e4",
              color: "#283739",
              fontWeight: 700,
              border: 0,
              ":hover": { backgroundColor: "#283739", border: 0, color: "#fdffab" },
              ":disabled": { color: "rgba(0, 0, 0, 0.4)" }
            }}>
      Play
    </Button>
  );
}
