import type {
  GridCellParams,
  GridColDef,
  GridValueGetterParams,
} from "@mui/x-data-grid"

import styles from "./index.module.css"

export const timeColumn: GridColDef = {
  field: "time",
  headerName: "Time",
  maxWidth: 150,
  align: "center",
  headerAlign: "center",
}

export const betColumn: GridColDef = {
  field: "bet",
  headerName: "Bet",
  maxWidth: 150,
  align: "center",
  headerAlign: "center",
  valueGetter: (params: GridValueGetterParams) => `${params.row.bet}`,
}

export const payoutColumn: GridColDef = {
  field: "payout",
  headerName: "Payout",
  maxWidth: 150,
  align: "center",
  headerAlign: "center",
  valueGetter: (params: GridValueGetterParams) => `${params.row.payout}×`,
}

export const winColumn: GridColDef = {
  field: "win",
  headerName: "Profit",
  maxWidth: 150,
  align: "center",
  headerAlign: "center",
  valueGetter: (params: GridValueGetterParams) =>
    params.row.win > 0 ? `+${params.row.win}` : params.row.win,
  cellClassName: (params: GridCellParams<any, number>) => {
    if (params.row.win === null || params.row.win === 0) {
      return ""
    }

    return params.row.win > 0 ? styles.approvedCell : styles.notApprovedCell
  },
}
