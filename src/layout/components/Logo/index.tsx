import logo from "@images/logo.svg"

import styles from "./index.module.css"

export function Logo() {
  return (
    <div className={styles.logoWrapper}>
      <img src={logo} alt="logo" aria-label="logo" className={styles.logoImg} />
    </div>
  )
}
