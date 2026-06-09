import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  afterNextRender,
  computed,
  effect,
  inject,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import { MULTIPLIERS } from '../../../core/fairness/multipliers';
import { GameConfigStore } from '../../../state/game-config.store';
import { GameService, type BallDrop } from '../../../state/game.service';
import {
  bucketOf,
  createWorld,
  simulateLanding,
  spawnBall,
  step,
  type Ball,
  type Peg,
  type World,
} from './physics';

interface BallAnim {
  drop: BallDrop;
  onLand: (bucketIndex: number) => void;
  ball: Ball;
  reported: boolean;
  /** Wall-clock time (ms) at which the settled ball is removed. */
  removeAt: number | null;
}

const SETTLE_LINGER_MS = 550;
const PEG_FLASH_MS = 130;
const MAX_FRAME_DT = 0.05; // s — clamp so a backgrounded tab doesn't teleport balls

@Component({
  selector: 'app-board',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './board.html',
  styleUrl: './board.scss',
  host: { class: 'board' },
})
export class Board {
  private readonly config = inject(GameConfigStore);
  private readonly game = inject(GameService);
  private readonly host = inject(ElementRef<HTMLElement>);
  private readonly destroyRef = inject(DestroyRef);

  private readonly canvasRef =
    viewChild.required<ElementRef<HTMLCanvasElement>>('canvas');

  readonly rows = this.config.rows;
  readonly risk = this.config.risk;
  readonly buckets = computed(() => MULTIPLIERS[this.rows()][this.risk()]);
  readonly lastWin = this.config.lastWin;

  /** Bucket index currently flashing from a landing (drives the highlight + aria-live). */
  readonly landedBucket = signal<number | null>(null);
  readonly liveMessage = computed(() => {
    const i = this.landedBucket();
    if (i === null) return '';
    const win = this.lastWin();
    const outcome = win !== null && win >= 0 ? `won ${win}` : `lost ${Math.abs(win ?? 0)}`;
    return `Ball landed on ${this.buckets()[i].multiplier}× — ${outcome}.`;
  });

  private ctx: CanvasRenderingContext2D | null = null;
  private cssW = 0;
  private cssH = 0;
  private dpr = 1;
  private reducedMotion = false;
  private world: World | null = null;
  private balls: BallAnim[] = [];
  private readonly pegFlash = new Map<Peg, number>();
  private flashTimer: ReturnType<typeof setTimeout> | null = null;
  private lastTs = 0;
  private rafId = 0;
  private running = false;

  constructor() {
    afterNextRender(() => {
      const canvas = this.canvasRef().nativeElement;
      this.ctx = canvas.getContext('2d');
      this.reducedMotion =
        typeof matchMedia === 'function' &&
        matchMedia('(prefers-reduced-motion: reduce)').matches;

      const observer = new ResizeObserver(() => this.resize());
      observer.observe(this.host.nativeElement);
      this.resize();

      this.game.registerLauncher((drop, onLand) => this.launch(drop, onLand));

      this.destroyRef.onDestroy(() => {
        this.flushBalls();
        observer.disconnect();
        if (this.flashTimer) clearTimeout(this.flashTimer);
      });
    });

    // Rebuild the world for the new layout when rows/risk change, settling any
    // in-flight balls first so no wagered ball is dropped.
    effect(() => {
      this.rows();
      this.risk();
      untracked(() => {
        if (!this.ctx) return;
        this.flushBalls();
        this.resize();
      });
    });
  }

  /** Settle any in-flight balls and stop the loop — never drop a wagered ball. */
  private flushBalls(): void {
    for (const anim of this.balls) {
      if (!anim.reported) {
        if (anim.ball.bucket < 0 && this.world) {
          anim.ball.bucket = bucketOf(this.world, anim.ball.x);
        }
        this.report(anim);
      }
    }
    this.balls = [];
    this.pegFlash.clear();
    this.stopLoop();
  }

  // ----- sizing ----------------------------------------------------------

  private resize(): void {
    const canvas = this.canvasRef().nativeElement;
    this.cssW = canvas.clientWidth || this.host.nativeElement.clientWidth || 360;
    this.cssH = canvas.clientHeight || this.cssW;
    this.dpr = Math.min(typeof devicePixelRatio === 'number' ? devicePixelRatio : 1, 2.5);

    canvas.width = Math.round(this.cssW * this.dpr);
    canvas.height = Math.round(this.cssH * this.dpr);
    this.ctx?.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);

