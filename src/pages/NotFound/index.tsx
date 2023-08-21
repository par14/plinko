import { Link } from "react-router-dom";
import { Typography } from "@mui/material";
import styles from "./index.module.css";

export function NotFound() {
  return (
    <div className={styles.notFoundWrapper}>
      <Typography fontWeight='700' fontSize='200px' color='#e3f6f5'>
        404
      </Typography>
      <Typography fontWeight='700' fontSize='50px' color='#feffdf'>
        Page not found
      </Typography>
      <Link
        to="/"
        className={styles.link}
      >
        Return to main page
      </Link>
    </div>
  );
}
