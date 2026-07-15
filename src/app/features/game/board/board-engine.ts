import RAPIER from '@dimforge/rapier3d-compat';
import * as THREE from 'three';
import type { BallDrop } from '../../../state/game.service';
import { dividerReleaseVelocity, finalGapVelocity, pegBounceVelocity } from './bounce-guidance';
import {
  bucketIndexAtX,
  createBoardGeometry,
  gapAfterDirection,
  type BoardGeometry,
  type BoardPoint,
  verticalFovForWidth,
} from './board-geometry';

interface ActiveBall {
  drop: BallDrop;
  body: RAPIER.RigidBody;
  colliderHandle: number;
  mesh: THREE.Mesh<THREE.SphereGeometry, THREE.MeshStandardMaterial>;
  onLand: () => void;
  pathIndex: number;
  rights: number;
  age: number;
  removeAt: number | null;
  reported: boolean;
  lastPegSoundAt: number;
  nextStuckReleaseAt: number;
}

export interface BoardEngineCallbacks {
  onBucketHit: (bucket: number) => void;
  onPegHit: (intensity: number) => void;
}

const FIXED_STEP = 1 / 120;
const MAX_FRAME_SECONDS = 0.05;
const MAX_STEPS = 8;
const BALL_LINGER_MS = 900;
const PEG_FLASH_MS = 120;
const BUCKET_FLASH_MS = 900;
const STATIC_GROUP = (0x0001 << 16) | 0x0002;
const BALL_GROUP = (0x0002 << 16) | 0x0001;

export class BoardEngine {
  private renderer: THREE.WebGLRenderer | null = null;
  private readonly scene = new THREE.Scene();
  private readonly camera = new THREE.PerspectiveCamera(42, 1, 0.1, 50);
  private world: RAPIER.World | null = null;
  private events: RAPIER.EventQueue | null = null;
  private geometry: BoardGeometry;
  private pegMesh: THREE.InstancedMesh | null = null;
  private bucketMesh: THREE.InstancedMesh | null = null;
  private readonly pegColliderToIndex = new Map<number, number>();
  private readonly ballByCollider = new Map<number, ActiveBall>();
  private readonly pegFlashes = new Map<number, number>();
  private readonly bucketFlashes = new Map<number, number>();
  private readonly balls: ActiveBall[] = [];
  private readonly disposableObjects: THREE.Object3D[] = [];
  private rafId = 0;
  private lastTime = 0;
  private accumulator = 0;
  private width = 1;
  private height = 1;
  private running = false;
  private disposed = false;

  constructor(
    private readonly canvas: HTMLCanvasElement,
    rows: number,
    private readonly reducedMotion: boolean,
    private readonly callbacks: BoardEngineCallbacks,
  ) {
    this.geometry = createBoardGeometry(rows);
  }