    this.world = createWorld(this.rows(), this.cssW, this.cssH);
    this.render();
  }

  // ----- launching & stepping -------------------------------------------

  private launch(drop: BallDrop, onLand: (bucketIndex: number) => void): void {
    const world = this.world;
    if (!world) return;

    if (this.reducedMotion) {
      // No motion: resolve the landing headlessly and show the ball at rest.
      const bucket = simulateLanding(drop.rows, this.cssW, this.cssH, Math.random);
      const ball = spawnBall(world, Math.random);
      ball.settled = true;
      ball.bucket = bucket;
      ball.x = (bucket + 0.5) * world.cellW;
      ball.y = world.floorY;
      const anim: BallAnim = {
        drop,
        onLand,
        ball,
        reported: false,
        removeAt: performance.now() + SETTLE_LINGER_MS,
      };
      this.report(anim);
      this.balls.push(anim);
      this.startLoop();
      return;
    }

    const ball = spawnBall(world, Math.random);
    this.balls.push({ drop, onLand, ball, reported: false, removeAt: null });
    this.startLoop();
  }

  private report(anim: BallAnim): void {
    if (anim.reported) return;
    anim.reported = true;
    anim.onLand(anim.ball.bucket);
    this.landedBucket.set(anim.ball.bucket);
    if (this.flashTimer) clearTimeout(this.flashTimer);
    this.flashTimer = setTimeout(() => this.landedBucket.set(null), 700);
  }

  private startLoop(): void {
    if (this.running) return;
    this.running = true;
    this.lastTs = performance.now();
    const loop = (ts: number) => {
      const dt = Math.min((ts - this.lastTs) / 1000, MAX_FRAME_DT);
      this.lastTs = ts;
      this.update(dt);
      this.render();
      if (this.balls.length) {
        this.rafId = requestAnimationFrame(loop);
      } else {
        this.running = false;
        this.render();
      }
    };
    this.rafId = requestAnimationFrame(loop);
  }

  private stopLoop(): void {
    this.running = false;
    cancelAnimationFrame(this.rafId);
  }

  private update(dt: number): void {
    const world = this.world;
    if (!world) return;

    // Decay peg-hit flashes.
    if (this.pegFlash.size) {
      for (const [peg, remaining] of this.pegFlash) {
        const next = remaining - dt * 1000;
        if (next <= 0) this.pegFlash.delete(peg);
        else this.pegFlash.set(peg, next);
      }
    }

    const now = performance.now();
    const remaining: BallAnim[] = [];
    for (const anim of this.balls) {
      if (!anim.ball.settled) {
        step(world, anim.ball, dt, Math.random);
        if (anim.ball.hitPeg) this.pegFlash.set(anim.ball.hitPeg, PEG_FLASH_MS);
      }
      if (anim.ball.settled && !anim.reported) {
        this.report(anim);
        anim.removeAt = now + SETTLE_LINGER_MS;
      }
      if (anim.removeAt !== null && now >= anim.removeAt) continue; // remove
      remaining.push(anim);
    }
    this.balls = remaining;
  }

  // ----- rendering -------------------------------------------------------

  private render(): void {
    const ctx = this.ctx;
    const world = this.world;
    if (!ctx || !world) return;
    ctx.clearRect(0, 0, this.cssW, this.cssH);

    const pegR = world.pegR;
    for (const peg of world.pegs) {
      const flash = this.pegFlash.get(peg);
      ctx.beginPath();
      ctx.fillStyle = 'rgba(120, 150, 220, 0.18)';
      ctx.arc(peg.x, peg.y, pegR * 1.9, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.fillStyle = flash ? '#ffe39a' : 'rgba(255, 255, 255, 0.92)';
      ctx.arc(peg.x, peg.y, flash ? pegR * 1.25 : pegR, 0, Math.PI * 2);
      ctx.fill();
    }

    const ballR = world.ballR;
    for (const anim of this.balls) {
      const { x, y } = anim.ball;
      ctx.save();
      ctx.shadowColor = 'rgba(255, 196, 64, 0.7)';
      ctx.shadowBlur = ballR * 1.8;
      const gradient = ctx.createRadialGradient(
        x - ballR * 0.35,
        y - ballR * 0.35,
        ballR * 0.15,
        x,
        y,
        ballR,
      );
      gradient.addColorStop(0, '#fff4cf');
      gradient.addColorStop(0.45, '#ffd34d');
      gradient.addColorStop(1, '#f0a52e');
      ctx.beginPath();
      ctx.fillStyle = gradient;
      ctx.arc(x, y, ballR, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }
}
