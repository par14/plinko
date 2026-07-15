import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { GameConfigStore } from '../../../state/game-config.store';
import { Board } from '../board/board';
import { Controls } from '../controls/controls';
import { HistoryPanel } from '../history-panel/history-panel';

@Component({
  selector: 'app-game-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Board, Controls, HistoryPanel],
  templateUrl: './game-page.html',
  styleUrl: './game-page.scss',
  host: {
    '[style.--game-board-width]': 'boardWidth() + "px"',
  },
})
export class GamePage {
  private readonly config = inject(GameConfigStore);
  readonly boardWidth = computed(() => Math.max(580, (this.config.rows() + 1) * 52));
}
