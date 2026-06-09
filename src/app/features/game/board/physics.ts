/**
 * A small, dependency-free 2-D rigid-body world for Plinko.
 *
 * The ball falls under gravity and bounces off the pegs, side frame and floor
 * with real collision response (restitution on the normal, friction on the
 * tangent, plus a tiny random surface perturbation). Where it lands is decided
 * entirely by the simulation. All randomness flows through an injected `rng`, so
 * a drop is reproducible for a given seed.
 *
 * Why it forms a centre-weighted bell (like a real Galton board): the pegs of
 * each row sit under the gaps of the row above, so a ball always falls from a
 * gap onto a peg and bounces into one of the two gaps below — an independent
 * ~50/50 step per row. LOW restitution is the crucial bit: the ball loses energy
 * at every peg, so it descends at a roughly constant speed instead of
 * accelerating; constant speed → constant step size → a clean binomial spread
 * (high restitution accelerates the ball and flings it to the edges).
 *
 * Units are logical CSS pixels; velocities px/s, gravity px/s². Everything
 * scales with board size, so the distribution is resolution-independent.
 */

export type Rng = () => number; // [0, 1)

export interface Peg {
  x: number;
  y: number;
}

export interface Tuning {
  gravity: number; // × height → px/s²
  restitution: number; // normal bounce (LOW keeps descent steady)
  friction: number; // tangential velocity removed per peg hit [0..1]
  surfaceJitter: number; // radians — random tilt of the contact normal
  wallRestitution: number;
  floorRestitution: number;
  floorFriction: number;
  ballRatio: number; // × cellW
  pegRatio: number; // × cellW
  spawnSpread: number; // × cellW — random horizontal spawn offset
}

export const DEFAULT_TUNING: Tuning = {
  // High gravity keeps the ball energetic (it never stalls on a peg apex) and the
  // drop weighty-but-brisk (~2.5 s); moderate restitution gives visible bounces;
  // partial friction keeps natural horizontal carry without edge-flinging.
  gravity: 18,
  restitution: 0.6,
  friction: 0.45,
  surfaceJitter: 0.17,
  wallRestitution: 0.4,
  floorRestitution: 0.3,
  floorFriction: 0.6,
  ballRatio: 0.32,
  pegRatio: 0.13,
  spawnSpread: 0.25,
};

export interface World {
  rows: number;
  width: number;
  height: number;
  pegs: Peg[];
  cellW: number;
  ballR: number;
  pegR: number;
  topMargin: number;
  rowGap: number;
  floorY: number;
  tuning: Tuning;
}

export interface Ball {
  x: number;
  y: number;
  vx: number;
  vy: number;
  settled: boolean;
  bucket: number;
  /** Set on the frame a peg is hit, for a cosmetic flash; cleared by the renderer. */
  hitPeg: Peg | null;
  age: number;
}

const TOP_MARGIN_RATIO = 0.08;
const MAX_SUBSTEP = 1 / 240; // s — cap so fast balls don't tunnel through pegs
const MAX_SIM_SECONDS = 10; // hard guard against a stuck ball

export function createWorld(
  rows: number,
  width: number,
  height: number,
  tuning: Tuning = DEFAULT_TUNING,
): World {
  const cellW = width / (rows + 1);
  const topMargin = height * TOP_MARGIN_RATIO;
  const rowGap = (height - topMargin) / rows;
  const ballR = cellW * tuning.ballRatio;
  const pegR = cellW * tuning.pegRatio;

  const pegs: Peg[] = [];
  for (let r = 0; r < rows; r++) {
    const y = topMargin + r * rowGap;
    for (let s = 0; s <= r; s++) {
      pegs.push({ x: width / 2 + (s - r / 2) * cellW, y });
    }
  }

  return { rows, width, height, pegs, cellW, ballR, pegR, topMargin, rowGap, floorY: height - ballR, tuning };
}

export function spawnBall(world: World, rng: Rng): Ball {
  return {
    x: world.width / 2 + (rng() - 0.5) * world.cellW * world.tuning.spawnSpread,
    y: world.topMargin - world.rowGap,
    vx: 0,
    vy: 0,
    settled: false,
    bucket: -1,
    hitPeg: null,
    age: 0,
  };
}

export function bucketOf(world: World, x: number): number {
  return Math.max(0, Math.min(world.rows, Math.floor(x / world.cellW)));
}