  async initialize(): Promise<void> {
    await RAPIER.init();
    if (this.disposed) return;
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: !this.isLowPowerDevice(),
      alpha: true,
      powerPreference: 'high-performance',
    });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.1;
    this.scene.background = new THREE.Color(0x0c0f17);
    this.camera.position.set(0, 0, 14.5);
    this.camera.lookAt(0, 0, 0);
    this.buildWorld();
    this.resize(this.canvas.clientWidth || 360, this.canvas.clientHeight || 360);
    this.render();
  }

  get activeBallCount(): number {
    return this.balls.length;
  }

  rebuild(rows: number): void {
    if (this.balls.length || this.disposed) return;
    this.geometry = createBoardGeometry(rows);
    this.buildWorld();
    this.render();
  }

  resize(width: number, height: number): void {
    if (!this.renderer || width <= 0 || height <= 0) return;
    this.width = width;
    this.height = height;
    const lowPower = this.isLowPowerDevice() || width < 520;
    const dpr = typeof devicePixelRatio === 'number' ? devicePixelRatio : 1;
    this.renderer.setPixelRatio(Math.min(dpr, lowPower ? 1.35 : 2));
    this.renderer.setSize(width, height, false);
    this.camera.aspect = width / height;
    // Buckets are rendered as an HTML grid below the canvas. Match the
    // camera's horizontal bounds to the physical outer dividers so their
    // centres use exactly the same screen-space coordinates.
    this.camera.fov = verticalFovForWidth(
      this.geometry.width,
      this.camera.position.z - 0.05,
      this.camera.aspect,
    );
    this.camera.updateProjectionMatrix();
    this.render();
  }

  launch(drop: BallDrop, onLand: () => void): void {
    if (!this.world || !this.renderer) {
      onLand();
      this.callbacks.onBucketHit(drop.outcome.bucketIndex);
      return;
    }
    const targetX = this.geometry.bucketCenters[drop.outcome.bucketIndex];
    const mesh = this.createBallMesh();
    const y = this.reducedMotion ? this.geometry.floorY + this.geometry.ballRadius : 5.15;
    mesh.position.set(this.reducedMotion ? targetX : 0, y, 0.05);
    this.scene.add(mesh);

    const body = this.world.createRigidBody(
      RAPIER.RigidBodyDesc.dynamic()
        .setTranslation(mesh.position.x, mesh.position.y, mesh.position.z)
        .setCcdEnabled(true)
        .setLinearDamping(0.12)
        .setAngularDamping(0.12),
    );
    body.setEnabledTranslations(true, true, false, true);
    const collider = this.world.createCollider(
      RAPIER.ColliderDesc.ball(this.geometry.ballRadius)
        .setRestitution(0.64)
        .setFriction(0.18)
        .setDensity(1.1)
        .setCollisionGroups(BALL_GROUP)
        .setActiveEvents(RAPIER.ActiveEvents.COLLISION_EVENTS),
      body,
    );
    const ball: ActiveBall = {
      drop,
      body,
      colliderHandle: collider.handle,
      mesh,
      onLand,
      pathIndex: 0,
      rights: 0,
      age: 0,
      removeAt: null,
      reported: false,
      lastPegSoundAt: -Infinity,
      nextStuckReleaseAt: 6,
    };
    this.balls.push(ball);
    this.ballByCollider.set(collider.handle, ball);

    if (this.reducedMotion) {
      body.setBodyType(RAPIER.RigidBodyType.Fixed, false);
      this.finishBall(ball, performance.now());
    }
    this.startLoop();
  }

  dispose(): void {
    this.disposed = true;
    cancelAnimationFrame(this.rafId);
    this.running = false;
    for (const ball of this.balls) {
      if (!ball.reported) ball.onLand();
      this.disposeMesh(ball.mesh);
    }
    this.balls.length = 0;
    this.clearVisualWorld();
    this.events?.free();
    this.world?.free();
    this.events = null;
    this.world = null;
    this.renderer?.dispose();
    this.renderer?.forceContextLoss();
    this.renderer = null;
  }

  private buildWorld(): void {
    this.clearVisualWorld();
    this.events?.free();
    this.world?.free();
    this.events = new RAPIER.EventQueue(true);
    this.world = new RAPIER.World({ x: 0, y: -16, z: 0 });
    this.world.timestep = FIXED_STEP;
    this.world.lengthUnit = 1;
    this.addLightsAndBackdrop();
    this.addPegs();
    this.addBoundaries();
  }

  private addLightsAndBackdrop(): void {
    const ambient = new THREE.HemisphereLight(0x9dbdff, 0x080b12, 1.6);
    const key = new THREE.DirectionalLight(0xffe2a3, 2.6);
    key.position.set(-3, 6, 8);
    const plate = new THREE.Mesh(
      new THREE.PlaneGeometry(11, 11),
      new THREE.MeshStandardMaterial({ color: 0x101725, roughness: 0.82, metalness: 0.18 }),
    );
    plate.position.z = -0.42;
    this.scene.add(ambient, key, plate);
    this.disposableObjects.push(ambient, key, plate);
  }

  private addPegs(): void {
    if (!this.world) return;
    const pegGeometry = new THREE.CylinderGeometry(
      this.geometry.pegRadius,
      this.geometry.pegRadius,
      0.48,
      18,
    );
    pegGeometry.rotateX(Math.PI / 2);
    const pegMaterial = new THREE.MeshStandardMaterial({
      color: 0xf5f8ff,
      emissive: 0x263654,
      emissiveIntensity: 0.35,
      roughness: 0.28,
      metalness: 0.55,
    });
    const mesh = new THREE.InstancedMesh(pegGeometry, pegMaterial, this.geometry.pegs.length);
    const matrix = new THREE.Matrix4();
    const color = new THREE.Color(0xf5f8ff);
    this.geometry.pegs.forEach((peg, index) => {
      matrix.makeTranslation(peg.x, peg.y, 0);
      mesh.setMatrixAt(index, matrix);
      mesh.setColorAt(index, color);
      const collider = this.world!.createCollider(
        RAPIER.ColliderDesc.ball(this.geometry.pegRadius)
          .setTranslation(peg.x, peg.y, 0)
          .setRestitution(0.66)
          .setFriction(0.16)
          .setCollisionGroups(STATIC_GROUP)
          .setActiveEvents(RAPIER.ActiveEvents.COLLISION_EVENTS),
      );
      this.pegColliderToIndex.set(collider.handle, index);
    });
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    this.scene.add(mesh);
    this.disposableObjects.push(mesh);
    this.pegMesh = mesh;
  }

  private addBoundaries(): void {
    if (!this.world) return;
    this.addStaticBox(0, this.geometry.floorY - 0.12, this.geometry.width / 2 + 0.4, 0.12, 0);
    this.addWall(this.geometry.leftWall);
    this.addWall(this.geometry.rightWall);
    for (const x of this.geometry.bucketDividers) {
      this.addStaticBox(x, this.geometry.floorY + 0.55, 0.045, 0.55, 0);
    }
    this.addBucketIndicators();
  }

  /** A physical flash directly under the resting ball removes any grid ambiguity. */
  private addBucketIndicators(): void {
    const geometry = new THREE.BoxGeometry(this.geometry.cell * 0.82, 0.12, 0.5);
    const material = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const mesh = new THREE.InstancedMesh(geometry, material, this.geometry.bucketCenters.length);
    const matrix = new THREE.Matrix4();
    const color = new THREE.Color(0x263754);
    this.geometry.bucketCenters.forEach((x, index) => {
      matrix.makeTranslation(x, this.geometry.floorY + 0.07, 0.08);
      mesh.setMatrixAt(index, matrix);
      mesh.setColorAt(index, color);
    });
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    this.scene.add(mesh);
    this.disposableObjects.push(mesh);
    this.bucketMesh = mesh;
  }

  private addWall([from, to]: [BoardPoint, BoardPoint]): void {
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const angle = Math.atan2(dy, dx);
    this.addStaticBox(
      (from.x + to.x) / 2,
      (from.y + to.y) / 2,
      Math.hypot(dx, dy) / 2,
      0.06,
      angle,
    );
  }

  private addStaticBox(x: number, y: number, halfW: number, halfH: number, angle: number): void {
    if (!this.world) return;
    const rotation = { x: 0, y: 0, z: Math.sin(angle / 2), w: Math.cos(angle / 2) };
    this.world.createCollider(
      RAPIER.ColliderDesc.cuboid(halfW, halfH, 0.35)
        .setTranslation(x, y, 0)
        .setRotation(rotation)
        .setRestitution(0.24)
        .setFriction(0.48)
        .setCollisionGroups(STATIC_GROUP),
    );
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(halfW * 2, halfH * 2, 0.46),
      new THREE.MeshStandardMaterial({ color: 0x435575, roughness: 0.36, metalness: 0.6 }),
    );
    mesh.position.set(x, y, 0);
    mesh.rotation.z = angle;
    this.scene.add(mesh);
    this.disposableObjects.push(mesh);
  }

  private createBallMesh(): THREE.Mesh<THREE.SphereGeometry, THREE.MeshStandardMaterial> {
    return new THREE.Mesh(
      new THREE.SphereGeometry(this.geometry.ballRadius, 24, 18),
      new THREE.MeshStandardMaterial({
        color: 0xffc43d,
        emissive: 0x8b3f08,
        emissiveIntensity: 0.45,
        roughness: 0.22,
        metalness: 0.32,
      }),
    );
  }

  private startLoop(): void {
    if (this.running || this.disposed) return;
    this.running = true;
    this.lastTime = performance.now();
    this.rafId = requestAnimationFrame((time) => this.frame(time));
  }

  private frame(time: number): void {
    if (!this.running || this.disposed) return;
    const frameSeconds = Math.min((time - this.lastTime) / 1000, MAX_FRAME_SECONDS);
    this.lastTime = time;
    this.accumulator += frameSeconds;
    let steps = 0;
    while (this.accumulator >= FIXED_STEP && steps < MAX_STEPS) {
      this.physicsStep(time);
      this.accumulator -= FIXED_STEP;
      steps++;
    }
    this.syncMeshes();
    this.updatePegFlashes(frameSeconds * 1000);
    this.updateBucketFlashes(frameSeconds * 1000);
    this.removeExpiredBalls(time);
    this.render();
    if (this.balls.length || this.pegFlashes.size || this.bucketFlashes.size) {
      this.rafId = requestAnimationFrame((next) => this.frame(next));
    } else {
      this.running = false;
      this.accumulator = 0;
    }
  }

  private physicsStep(now: number): void {
    if (!this.world || !this.events) return;
    for (const ball of this.balls) {
      if (ball.removeAt !== null || this.reducedMotion) continue;
      ball.age += FIXED_STEP;
    }
    this.world.step(this.events);
    this.events.drainCollisionEvents((first, second, started) => {
      if (!started) return;
      const peg = this.pegColliderToIndex.get(first) ?? this.pegColliderToIndex.get(second);
      const ball = this.ballByCollider.get(first) ?? this.ballByCollider.get(second);
      if (peg !== undefined && ball) {
        this.pegFlashes.set(peg, PEG_FLASH_MS);
        if (now - ball.lastPegSoundAt >= 45) {
          const velocity = ball.body.linvel();
          const intensity = THREE.MathUtils.clamp(Math.hypot(velocity.x, velocity.y) / 8, 0.25, 1);
          ball.lastPegSoundAt = now;
          this.callbacks.onPegHit(intensity);
        }
        this.guidePegBounce(ball, peg);
      }
    });
    for (const ball of this.balls) {
      if (ball.removeAt !== null) continue;
      const position = ball.body.translation();
      const velocity = ball.body.linvel();
      this.recoverMissedRow(ball);
      const atBottom = position.y <= this.geometry.floorY + this.geometry.ballRadius + 0.045;
      const speed = Math.hypot(velocity.x, velocity.y);
      const almostStill = speed < 0.55;
      const lastRowY = this.geometry.rowY.at(-1) ?? this.geometry.floorY;
      const belowPegField = position.y < lastRowY + this.geometry.ballRadius * 1.2;
      const needsDividerRelease = speed < 0.35 || ball.age > 10;
      if (
        !atBottom &&
        belowPegField &&
        needsDividerRelease &&
        ball.age >= ball.nextStuckReleaseAt
      ) {
        this.releaseStuckBall(ball);
      }
      if (atBottom && (almostStill || ball.age > 7)) {
        this.finishBall(ball, now);
      }
    }
  }

  /** Adds one bounded lateral kick after Rapier has resolved a real peg collision. */
  private guidePegBounce(ball: ActiveBall, pegIndex: number): void {
    const peg = this.geometry.pegs[pegIndex];
    if (!peg || peg.row !== ball.pathIndex) return;
    this.advancePath(ball, false);
  }

  /** A row can occasionally be crossed without a contact; recover once, not every substep. */
  private recoverMissedRow(ball: ActiveBall): void {
    if (ball.pathIndex >= ball.drop.outcome.path.length) return;
    const position = ball.body.translation();
    if (position.y < this.geometry.rowY[ball.pathIndex] - this.geometry.pegRadius * 2.5) {
      this.advancePath(ball, true);
    }
  }

  private advancePath(ball: ActiveBall, missedContact: boolean): void {
    const row = ball.pathIndex;
    const direction = ball.drop.outcome.path[row];
    if (direction === 'R') ball.rights++;
    const targetX = gapAfterDirection(this.geometry, row, ball.rights);
    ball.pathIndex++;

    const position = ball.body.translation();
    const velocity = ball.body.linvel();
    const isFinalRow = ball.pathIndex === ball.drop.outcome.path.length;
    const desiredVelocity = isFinalRow
      ? finalGapVelocity(direction, targetX, position.x, velocity.x)
      : pegBounceVelocity(direction, targetX, position.x, velocity.x, missedContact);
    const deltaVelocity = desiredVelocity - velocity.x;
    ball.body.applyImpulse({ x: ball.body.mass() * deltaVelocity, y: 0, z: 0 }, true);
  }

  /**
   * Rarely a sphere can balance on the narrow top of a divider. Wake it with
   * one small physical impulse; never change its position or body type.
   */
  private releaseStuckBall(ball: ActiveBall): void {
    const position = ball.body.translation();
    const velocity = ball.body.linvel();
    const targetX = this.geometry.bucketCenters[ball.drop.outcome.bucketIndex];
    const desiredX = dividerReleaseVelocity(targetX, position.x);
    ball.body.applyImpulse(
      {
        x: ball.body.mass() * (desiredX - velocity.x),
        y: ball.body.mass() * -0.25,
        z: 0,
      },
      true,
    );
    ball.nextStuckReleaseAt = ball.age + 1.2;
  }

  private finishBall(ball: ActiveBall, now: number): void {
    if (ball.reported) return;
    ball.reported = true;
    const position = ball.body.translation();
    ball.body.setLinvel({ x: 0, y: 0, z: 0 }, true);
    ball.body.setAngvel({ x: 0, y: 0, z: 0 }, true);
    ball.body.setBodyType(RAPIER.RigidBodyType.Fixed, false);
    // Preserve the exact Rapier resting position: no centring, interpolation,
    // or teleport at the bottom of the bucket.
    ball.mesh.position.set(position.x, position.y, position.z);
    const visualBucket = bucketIndexAtX(this.geometry, position.x);
    this.bucketFlashes.set(visualBucket, BUCKET_FLASH_MS);
    ball.removeAt = now + BALL_LINGER_MS;
    ball.onLand();
    this.callbacks.onBucketHit(visualBucket);
  }

  private syncMeshes(): void {
    for (const ball of this.balls) {
      const translation = ball.body.translation();
      const rotation = ball.body.rotation();
      ball.mesh.position.set(translation.x, translation.y, translation.z);
      ball.mesh.quaternion.set(rotation.x, rotation.y, rotation.z, rotation.w);
    }
  }

  private updatePegFlashes(elapsedMs: number): void {
    if (!this.pegMesh) return;
    const normal = new THREE.Color(0xf5f8ff);
    const hit = new THREE.Color(0xffe39a);
    for (const [index, remaining] of this.pegFlashes) {
      const next = remaining - elapsedMs;
      this.pegMesh.setColorAt(index, next > 0 ? hit : normal);
      if (next > 0) this.pegFlashes.set(index, next);
      else this.pegFlashes.delete(index);
    }
    if (this.pegMesh.instanceColor) this.pegMesh.instanceColor.needsUpdate = true;
  }

  private updateBucketFlashes(elapsedMs: number): void {
    if (!this.bucketMesh) return;
    const normal = new THREE.Color(0x263754);
    const hit = new THREE.Color(0xffd34d);
    for (const [index, remaining] of this.bucketFlashes) {
      const next = remaining - elapsedMs;
      this.bucketMesh.setColorAt(index, next > 0 ? hit : normal);
      if (next > 0) this.bucketFlashes.set(index, next);
      else this.bucketFlashes.delete(index);
    }
    if (this.bucketMesh.instanceColor) this.bucketMesh.instanceColor.needsUpdate = true;
  }

  private removeExpiredBalls(now: number): void {
    if (!this.world) return;
    for (let index = this.balls.length - 1; index >= 0; index--) {
      const ball = this.balls[index];
      if (ball.removeAt === null || now < ball.removeAt) continue;
      this.ballByCollider.delete(ball.colliderHandle);
      this.world.removeRigidBody(ball.body);
      this.scene.remove(ball.mesh);
      this.disposeMesh(ball.mesh);
      this.balls.splice(index, 1);
    }
  }

  private clearVisualWorld(): void {
    this.pegColliderToIndex.clear();
    this.pegFlashes.clear();
    this.bucketFlashes.clear();
    this.pegMesh = null;
    this.bucketMesh = null;
    for (const object of this.disposableObjects) {
      this.scene.remove(object);
      if (object instanceof THREE.Mesh) this.disposeMesh(object);
    }
    this.disposableObjects.length = 0;
  }

  private disposeMesh(mesh: THREE.Mesh): void {
    mesh.geometry.dispose();
    const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    for (const material of materials) material.dispose();
  }

  private render(): void {
    this.renderer?.render(this.scene, this.camera);
  }

  private isLowPowerDevice(): boolean {
    const cores = typeof navigator === 'object' ? navigator.hardwareConcurrency : undefined;
    return this.reducedMotion || (cores !== undefined && cores <= 4);
  }
}
