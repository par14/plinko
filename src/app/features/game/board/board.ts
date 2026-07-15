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
import { AudioService } from '../../../core/audio/audio.service';
import { GameConfigStore } from '../../../state/game-config.store';
import { GameService, type BallDrop } from '../../../state/game.service';
import { BoardEngine } from './board-engine';

interface PendingLaunch {
  drop: BallDrop;
  onLand: () => void;
}

@Component({
  selector: 'app-board',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './board.html',
  styleUrl: './board.scss',
  host: {
    class: 'board',
    '[style.--board-max-width]': 'boardMaxWidth() + "px"',
  },
})
export class Board {
  private readonly config = inject(GameConfigStore);
  private readonly game = inject(GameService);
  private readonly audio = inject(AudioService);
  private readonly host = inject(ElementRef<HTMLElement>);
  private readonly destroyRef = inject(DestroyRef);
  private readonly canvasRef = viewChild.required<ElementRef<HTMLCanvasElement>>('canvas');

  readonly rows = this.config.rows;
  readonly risk = this.config.risk;
  readonly buckets = computed(() => MULTIPLIERS[this.rows()][this.risk()]);
  readonly boardMaxWidth = computed(() => Math.max(580, (this.rows() + 1) * 52));
  readonly lastWin = this.config.lastWin;
  readonly landedBucket = signal<number | null>(null);
  readonly highlightedBuckets = signal<ReadonlyMap<number, number>>(new Map());
  readonly sceneUnavailable = signal(false);
  readonly liveMessage = computed(() => {
    const bucket = this.landedBucket();
    if (bucket === null) return '';
    const win = this.lastWin();
    const outcome = win !== null && win >= 0 ? `won ${win}` : `lost ${Math.abs(win ?? 0)}`;
    return `Ball landed on ${this.buckets()[bucket].multiplier}× — ${outcome}.`;
  });

  private engine: BoardEngine | null = null;
  private engineReady = false;
  private destroyed = false;
  private pending: PendingLaunch[] = [];
  private readonly flashTimers = new Set<ReturnType<typeof setTimeout>>();
  private latestHitId = 0;

  constructor() {
    afterNextRender(() => this.initializeScene());

    effect(() => {
      const rows = this.rows();
      this.risk();
      untracked(() => this.engine?.rebuild(rows));
    });
  }

  private initializeScene(): void {
    const canvas = this.canvasRef().nativeElement;
    const reducedMotion =
      typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.engine = new BoardEngine(canvas, this.rows(), reducedMotion, {
      onBucketHit: (bucket) => this.showBucket(bucket),
      onPegHit: (intensity) => this.audio.playPegHit(intensity),
    });
    this.game.registerLauncher((drop, onLand) => this.launch(drop, onLand));

    const observer = new ResizeObserver(() => this.resize());
    observer.observe(this.host.nativeElement);
    this.resize();

    void this.engine
      .initialize()
      .then(() => {
        if (this.destroyed) return;
        this.engineReady = true;
        this.resize();
        const queued = this.pending;
        this.pending = [];
        for (const launch of queued) this.engine?.launch(launch.drop, launch.onLand);
      })
      .catch(() => {
        if (this.destroyed) return;
        this.sceneUnavailable.set(true);
        this.settlePendingWithoutAnimation();
      });

    this.destroyRef.onDestroy(() => {
      this.destroyed = true;
      observer.disconnect();
      for (const timer of this.flashTimers) clearTimeout(timer);
      this.flashTimers.clear();
      this.settlePendingWithoutAnimation();
      this.game.registerLauncher(null);
      this.engine?.dispose();
      this.engine = null;
    });
  }

  private resize(): void {
    const canvas = this.canvasRef().nativeElement;
    const width = canvas.clientWidth || this.host.nativeElement.clientWidth || 360;
    const height = canvas.clientHeight || width;
    this.engine?.resize(width, height);
  }

  private launch(drop: BallDrop, onLand: () => void): void {
    if (this.sceneUnavailable()) {
      onLand();
      this.showBucket(drop.outcome.bucketIndex);
      return;
    }
    if (!this.engineReady) {
      this.pending.push({ drop, onLand });
      return;
    }
    this.engine?.launch(drop, onLand);
  }

  private settlePendingWithoutAnimation(): void {
    const queued = this.pending;
    this.pending = [];
    for (const launch of queued) {
      launch.onLand();
      this.showBucket(launch.drop.outcome.bucketIndex);
    }
  }

  private showBucket(bucket: number): void {
    const hitId = ++this.latestHitId;
    this.landedBucket.set(bucket);
    this.highlightedBuckets.update((hits) => {
      const next = new Map(hits);
      next.set(bucket, (next.get(bucket) ?? 0) + 1);
      return next;
    });

    const timer = setTimeout(() => {
      this.flashTimers.delete(timer);
      this.highlightedBuckets.update((hits) => {
        const next = new Map(hits);
        const remaining = (next.get(bucket) ?? 1) - 1;
        if (remaining > 0) next.set(bucket, remaining);
        else next.delete(bucket);
        return next;
      });
      if (hitId === this.latestHitId) this.landedBucket.set(null);
    }, 900);
    this.flashTimers.add(timer);
  }
}
