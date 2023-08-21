import { Button, TextField } from "@mui/material"
import { selectCurrentUserId } from "@store/auth/auth.selectors"
import { setBalance, signIn } from "@store/auth/auth.slice"
import { useAppDispatch, useAppSelector } from "@store/hooks/store.hooks"
import type { ChangeEvent } from "react"
import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"

import styles from "./index.module.css"

export function LoginPage() {
  const navigate = useNavigate()
  const dispatch = useAppDispatch()
  const userId = useAppSelector(selectCurrentUserId)

  const [name, setName] = useState("")
  const [amount, setAmount] = useState("")

  useEffect(() => {
    if (userId) {
      navigate("/plinko")
    }
  }, [userId])

  const onChangeName = (e: ChangeEvent<HTMLInputElement>) => {
    setName(e.target.value.trim())
  }

  const onChangeAmount = (e: ChangeEvent<HTMLInputElement>) => {
    setAmount(e.target.value)
  }

  const onSubmitName = () => {
    dispatch(signIn({ name }))
    dispatch(setBalance(amount))
  }

  return (
    <div className={styles.login}>
      <div className={styles.form}>
        <TextField
          required
          type="text"
          id="required"
          value={name}
          onChange={onChangeName}
          label="Name"
        />
        <TextField
          required
          type="number"
          id="required"
          InputProps={{ inputProps: { min: 1, max: 10000000 } }}
          value={amount}
          onChange={onChangeAmount}
          label="Balance"
        />
        <Button
          type="submit"
          onClick={onSubmitName}
          variant="outlined"
          disabled={name === "" || +amount <= 0}
        >
          Let&apos;s go
        </Button>
      </div>
    </div>
  )
}
