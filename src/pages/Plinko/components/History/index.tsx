import { DataGrid } from "@mui/x-data-grid";
import { Box } from "@mui/material";
import { selectHistoryItems } from "@store/history/history.selectors";
import { useAppSelector } from "@store/hooks/store.hooks";
import { Balance } from "@pages/Plinko/components/Balance";
import { columns } from "./index.constants";
import styles from "./index.module.css";
import { WinBar } from "@pages/Plinko/components/WinBar";

export function History() {
  const history = useAppSelector(selectHistoryItems);

  return (
    <div className={styles.historyWrapper}>
      <Box sx={{
        height: 500,
        maxWidth: 600,
        background: "rgba(53, 47, 68, 50%)",
        borderRadius: "10px"
      }}>
        <DataGrid
          initialState={{
            sorting: {
              sortModel: [{ field: 'time', sort: 'desc' }],
            },
          }}
          rows={history}
          columns={columns}
          hideFooter={true}
          sx={{
            border: "none",
            color: "white",
            fontSize: "20px",
            "&.MuiDataGrid-root .MuiDataGrid-cell:focus-within": {
              outline: "none !important"
            },
            "&.MuiDataGrid-root .MuiDataGrid-cell": {
              color: "#e4f1fe",
              fontWeight: 500,
              border: "none"
            },
            "&.MuiDataGrid-root .MuiDataGrid-row": {
              border: "none"
            }
          }}
          disableColumnMenu={true}
          disableRowSelectionOnClick
        />
      </Box>
      <Balance />
      <WinBar />
    </div>
  );
}
