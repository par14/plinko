import { Tooltip } from "@mui/material"
import {
  INITIAL_MOBILE_SIZES_FOR_8_LINES,
  INITIAL_SIZES_FOR_8_LINES,
} from "@pages/Plinko/components/Game/config"
import type { SizeConfig } from "@pages/Plinko/components/Game/interfaces"
import { getHolesByLine } from "@pages/Plinko/components/Game/utils/getHoles"
import { roundNumber } from "@store/auth/auth.utils"
import {
  selectBet,
  selectLinesCount,
  selectRiskMode,
} from "@store/config/config.selectors"
import { selectStatisticItems } from "@store/history/history.selectors"
import { useAppSelector } from "@store/hooks/store.hooks"
import { useEffect, useState } from "react"
import { useMediaQuery } from "usehooks-ts"

import styles from "./index.module.css"

export function HolesHtml(props: { config: SizeConfig }) {
  const matches = useMediaQuery("(max-width: 535px)")
  const linesCount = useAppSelector(selectLinesCount)
  const riskMode = useAppSelector(selectRiskMode)
  const betValue = useAppSelector(selectBet)
  const statisticItems = useAppSelector(selectStatisticItems)
  const [configSizes, setConfigSizes] = useState(
    matches ? INITIAL_MOBILE_SIZES_FOR_8_LINES : INITIAL_SIZES_FOR_8_LINES,
  )

  const holes = getHolesByLine(linesCount, riskMode)
  const firstHolePositionX: number =
    configSizes.canvasSize / 2 -
    (props.config.pinGap / 2) * linesCount -
    props.config.pinGap
  const blockSize = props.config.pinGap - props.config.pinSize * 2
  const leftPosition = firstHolePositionX + blockSize * 0.7
  const topPosition =
    configSizes.activePlinkoHeight +
    configSizes.distanceFromTop -
    blockSize / 1.7

  useEffect(() => {
    setConfigSizes(
      matches ? INITIAL_MOBILE_SIZES_FOR_8_LINES : INITIAL_SIZES_FOR_8_LINES,
    )
  }, [matches])

  return (
    <div
      className={`${styles.holesWrapper}`}
      style={{ left: `${leftPosition}px`, top: `${topPosition}px` }}
    >
      {holes.map((value, i) => {
        const winValue = roundNumber(Math.abs(betValue * value.id - betValue))

        return (
          <Tooltip
            title={`Count: ${
              statisticItems?.[value.id] ? statisticItems[value.id] : "N/A"
            } WIN: ${winValue}`}
            key={i}
          >
            <div
              className={`${styles.holeHtml}  hole-${value.id}`}
              style={{
                width: `${blockSize * 1.1}px`,
                height: `${blockSize * 1.1}px`,
                fontSize: `${blockSize / 2.5}px`,
                backgroundColor: `${value.color}`,
                marginRight: `${props.config.pinSize * 1.2}px`,
              }}
            >
              {value.id}
            </div>
          </Tooltip>
        )
      })}
    </div>
  )
}
