export type LinesType = 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15 | 16

export interface HoleEntity {
  id: number,
  color: string,
  sound: string,
}

export interface ActionOption {
  label: string,
  value: number
}

export type ActionOptions = ActionOption[]

export interface SizeConfig {
  pinSize: number,
  pinGap: number,
  ballSize: number
}

export type HoleEntities = HoleEntity[]

export type HolesForLines = { [key: string]: HoleEntities }
