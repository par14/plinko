// @vitest-environment node
import { describe, expect, it } from 'vitest';
import {
  bucketIndexAtX,
  createBoardGeometry,
  gapAfterDirection,
  verticalFovForWidth,
} from './board-geometry';

describe('board geometry', () => {
  it('builds the triangular pin field and rows + 1 buckets', () => {
    for (let rows = 8; rows <= 16; rows++) {
      const geometry = createBoardGeometry(rows);
      expect(geometry.pegs).toHaveLength((rows * (rows + 1)) / 2);
      expect(geometry.bucketCenters).toHaveLength(rows + 1);
      expect(geometry.bucketDividers).toHaveLength(rows + 2);
    }
  });

  it('maps a complete L/R path to its final bucket centre', () => {
    const geometry = createBoardGeometry(8);
    const path = ['R', 'L', 'R', 'R', 'L', 'L', 'R', 'L'] as const;
    let rights = 0;
    path.forEach((direction, row) => {
      if (direction === 'R') rights++;
      expect(gapAfterDirection(geometry, row, rights)).toBe(
        (rights - (row + 1) / 2) * geometry.cell,
      );
    });
    expect(gapAfterDirection(geometry, path.length - 1, rights)).toBe(
      geometry.bucketCenters[rights],
    );
  });

  it('projects the outer bucket dividers onto the horizontal canvas edges', () => {
    const geometry = createBoardGeometry(16);
    const distance = 14.45;

    for (const aspect of [0.75, 1, 1.5]) {
      const fov = verticalFovForWidth(geometry.width, distance, aspect);
      const horizontalHalfView = Math.tan((fov * Math.PI) / 360) * distance * aspect;

      expect(horizontalHalfView).toBeCloseTo(geometry.width / 2, 10);
      expect(geometry.bucketDividers[0] / horizontalHalfView).toBeCloseTo(-1, 10);
      expect(geometry.bucketDividers.at(-1)! / horizontalHalfView).toBeCloseTo(1, 10);
    }
  });

  it('resolves every physical bucket centre back to the same visual bucket', () => {
    for (let rows = 8; rows <= 16; rows++) {
      const geometry = createBoardGeometry(rows);
      geometry.bucketCenters.forEach((center, bucket) => {
        expect(bucketIndexAtX(geometry, center)).toBe(bucket);
        expect(bucketIndexAtX(geometry, center - geometry.cell * 0.49)).toBe(bucket);
        expect(bucketIndexAtX(geometry, center + geometry.cell * 0.49)).toBe(bucket);
      });
    }
  });
});
