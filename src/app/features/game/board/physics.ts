/**
 * A small, dependency-free 2-D physics world for Plinko.
 *
 * The ball falls under gravity and bounces off the pegs (circle–circle),
 * the side walls, and the bucket floor. Where it lands is decided entirely by
 * the simulation — there is no predetermined outcome. All randomness flows
 * through an injected `rng` so a simulation is reproducible for a given seed.
 *
 * Units are logical CSS pixels; velocities are px/s, gravity px/s². Gravity
 * scales with board height so the ~1.4 s drop feel is resolution-independent.
 */

export type Rng = () => number; // [0, 1)

export interface Peg {
  x: number;
  y: number;
}

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

// Tuning — chosen for a weighty, realistic feel.
const TOP_MARGIN_RATIO = 0.08;
const BALL_R_RATIO = 0.3; // × cellW
const PEG_R_RATIO = 0.12; // × cellW
const GRAVITY_SCALE = 1.4; // × height  → px/s²
const RESTITUTION = 0.45; // peg/wall bounciness (normal component)
const TANGENT_FRICTION = 0; // no retention → each peg is an independent ~50/50 deflection
const WALL_RESTITUTION = 0.4;
// Horizontal motion is scaled to a stable reference fall speed
// vRef = √(2·g·depth) rather than the (bouncy, near-zero-at-apex) instantaneous
// vy. A random kick of ±JITTER·vRef, capped at ±MAX_VX·vRef, makes each row a
// consistent ~half-cell step with a random sign → a proper Galton random walk
// (centre-weighted bell) that neither collapses to the centre nor flings to the
// edges.
const PEG_JITTER = 0.8; // × vRef — random sideways kick on a peg hit
const MAX_VX_OVER_VREF = 0.42; // × vRef — keeps each step just under the triangle's half-cell/row widening
const FLOOR_RESTITUTION = 0.35;
const FLOOR_FRICTION = 0.7; // horizontal damping once on the floor
const MAX_SUBSTEP = 1 / 240; // s — cap so fast balls don't tunnel through pegs
const MAX_SIM_SECONDS = 8; // hard guard against a stuck ball

export function createWorld(rows: number, width: number, height: number): World {
  const cellW = width / (rows + 1);
  const topMargin = height * TOP_MARGIN_RATIO;
  const rowGap = (height - topMargin) / rows;
  const ballR = cellW * BALL_R_RATIO;
  const pegR = cellW * PEG_R_RATIO;

  const pegs: Peg[] = [];
  for (let r = 0; r < rows; r++) {
    const y = topMargin + r * rowGap;
    for (let s = 0; s <= r; s++) {
      const x = width / 2 + (s - r / 2) * cellW;
      pegs.push({ x, y });
    }
  }

  return {
    rows,
    width,
    height,
    pegs,
    cellW,
    ballR,
    pegR,
    topMargin,
    rowGap,
    floorY: height - ballR,
  };
}

export function spawnBall(world: World, rng: Rng): Ball {
  return {
    // Small off-centre nudge so it strikes the top peg and fans out.
    x: world.width / 2 + (rng() - 0.5) * world.cellW * 0.6,
    y: world.topMargin - world.rowGap,
    vx: (rng() - 0.5) * world.cellW * 0.5,
    vy: world.cellW * 0.5,
    settled: false,
    bucket: -1,
    hitPeg: null,
    age: 0,
  };
}

export function bucketOf(world: World, x: number): number {
  const i = Math.floor(x / world.cellW);
  return Math.max(0, Math.min(world.rows, i));
}

/** Advances the ball by one frame (`dt` seconds), sub-stepping for stability. */
export function step(world: World, ball: Ball, dt: number, rng: Rng): void {
  if (ball.settled) return;
  ball.hitPeg = null;
  const g = world.height * GRAVITY_SCALE;
  const substeps = Math.max(1, Math.ceil(dt / MAX_SUBSTEP));
  const h = dt / substeps;

  for (let i = 0; i < substeps && !ball.settled; i++) {
    ball.age += h;
    ball.vy += g * h;
    ball.x += ball.vx * h;
    ball.y += ball.vy * h;

    // Stable reference fall speed at this depth (independent of bounce wobble).
    const depth = Math.max(ball.y - world.topMargin, world.rowGap);
    const vRef = Math.sqrt(2 * g * depth);

    collidePegs(world, ball, rng, vRef);
    collideWalls(world, ball);
    collideFloor(world, ball);

    // Bound horizontal speed to a fraction of the reference fall speed → each row
    // is a ~half-cell step → centre-weighted spread (no centre-collapse, no edge-fling).
    const maxVx = MAX_VX_OVER_VREF * vRef;
    if (ball.vx > maxVx) ball.vx = maxVx;
    else if (ball.vx < -maxVx) ball.vx = -maxVx;

    if (ball.age > MAX_SIM_SECONDS) {
      settle(world, ball);
    }
  }
}

