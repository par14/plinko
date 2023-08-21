import {
  ACTIVE_AREA_HEIGHT,
  INITIAL_SIZES_FOR_8_LINES,
} from "@pages/Plinko/components/Game/config"
import type {
  LinesType,
  SizeConfig,
} from "@pages/Plinko/components/Game/interfaces"

export const getRateForLine = (line: LinesType): SizeConfig => {
  const { pinGap, pinSize, ballSize } = INITIAL_SIZES_FOR_8_LINES
  const widthBetweenLine = ACTIVE_AREA_HEIGHT / (line + 1)
  const rate = pinGap / widthBetweenLine

  return {
    pinGap: pinGap / rate,
    pinSize: pinSize / rate,
    ballSize: ballSize / rate,
  }
}
