import { ChangeDetectionStrategy, Component, afterNextRender, inject, signal } from '@angular/core';
import { PLINKO_STORE } from '../../../core/db/plinko-store.token';
import type { Player } from '../../../core/models';
import { PlayersStore } from '../../../state/players.store';
import { MoneyPipe } from '../../../shared/pipes/money.pipe';

interface LeaderboardRow {
  player: Player;
  games: number;
  biggestWin: number;
}

@Component({
  selector: 'app-leaderboard-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MoneyPipe],
  templateUrl: './leaderboard-page.html',
  styleUrl: './leaderboard-page.scss',
})
export class LeaderboardPage {
  private readonly players = inject(PlayersStore);
  private readonly db = inject(PLINKO_STORE);

  readonly rows = signal<LeaderboardRow[]>([]);
  readonly activeId = this.players.activePlayerId;

  constructor() {
    afterNextRender(() => void this.load());
  }

  private async load(): Promise<void> {
    const rows = await Promise.all(
      this.players.players().map(async (player) => {
        const results = await this.db.getResults(player.id);
        const biggestWin = results.reduce((max, r) => Math.max(max, r.win), 0);
        return { player, games: results.length, biggestWin };
      }),
    );
    rows.sort((a, b) => b.player.balance - a.player.balance);
    this.rows.set(rows);
  }
}