function collidePegs(world: World, ball: Ball, rng: Rng, vRef: number): void {
  const minDist = world.ballR + world.pegR;
  for (const peg of world.pegs) {
    const dy = ball.y - peg.y;
    if (dy > minDist || dy < -minDist) continue; // cheap reject by row band
    const dx = ball.x - peg.x;
    if (dx > minDist || dx < -minDist) continue;
    const distSq = dx * dx + dy * dy;
    if (distSq >= minDist * minDist) continue;

    const dist = Math.sqrt(distSq) || 1e-6;
    let nx = dx / dist;
    let ny = dy / dist;
    if (dist < 1e-5) {
      nx = 0;
      ny = -1;
    }
    // Push the ball out of the peg.
    ball.x = peg.x + nx * minDist;
    ball.y = peg.y + ny * minDist;

    const vn = ball.vx * nx + ball.vy * ny; // approaching if < 0
    if (vn < 0) {
      const tx = -ny;
      const ty = nx;
      const vt = ball.vx * tx + ball.vy * ty;
      const newVn = -vn * RESTITUTION;
      // Mostly-fresh ~50/50 sideways kick (scaled to the fall speed) so the ball
      // takes a ~half-cell step left or right off each peg.
      const jitter = (rng() - 0.5) * vRef * PEG_JITTER;
      const newVt = vt * TANGENT_FRICTION + jitter;
      ball.vx = nx * newVn + tx * newVt;
      ball.vy = ny * newVn + ty * newVt;
      ball.hitPeg = peg;
    }
  }
}

/**
 * Sloped side walls that follow the peg triangle (the board's frame): one cell
 * outside the outermost peg of each row. They funnel balls deflected outward
 * back into the pegs instead of letting them free-fall down the open corners to
 * the edge buckets — this is what makes the spread a centre-weighted bell.
 */
function collideWalls(world: World, ball: Ball): void {
  const r = world.ballR;
  const rf = Math.max(0, Math.min((ball.y - world.topMargin) / world.rowGap, world.rows - 1));
  const half = (rf / 2) * world.cellW;
  const xL = world.width / 2 - half - world.cellW; // left frame edge at this depth
  const xR = world.width / 2 + half + world.cellW; // right frame edge
  if (ball.x < xL + r) {
    ball.x = xL + r;
    if (ball.vx < 0) ball.vx = -ball.vx * WALL_RESTITUTION;
  } else if (ball.x > xR - r) {
    ball.x = xR - r;
    if (ball.vx > 0) ball.vx = -ball.vx * WALL_RESTITUTION;
  }
}

function collideFloor(world: World, ball: Ball): void {
  if (ball.y < world.floorY) return;
  ball.y = world.floorY;
  if (ball.vy > 0) ball.vy = -ball.vy * FLOOR_RESTITUTION;
  ball.vx *= FLOOR_FRICTION;
  const restSpeed = world.cellW * 0.6;
  if (Math.abs(ball.vy) < restSpeed && Math.abs(ball.vx) < restSpeed) {
    settle(world, ball);
  }
}

function settle(world: World, ball: Ball): void {
  ball.settled = true;
  ball.bucket = bucketOf(world, ball.x);
  // Tidy the resting position to the bucket centre.
  ball.x = (ball.bucket + 0.5) * world.cellW;
  ball.y = world.floorY;
  ball.vx = 0;
  ball.vy = 0;
}

/** Runs a full drop headlessly and returns the landed bucket. */
export function simulateLanding(rows: number, width: number, height: number, rng: Rng): number {
  const world = createWorld(rows, width, height);
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
