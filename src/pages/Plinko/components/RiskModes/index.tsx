import { Button, Typography } from "@mui/material";
import { useAppDispatch, useAppSelector } from "@store/hooks/store.hooks";
import { setRiskMode } from "@store/config/config.slice";
import { selectActiveBalls, selectRiskMode } from "@store/config/config.selectors";
import { selectCurrentUserId } from "@store/auth/auth.selectors";
import type { RiskModes } from "@store/config/config.interface";
import { MODE_OPTIONS } from "@pages/Plinko/components/Game/config";
import { clearStatistics } from "@store/history/history.slice";
import WhatshotIcon from "@mui/icons-material/Whatshot";
import IcecreamIcon from "@mui/icons-material/Icecream";
import BrightnessMediumIcon from "@mui/icons-material/BrightnessMedium";
import styles from "./index.module.css";

export function RiskModes() {
  const riskMode = useAppSelector(selectRiskMode);
  const activeBalls = useAppSelector(selectActiveBalls);
  const userId = useAppSelector(selectCurrentUserId);
  const dispatch = useAppDispatch();

  function handleChangeRiskMode(mode: RiskModes) {
    if (!userId) return;

    dispatch(setRiskMode({ riskMode: mode }));
    dispatch(clearStatistics());
  }

  return (
    <div className={styles.riskModeWrapper}>
      <Typography color="#ffc93c" fontSize="16px" fontWeight="bold">
        Risk Level
      </Typography>
      <div className={styles.riskModeGroup}>
        {
          MODE_OPTIONS.map((mode, i) =>
            <Button aria-label="choose risk mode"
                    sx={{
                      minWidth: "60px",
                      padding: "4px",
                      paddingLeft: "1rem",
                      paddingRight: "1rem",
                      fontSize: "18px",
                      color: "white",
                      fontWeight: 600,
                      backgroundColor: riskMode === mode ? "#9fd3c7" : "",
                      ":hover": { backgroundColor: "#5c5470" },
                      ":disabled": { color: "rgba(0, 0, 0, 0.5)" }
                    }}
                    key={i}
                    startIcon={mode === "high" ? <WhatshotIcon /> :
                      (mode === "normal" ? <BrightnessMediumIcon /> : <IcecreamIcon />)}
                    disabled={riskMode === mode || activeBalls > 0}
                    type="button"
                    onClick={() => handleChangeRiskMode(mode)}
            >
              {mode}
            </Button>
          )
        }
      </div>
    </div>
  );
}
