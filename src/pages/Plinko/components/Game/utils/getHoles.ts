import { holes } from "@pages/Plinko/components/Game/constants/holes"
import type {
  HoleEntities,
  LinesType,
} from "@pages/Plinko/components/Game/interfaces"
import type { RiskModes } from "@store/config/config.interface"

export function getHolesByLine(
  value: LinesType,
  mode: RiskModes,
): HoleEntities {
  return holes[value][mode]
}

export function getHoleSound(
  value: LinesType,
  mode: RiskModes,
  concreteValue: number,
): string {
  const holeEntities = holes[value][mode]

  return holeEntities.find((item) => item.id === concreteValue)?.sound ?? ""
}
