import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { DatePipe } from '@angular/common';
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
}
