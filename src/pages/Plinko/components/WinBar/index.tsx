import { useAppSelector } from "@store/hooks/store.hooks";
import { selectLastWin } from "@store/config/config.selectors";
import { Typography } from "@mui/material";
import styles from "./index.module.css";

export function WinBar() {
  const lastWin = useAppSelector(selectLastWin);

  return (
    <div className={styles.winWrapper}>
      <Typography fontSize="25px" fontWeight="700" color="#142d4c">
        Last Win: {lastWin}
      </Typography>
    </div>
  );
}
