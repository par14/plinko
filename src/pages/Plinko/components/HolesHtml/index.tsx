import { useAppSelector } from "@store/hooks/store.hooks";
import { selectBet, selectLinesCount, selectRiskMode } from "@store/config/config.selectors";
import { ACTIVE_AREA_HEIGHT, DISTANCE_FROM_TOP_FLOOR, MAX_WORLD_WIDTH } from "@pages/Plinko/components/Game/config";
import styles from "./index.module.css";
import type { SizeConfig } from "@pages/Plinko/components/Game/interfaces";
import { getHolesByLine } from "@pages/Plinko/components/Game/utils/getHoles";
import { Tooltip } from "@mui/material";
import { roundNumber } from "@store/auth/auth.utils";
import { selectStatisticItems } from "@store/history/history.selectors";

export function HolesHtml(props: { config: SizeConfig }) {
  const linesCount = useAppSelector(selectLinesCount);
  const riskMode = useAppSelector(selectRiskMode);
  const betValue = useAppSelector(selectBet);
  const statisticItems = useAppSelector(selectStatisticItems);

  const holes = getHolesByLine(linesCount, riskMode);
  const firstHolePositionX: number = MAX_WORLD_WIDTH / 2 - (props.config.pinGap / 2) * linesCount - props.config.pinGap;
  const blockSize = props.config.pinGap - props.config.pinSize * 2;
  const leftPosition = firstHolePositionX + blockSize * 0.7;
  const topPosition = ACTIVE_AREA_HEIGHT + DISTANCE_FROM_TOP_FLOOR - blockSize / 1.7;

  return (
    <div className={`${styles.linesWrapper}`} style={{ left: `${leftPosition}px`, top: `${topPosition}px` }}>
      {
        holes.map((value, i) => {
            const winValue = roundNumber(Math.abs(betValue * value.id - betValue));

            return (
              <Tooltip
                title={`Count: ${statisticItems && statisticItems[value.id] ? statisticItems[value.id] : "N/A"} WIN: ${winValue}`}
                key={i}>
                <div className={`${styles.holeHtml}  hole-${value}`}
                     style={{
                       width: `${blockSize * 1.1}px`,
                       height: `${blockSize * 1.1}px`,
                       fontSize: `${blockSize / 2.5}px`,
                       backgroundColor: `${value.color}`,
                       marginRight: `${props.config.pinSize * 1.2}px`
                     }}
                >
                  {value.id}
                </div>
              </Tooltip>
            );
          }
        )
      }
    </div>
  );
}
