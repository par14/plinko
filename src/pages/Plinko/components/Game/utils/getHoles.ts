import { holes } from "@pages/Plinko/components/Game/constants/holes";
import type { RiskModes } from "@store/config/config.interface";
import type { HoleEntities, LinesType } from "@pages/Plinko/components/Game/interfaces";

export function getHolesByLine(value: LinesType, mode: RiskModes): HoleEntities {
  return holes[value][mode];
}

export function getHoleSound(value: LinesType, mode: RiskModes, concreteValue: number): string {
  const holeEntities = holes[value][mode] as HoleEntities;

  return holeEntities.find(item => item.id === concreteValue)?.sound || "";
}