/** Advances the ball by one frame (`dt` seconds), sub-stepping for stability. */
export function step(world: World, ball: Ball, dt: number, rng: Rng): void {
  if (ball.settled) return;
  ball.hitPeg = null;
  const g = world.height * world.tuning.gravity;
  const substeps = Math.max(1, Math.ceil(dt / MAX_SUBSTEP));
  const h = dt / substeps;

  for (let i = 0; i < substeps && !ball.settled; i++) {
    ball.age += h;
    ball.vy += g * h;
    ball.x += ball.vx * h;
    ball.y += ball.vy * h;

    collidePegs(world, ball, rng);
    collideWalls(world, ball);
    collideFloor(world, ball);

    if (ball.age > MAX_SIM_SECONDS) settle(world, ball);
  }
}

function collidePegs(world: World, ball: Ball, rng: Rng): void {
  const { restitution, friction, surfaceJitter } = world.tuning;
  const minDist = world.ballR + world.pegR;
  for (const peg of world.pegs) {
    const dy = ball.y - peg.y;
    if (dy > minDist || dy < -minDist) continue;
    const dx = ball.x - peg.x;
    if (dx > minDist || dx < -minDist) continue;
    const distSq = dx * dx + dy * dy;
    if (distSq >= minDist * minDist) continue;

    const dist = Math.sqrt(distSq);
    let nx = dist > 1e-5 ? dx / dist : 0;
    let ny = dist > 1e-5 ? dy / dist : -1;

    // Random surface tilt: models peg/ball roughness and, crucially, breaks the
    // head-on symmetry so the ball always deflects to one side (the ~50/50).
    const a = (rng() - 0.5) * 2 * surfaceJitter;
    const cos = Math.cos(a);
    const sin = Math.sin(a);
    [nx, ny] = [nx * cos - ny * sin, nx * sin + ny * cos];

    // Push the ball out of the peg along the (tilted) normal.
    ball.x = peg.x + nx * minDist;
    ball.y = peg.y + ny * minDist;

    const vn = ball.vx * nx + ball.vy * ny; // < 0 ⇒ approaching
    if (vn < 0) {
      // Split into normal + tangential, bounce the normal, damp the tangent.
      const tx = ball.vx - vn * nx;
      const ty = ball.vy - vn * ny;
      ball.vx = -vn * nx * restitution + tx * (1 - friction);
      ball.vy = -vn * ny * restitution + ty * (1 - friction);
      ball.hitPeg = peg;
    }
  }
}

/**
 * Sloped side walls following the peg triangle (the board frame): one cell
 * outside the outermost peg of each row, so balls deflected outward are bounced
 * back into the pegs rather than sliding down the open corners to the edges.
 */
function collideWalls(world: World, ball: Ball): void {
  const r = world.ballR;
  const rf = Math.max(0, Math.min((ball.y - world.topMargin) / world.rowGap, world.rows - 1));
  const half = (rf / 2) * world.cellW;
  const xL = world.width / 2 - half - world.cellW;
  const xR = world.width / 2 + half + world.cellW;
  if (ball.x < xL + r) {
    ball.x = xL + r;
    if (ball.vx < 0) ball.vx = -ball.vx * world.tuning.wallRestitution;
  } else if (ball.x > xR - r) {
    ball.x = xR - r;
    if (ball.vx > 0) ball.vx = -ball.vx * world.tuning.wallRestitution;
  }
}

function collideFloor(world: World, ball: Ball): void {
  if (ball.y < world.floorY) return;
  ball.y = world.floorY;
  if (ball.vy > 0) ball.vy = -ball.vy * world.tuning.floorRestitution;
  ball.vx *= world.tuning.floorFriction;
  const restSpeed = world.cellW * 0.6;
  if (Math.abs(ball.vy) < restSpeed && Math.abs(ball.vx) < restSpeed) settle(world, ball);
}

function settle(world: World, ball: Ball): void {
  ball.settled = true;
  ball.bucket = bucketOf(world, ball.x);
  ball.x = (ball.bucket + 0.5) * world.cellW;
  ball.y = world.floorY;
  ball.vx = 0;
  ball.vy = 0;
}

/** Runs a full drop headlessly and returns the landed bucket. */
export function simulateLanding(
  rows: number,
  width: number,
  height: number,
  rng: Rng,
  tuning: Tuning = DEFAULT_TUNING,
): number {
  const world = createWorld(rows, width, height, tuning);
  const ball = spawnBall(world, rng);
  const dt = 1 / 120;
  let t = 0;
  while (!ball.settled && t < MAX_SIM_SECONDS + 1) {
    step(world, ball, dt, rng);
    t += dt;
  }
  if (!ball.settled) settle(world, ball);
  return ball.bucket;
}
