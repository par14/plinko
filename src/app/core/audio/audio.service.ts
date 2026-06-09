import { Injectable, signal } from '@angular/core';

/** Picks a sound tier from a payout multiplier. */
function bucketSound(multiplier: number): string {
  if (multiplier >= 10) return 'holeBest';
  if (multiplier >= 2) return 'holeGood';
  if (multiplier >= 1) return 'holeRegular';
  return 'holeLow';
}

const POOL_SIZE = 4;

/**
 * Plays short game sounds. Elements are pooled per source so many concurrent
 * balls don't each allocate a fresh Audio (which stuttered in the React app).
 * All playback is best-effort and guarded for non-browser / locked-autoplay.
 */
@Injectable({ providedIn: 'root' })
export class AudioService {
  private readonly muted = signal(false);
  readonly isMuted = this.muted.asReadonly();

  private readonly pools = new Map<string, HTMLAudioElement[]>();
  private readonly cursors = new Map<string, number>();

  toggleMute(): void {
    this.muted.update((m) => !m);
  }

  /** Call from the first user gesture to satisfy autoplay policies. */
  unlock(): void {
    if (this.muted()) return;
    this.borrow('sounds/ball.wav');
  }

  playDrop(): void {
    this.play('sounds/ball.wav', 0.2);
  }

  playBucket(multiplier: number): void {
    this.play(`sounds/${bucketSound(multiplier)}.wav`, 0.25);
  }

  private play(src: string, volume: number): void {
    if (this.muted() || typeof Audio === 'undefined') return;
    try {
      const audio = this.borrow(src);
      if (!audio) return;
      audio.currentTime = 0;
      audio.volume = volume;
      void audio.play()?.catch(() => undefined);
    } catch {
      /* autoplay blocked or unsupported */
    }
  }

  private borrow(src: string): HTMLAudioElement | null {
    if (typeof Audio === 'undefined') return null;
    let pool = this.pools.get(src);
    if (!pool) {
      pool = Array.from({ length: POOL_SIZE }, () => new Audio(src));
      this.pools.set(src, pool);
      this.cursors.set(src, 0);
    }
    const cursor = this.cursors.get(src) ?? 0;
    this.cursors.set(src, (cursor + 1) % pool.length);
    return pool[cursor];
  }
}
