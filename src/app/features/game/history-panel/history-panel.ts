import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { verifyOutcome, type DropOutcome } from '../../../core/fairness/outcome';
import type { GameResult } from '../../../core/models';
import { HistoryStore } from '../../../state/history.store';
import { MoneyPipe } from '../../../shared/pipes/money.pipe';

@Component({
  selector: 'app-history-panel',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DatePipe, MoneyPipe],
  templateUrl: './history-panel.html',
  styleUrl: './history-panel.scss',
  host: { class: 'history-panel' },
})
export class HistoryPanel {
  private readonly history = inject(HistoryStore);
  readonly results = this.history.results;
  readonly verification = signal<Record<string, 'checking' | 'valid' | 'invalid'>>({});

  async verify(result: GameResult): Promise<void> {
    const proof = result.fairnessProof;
    if (!proof) return;
    this.verification.update((state) => ({ ...state, [result.id]: 'checking' }));
    const outcome: DropOutcome = {
      ...proof,
      rows: result.rows,
      bucketIndex: result.bucketIndex,
    };
    const valid = await verifyOutcome(outcome);
    this.verification.update((state) => ({
      ...state,
      [result.id]: valid ? 'valid' : 'invalid',
    }));
  }
}
