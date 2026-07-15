import type { Direction } from '../../../core/fairness/outcome';

/** Target horizontal velocity for one post-contact impulse. */
export function pegBounceVelocity(
  direction: Direction,
  targetX: number,
  currentX: number,
  currentVelocity: number,
  missedContact: boolean,
): number {
  const error = targetX - currentX;
  const sign = Math.sign(error) || (direction === 'R' ? 1 : -1);
  const gain = missedContact ? 5.4 : 4.2;
  const minimumKick = missedContact ? 1.35 : 0.9;
  const correction = Math.abs(error * gain - currentVelocity * 0.12);
  return sign * Math.max(minimumKick, Math.min(3.2, correction));
}

/**
 * A restrained final-peg bounce. It aims through the selected opening without
 * any continuous force or kinematic movement below the pin field.
 */
export function finalGapVelocity(
  direction: Direction,
  targetX: number,
  currentX: number,
  currentVelocity: number,
): number {
  const error = targetX - currentX;
  const sign = Math.sign(error) || (direction === 'R' ? 1 : -1);
  const correction = error * 2.1 - currentVelocity * 0.28;
  return sign * Math.max(0.45, Math.min(1.45, Math.abs(correction)));
}

/** A small physical release used only when a ball balances on a divider. */
export function dividerReleaseVelocity(targetX: number, currentX: number): number {
  const error = targetX - currentX;
  const sign = Math.sign(error) || 1;
  return sign * Math.max(0.35, Math.min(0.7, Math.abs(error) * 0.8));
}
