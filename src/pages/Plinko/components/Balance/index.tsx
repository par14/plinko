import { Typography } from "@mui/material";
import { useAppSelector } from "@store/hooks/store.hooks";
import { selectBalance } from "@store/auth/auth.selectors";
import { convertMoney } from "@utils/convertMoney";
import styles from "./index.module.css";

export function Balance() {
  const currentBalance = useAppSelector(selectBalance);

  return (
    <div className={styles.walletContainer}>
      <Typography color="#ffc93c" fontSize="30px" fontWeight="600">
        BALANCE
      </Typography>
      <Typography color="#ffc93c" fontSize="30px" fontWeight="600">
        {convertMoney(currentBalance)}
      </Typography>
    </div>
  );
}
