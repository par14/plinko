import type { HolesForLines } from "@pages/Plinko/components/Game/interfaces";
import {
  holesFor10Lines,
  holesFor11Lines,
  holesFor12Lines,
  holesFor13Lines,
  holesFor14Lines,
  holesFor15Lines,
  holesFor16Lines,
  holesFor8Lines,
  holesFor9Lines
} from "@pages/Plinko/components/Game/constants/holesForLines";

export const holes: {
  [key: number]: HolesForLines
} = {
  8: holesFor8Lines,
  9: holesFor9Lines,
  10: holesFor10Lines,
  11: holesFor11Lines,
  12: holesFor12Lines,
  13: holesFor13Lines,
  14: holesFor14Lines,
  15: holesFor15Lines,
  16: holesFor16Lines
};
