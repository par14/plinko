import { Box } from "@mui/material"
import { DataGrid } from "@mui/x-data-grid"
import { Balance } from "@pages/Plinko/components/Balance"
import {
  betColumn,
  payoutColumn,
  timeColumn,
  winColumn,
} from "@pages/Plinko/components/History/index.constants"
import { WinBar } from "@pages/Plinko/components/WinBar"
import { selectHistoryItems } from "@store/history/history.selectors"
import { useAppSelector } from "@store/hooks/store.hooks"
import { useMediaQuery } from "usehooks-ts"

import styles from "./index.module.css"

export function History() {
  const matches = useMediaQuery("(max-width: 600px)")
  const history = useAppSelector(selectHistoryItems)

  return (
    <div className={styles.historyWrapper}>
      <Box
        sx={{
          height: 500,
          maxWidth: matches ? 390 : 600,
          background: "rgba(53, 47, 68, 50%)",
          borderRadius: "10px",
        }}
      >
        <DataGrid
          initialState={{
            sorting: {
              sortModel: [{ field: "time", sort: "desc" }],
            },
          }}
          rows={history}
          columns={[
            {
              ...timeColumn,
              minWidth: matches ? 80 : 150,
            },
            {
              ...betColumn,
              minWidth: matches ? 80 : 150,
            },
            {
              ...payoutColumn,
              minWidth: matches ? 80 : 150,
            },
            {
              ...winColumn,
              minWidth: matches ? 80 : 150,
            },
          ]}
          hideFooter={true}
          sx={{
            border: "none",
            color: "white",
            fontSize: "20px",
            "&.MuiDataGrid-root .MuiDataGrid-cell:focus-within": {
              outline: "none !important",
            },
            "&.MuiDataGrid-root .MuiDataGrid-cell": {
              color: "#e4f1fe",
              fontWeight: 500,
              border: "none",
            },
            "&.MuiDataGrid-root .MuiDataGrid-row": {
              border: "none",
            },
          }}
          disableColumnMenu={true}
          disableRowSelectionOnClick
        />
      </Box>
      <Balance />
      <WinBar />
    </div>
  )
}
