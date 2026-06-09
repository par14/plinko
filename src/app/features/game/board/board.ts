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

interface Point {
  x: number;
  y: number;
}

interface BallAnim {
  drop: BallDrop;
  onLand: () => void;
  /** Logical (CSS-pixel) waypoints, one per peg row plus the bucket entry. */
  waypoints: Point[];
  elapsed: number;
  landed: boolean;
}

const ROW_DURATION_MS = 95;
const SETTLE_MS = 320;
const TOP_MARGIN_RATIO = 0.08;

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
  private balls: BallAnim[] = [];
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

    // Board geometry changes with rows/risk; settle in-flight balls (so their
    // stakes resolve) before resetting the board for the new layout.
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
    for (const ball of this.balls) {
      if (!ball.landed) {
        ball.landed = true;
        ball.onLand();
      }
    }
    this.balls = [];
    this.stopLoop();
  }

  // ----- geometry --------------------------------------------------------

  private resize(): void {
    const canvas = this.canvasRef().nativeElement;
    // CSS sizes the canvas (width:100% + aspect-ratio:1/1); we only measure the
    // laid-out box and set the backing-store resolution to match.
    this.cssW = canvas.clientWidth || this.host.nativeElement.clientWidth || 360;
    this.cssH = canvas.clientHeight || this.cssW;
    this.dpr = Math.min(typeof devicePixelRatio === 'number' ? devicePixelRatio : 1, 2.5);

    canvas.width = Math.round(this.cssW * this.dpr);
    canvas.height = Math.round(this.cssH * this.dpr);
    this.ctx?.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    this.render();
  }

  /** Horizontal centre of slot `s` at peg row `r` (s in 0..r). */
  private slotX(r: number, s: number): number {
    const cellW = this.cssW / (this.rows() + 1);
    return this.cssW / 2 + (s - r / 2) * cellW;
  }

  private rowY(r: number): number {
    const top = this.cssH * TOP_MARGIN_RATIO;
    const rowGap = (this.cssH - top) / this.rows();
    return top + r * rowGap;
  }

  private pegRadius(): number {
    return Math.max(1.5, (this.cssW / (this.rows() + 1)) * 0.12);
  }

  private ballRadius(): number {
    return Math.max(3, (this.cssW / (this.rows() + 1)) * 0.3);
  }

  // ----- animation -------------------------------------------------------

  private launch(drop: BallDrop, onLand: () => void): void {
    const R = drop.rows;
    const waypoints: Point[] = [];
    let rights = 0;
    waypoints.push({ x: this.slotX(0, 0), y: this.rowY(0) });
    for (let r = 0; r < R; r++) {
      if (drop.outcome.path[r] === 'R') rights++;
      waypoints.push({ x: this.slotX(r + 1, rights), y: this.rowY(r + 1) });
    }

    const ball: BallAnim = { drop, onLand, waypoints, elapsed: 0, landed: false };
    this.balls.push(ball);
    this.startLoop();
  }

  // The board is static between drops, so the rAF loop only runs while balls
  // are in flight; otherwise we idle and redraw on demand (resize / config).
  private startLoop(): void {
    if (this.running) return;
    this.running = true;
    this.lastTs = performance.now();
    const loop = (ts: number) => {
      const dt = ts - this.lastTs;
      this.lastTs = ts;
      this.update(dt);
      this.render();
      if (this.balls.length) {
        this.rafId = requestAnimationFrame(loop);
      } else {
        this.running = false;
        this.render(); // final static frame
      }
    };
    this.rafId = requestAnimationFrame(loop);
  }

  private stopLoop(): void {
    this.running = false;
    cancelAnimationFrame(this.rafId);
  }

  private update(dt: number): void {
    if (!this.balls.length) return;
    const remaining: BallAnim[] = [];
    for (const ball of this.balls) {
      ball.elapsed += dt;
      const total = ball.drop.rows * ROW_DURATION_MS;
      if (!ball.landed && ball.elapsed >= total) {
        this.settleBall(ball);
      }
      if (ball.landed && ball.elapsed >= total + SETTLE_MS) {
        continue; // remove
      }
      remaining.push(ball);
    }
    this.balls = remaining;
  }

  private settleBall(ball: BallAnim): void {
    ball.landed = true;
    ball.onLand();
    const bucket = ball.drop.outcome.bucketIndex;
    this.landedBucket.set(bucket);
    if (this.flashTimer) clearTimeout(this.flashTimer);
    this.flashTimer = setTimeout(() => this.landedBucket.set(null), 600);
  }

  private ballPosition(ball: BallAnim): Point {
    const segDur = ROW_DURATION_MS;
    const segment = Math.min(Math.floor(ball.elapsed / segDur), ball.drop.rows - 1);
    const local = Math.min((ball.elapsed - segment * segDur) / segDur, 1);
    const from = ball.waypoints[segment];
    const to = ball.waypoints[segment + 1];
    const ease = local * local * (3 - 2 * local);
    const x = from.x + (to.x - from.x) * ease;
    const rowGap = to.y - from.y;
    // Skip the bounce arc under reduced motion; the ball still descends calmly.
    const hop = this.reducedMotion ? 0 : Math.sin(Math.PI * local) * rowGap * 0.3;
    const y = from.y + (to.y - from.y) * local - hop;
    return { x, y };
  }

  // ----- rendering -------------------------------------------------------

  private render(): void {
    const ctx = this.ctx;
    if (!ctx) return;
    ctx.clearRect(0, 0, this.cssW, this.cssH);

    const R = this.rows();
    const pegR = this.pegRadius();

    // Pegs: a faint halo plus a bright core, for a soft glowing look.
    for (let r = 0; r < R; r++) {
      for (let s = 0; s <= r; s++) {
        const px = this.slotX(r, s);
        const py = this.rowY(r);
        ctx.beginPath();
        ctx.fillStyle = 'rgba(120, 150, 220, 0.18)';
        ctx.arc(px, py, pegR * 1.9, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.fillStyle = 'rgba(255, 255, 255, 0.92)';
        ctx.arc(px, py, pegR, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    const ballR = this.ballRadius();
    for (const ball of this.balls) {
      const { x, y } = this.ballPosition(ball);

      // Soft glow.
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
