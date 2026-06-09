import { ChangeDetectionStrategy, Component } from '@angular/core';
import { Board } from '../board/board';
import { Controls } from '../controls/controls';
import { HistoryPanel } from '../history-panel/history-panel';

@Component({
  selector: 'app-game-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Board, Controls, HistoryPanel],
  templateUrl: './game-page.html',
  styleUrl: './game-page.scss',
})
export class GamePage {}
