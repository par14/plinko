export interface BoardPoint {
  x: number;
  y: number;
}

export interface BoardGeometry {
  rows: number;
  width: number;
  height: number;
  cell: number;
  ballRadius: number;
  pegRadius: number;
  floorY: number;
  rowY: number[];
  pegs: Array<BoardPoint & { row: number }>;
  bucketCenters: number[];
  bucketDividers: number[];
  leftWall: [BoardPoint, BoardPoint];
  rightWall: [BoardPoint, BoardPoint];
}

const BOARD_WIDTH = 10;
const BOARD_HEIGHT = 10;

export function createBoardGeometry(rows: number): BoardGeometry {
  const cell = BOARD_WIDTH / (rows + 1);
  const topY = 4.15;
  const lastRowY = -3.05;
  const floorY = -4.55;
  const gap = (topY - lastRowY) / Math.max(1, rows - 1);
  const rowY = Array.from({ length: rows }, (_, row) => topY - row * gap);
  const pegs = rowY.flatMap((y, row) =>
    Array.from({ length: row + 1 }, (_, slot) => ({
      x: (slot - row / 2) * cell,
      y,
      row,
    })),
  );
  const bucketCenters = Array.from({ length: rows + 1 }, (_, bucket) => (bucket - rows / 2) * cell);
  const bucketDividers = Array.from(
    { length: rows + 2 },
    (_, divider) => (divider - (rows + 1) / 2) * cell,
  );
  return {
    rows,
    width: BOARD_WIDTH,
    height: BOARD_HEIGHT,
    cell,
    ballRadius: cell * 0.3,
    pegRadius: cell * 0.12,
    floorY,
    rowY,
    pegs,
    bucketCenters,
    bucketDividers,
    leftWall: [
      { x: -cell, y: topY + cell },
      { x: bucketDividers[0], y: floorY + 0.45 },
    ],
    rightWall: [
      { x: cell, y: topY + cell },
      { x: bucketDividers.at(-1) ?? BOARD_WIDTH / 2, y: floorY + 0.45 },
    ],
  };
}

export function gapAfterDirection(geometry: BoardGeometry, row: number, rights: number): number {
  return (rights - (row + 1) / 2) * geometry.cell;
}

/** Resolves a world-space landing position to the matching visual bucket. */
export function bucketIndexAtX(geometry: BoardGeometry, x: number): number {
  const firstCenter = geometry.bucketCenters[0];
  const index = Math.round((x - firstCenter) / geometry.cell);
  return Math.max(0, Math.min(geometry.bucketCenters.length - 1, index));
}

/**
 * Keeps the projected outer bucket dividers on the canvas edges. The payout
 * grid below the canvas uses the same full width, so a ball and its highlighted
 * bucket stay horizontally aligned at every responsive size.
 */
export function verticalFovForWidth(
  visibleWidth: number,
  cameraDistance: number,
  aspect: number,
): number {
  const halfVerticalView = visibleWidth / (2 * cameraDistance * aspect);
  return (2 * Math.atan(halfVerticalView) * 180) / Math.PI;
}
