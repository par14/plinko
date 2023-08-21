import type { LinesType } from "@pages/Plinko/components/Game/interfaces";

export type RiskModes = "high" | "normal" | "low"

export interface Config {
  bet: number,
  linesCount: LinesType,
  riskMode: RiskModes,
  lastWin: number,
  activeBalls: number
}
