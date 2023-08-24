import type {
  LinesType,
  SizeConfig,
} from "@pages/Plinko/components/Game/interfaces"

export const getRateForLine = (
  config: SizeConfig,
  line: LinesType,
): SizeConfig => {
  const widthBetweenLine = config.activePlinkoHeight / (line + 1)
  const rate = config.pinGap / widthBetweenLine

  return {
    ...config,
    pinGap: config.pinGap / rate,
    pinSize: config.pinSize / rate,
    ballSize: config.ballSize / rate,
  }
}
