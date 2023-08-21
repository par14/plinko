import type { Config, RiskModes } from "./config.interface";
import type { LinesType } from "@pages/Plinko/components/Game/interfaces";

export const initialState: Config = {
  bet: Number(localStorage.getItem("bet")) || 1,
  linesCount: (Number(localStorage.getItem("linesCount")) || 8) as LinesType,
  riskMode: (localStorage.getItem("riskMode") || "low") as RiskModes,
  lastWin: 0,
  activeBalls: 0
};

export const emptyConfig: Config = {
  linesCount: 8,
  bet: 1,
  lastWin: 0,
  activeBalls: 0,
  riskMode: "low"
};
