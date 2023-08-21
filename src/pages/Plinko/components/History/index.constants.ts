import type {
  GridCellParams,
  GridColDef,
  GridValueGetterParams,
} from "@mui/x-data-grid"

import styles from "./index.module.css"

export const columns: GridColDef[] = [
  {
    field: "time",
    headerName: "Time",
    width: 130,
    align: "center",
    headerAlign: "center",
  },
  {
    field: "bet",
    headerName: "Bet",
    width: 150,
    align: "center",
    headerAlign: "center",
    valueGetter: (params: GridValueGetterParams) => `${params.row.bet}`,
  },
  {
    field: "payout",
    headerName: "Payout",
    width: 130,
    align: "center",
    headerAlign: "center",
    valueGetter: (params: GridValueGetterParams) => `${params.row.payout}×`,
  },
  {
    field: "win",
    headerName: "Profit",
    width: 150,
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
  },
]
