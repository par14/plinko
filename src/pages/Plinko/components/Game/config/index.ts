import type {
  ActionOptions,
  LinesType,
  SizeConfig,
} from "@pages/Plinko/components/Game/interfaces"
import type { RiskModes } from "@store/config/config.interface"

// TODO this values better to calculate but not now, need more time
export const INITIAL_SIZES_FOR_8_LINES: SizeConfig = {
  pinSize: 4.5,
  pinGap: 45,
  ballSize: 13.4,
  distanceFromTop: 60,
  canvasSize: 500,
  activePlinkoHeight: 45 * 9, // where 45 current gap and 9 - 8 min lines + 1 more gap
}

export const INITIAL_MOBILE_SIZES_FOR_8_LINES: SizeConfig = {
  pinSize: 2.7,
  pinGap: 27,
  ballSize: 8.04,
  distanceFromTop: 36,
  canvasSize: 300,
  activePlinkoHeight: 27 * 9, // where 45 current gap and 9 - 8 min lines + 1 more gap
}

export const MAX_ACTIVE_BALLS = 20
export const START_PINS = 3

export const canvasColors = {
  background: "transparent",
  ballActive: "#f4acb7",
  ballInactive: "#445069",
}

export const LINE_OPTIONS: LinesType[] = [8, 9, 10, 11, 12, 13, 14, 15, 16]
export const MODE_OPTIONS: RiskModes[] = ["high", "normal", "low"]

export const ACTIONS_OPTIONS: ActionOptions = [
  {
    label: "min",
    value: 1,
  },
  {
    label: "0.25",
    value: 0.25,
  },
  {
    label: "0.5",
    value: 0.5,
  },
  {
    label: "0.75",
    value: 0.75,
  },
  {
    label: "2×",
    value: 2,
  },
  {
    label: "max",
    value: 1,
  },
]
